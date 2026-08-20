from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db
import fertilizer_engine
import uuid
import time

router = APIRouter(prefix="/api/users", tags=["users"])

# A farmer's account has one primary field (the legacy `soil_data` object,
# untouched for backward compatibility) plus any number of additional
# fields in `fields[]` — each fully independent: its own crop, planting
# method, soil test, and fertilizer history/plan.
PLANTING_METHODS = [
    "Broadcasting", "Line Sowing / Drilling", "Transplanting",
    "Direct Seeding", "Drip / Fertigation", "SRI (System of Rice Intensification)",
]


def _needs_diagnostics(source: dict) -> bool:
    return source.get("ph") is not None and source.get("nitrogen") is not None and "overall_health_score" not in source


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return full user profile including all onboarding fields.

    Also backfills soil diagnostics (organic matter, CEC, health score, ...)
    for any field that has a soil test but predates the fix that computes
    them at save time — otherwise those fields keep showing the Soil
    Health page's placeholder defaults forever instead of real numbers.
    """
    db = get_db()
    soil_data = current_user.get("soil_data") or {}
    fields = current_user.get("fields") or []
    patch = {}

    if _needs_diagnostics(soil_data):
        diagnostics = fertilizer_engine.compute_soil_diagnostics(
            soil_data["ph"], soil_data["nitrogen"], soil_data.get("phosphorus"), soil_data.get("potassium"), soil_data.get("soilType"),
        )
        soil_data = {**soil_data, **diagnostics}
        for key, value in diagnostics.items():
            patch[f"soil_data.{key}"] = value

    fields_changed = False
    backfilled_fields = []
    for f in fields:
        if _needs_diagnostics(f):
            diagnostics = fertilizer_engine.compute_soil_diagnostics(
                f["ph"], f["nitrogen"], f.get("phosphorus"), f.get("potassium"), f.get("soilType"),
            )
            f = {**f, **diagnostics}
            fields_changed = True
        backfilled_fields.append(f)
    if fields_changed:
        patch["fields"] = backfilled_fields

    if patch:
        await db["users"].update_one({"_id": current_user["_id"]}, {"$set": patch})

    return {
        "id": str(current_user["_id"]),
        "full_name": current_user.get("full_name", ""),
        "email": current_user.get("email", ""),
        "role": current_user.get("role", "farmer"),
        "gender": current_user.get("gender", ""),
        "title": current_user.get("title", ""),
        "org_name": current_user.get("org_name", ""),
        "coordinates": current_user.get("coordinates", ""),
        "focuses": current_user.get("focuses", []),
        "profile_photo": current_user.get("profile_photo", ""),
        "soil_data": soil_data,
        "fields": backfilled_fields,
        "notification_prefs": current_user.get("notification_prefs", {
            "satellite_alerts": True,
            "biweekly_reports": True,
        }),
    }


class SoilDataUpdate(BaseModel):
    ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    cropType: Optional[str] = None
    soilType: Optional[str] = None
    fieldSize: Optional[float] = None
    fieldSizeUnit: Optional[str] = None   # 'acres' | 'hectares'
    growthStage: Optional[str] = None     # 'sowing' | 'vegetative' | 'flowering' | 'maturity'
    currentFertilizer: Optional[str] = None  # what the farmer says they're already applying, if anything
    pastFertilizer: Optional[str] = None     # what they used previously, before the current one
    plantingMethod: Optional[str] = None     # e.g. 'Transplanting', 'Broadcasting'


@router.put("/soil-data")
async def update_soil_data(
    payload: SoilDataUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Persist updated soil metrics to the user's profile and invalidate
    cached AI insights so they are regenerated fresh on next load.
    """
    db = get_db()

    soil_patch = {}
    if payload.ph is not None:        soil_patch["soil_data.ph"]         = payload.ph
    if payload.nitrogen is not None:  soil_patch["soil_data.nitrogen"]    = payload.nitrogen
    if payload.phosphorus is not None: soil_patch["soil_data.phosphorus"] = payload.phosphorus
    if payload.potassium is not None: soil_patch["soil_data.potassium"]   = payload.potassium
    if payload.cropType is not None:  soil_patch["soil_data.cropType"]    = payload.cropType
    if payload.soilType is not None:  soil_patch["soil_data.soilType"]    = payload.soilType
    if payload.fieldSize is not None: soil_patch["soil_data.fieldSize"]   = payload.fieldSize
    if payload.fieldSizeUnit is not None: soil_patch["soil_data.fieldSizeUnit"] = payload.fieldSizeUnit
    if payload.growthStage is not None:   soil_patch["soil_data.growthStage"]   = payload.growthStage
    if payload.currentFertilizer is not None: soil_patch["soil_data.currentFertilizer"] = payload.currentFertilizer
    if payload.pastFertilizer is not None: soil_patch["soil_data.pastFertilizer"] = payload.pastFertilizer
    if payload.plantingMethod is not None: soil_patch["soil_data.plantingMethod"] = payload.plantingMethod

    # Whenever a fresh soil chemistry reading comes in, recompute the derived
    # diagnostics (organic matter, CEC, lime requirement, salinity risk, ...)
    # so the Soil Health page's numbers stay honest instead of going stale.
    if payload.ph is not None and payload.nitrogen is not None:
        diagnostics = fertilizer_engine.compute_soil_diagnostics(
            payload.ph, payload.nitrogen, payload.phosphorus, payload.potassium, payload.soilType,
        )
        for key, value in diagnostics.items():
            soil_patch[f"soil_data.{key}"] = value

    # Invalidate AI caches so dashboard & fertilizer hub regenerate
    unset_fields = {
        "cached_insights": "",
        "cached_insights_key": "",
        "cached_soil_report": "",
        "cached_soil_report_lang": "",
        "cached_soil_report_field_id": "",
        "cached_soil_report_ph": "",
        "cached_soil_report_n": "",
    }

    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": soil_patch, "$unset": unset_fields},
    )

    # Return the freshly merged profile
    updated = await db["users"].find_one({"_id": current_user["_id"]})
    return {
        "status": "saved",
        "soil_data": updated.get("soil_data", {}),
    }


# ── Additional Fields (multi-crop farms) ─────────────────────────────────────
# The primary field stays in soil_data, untouched, for backward compatibility.
# Everything beyond one crop lives here, each field fully independent.

class FieldPayload(BaseModel):
    cropType: str
    plantingMethod: Optional[str] = None
    soilType: Optional[str] = None
    fieldSize: Optional[float] = None
    fieldSizeUnit: Optional[str] = "acres"
    growthStage: Optional[str] = None
    ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    currentFertilizer: Optional[str] = None
    pastFertilizer: Optional[str] = None


class FieldUpdatePayload(BaseModel):
    cropType: Optional[str] = None
    plantingMethod: Optional[str] = None
    soilType: Optional[str] = None
    fieldSize: Optional[float] = None
    fieldSizeUnit: Optional[str] = None
    growthStage: Optional[str] = None
    ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    currentFertilizer: Optional[str] = None
    pastFertilizer: Optional[str] = None


@router.post("/fields")
async def add_field(payload: FieldPayload, current_user: dict = Depends(get_current_user)):
    """Add another crop/field to the farmer's account — a fully independent
    field with its own soil test and fertilizer plan, not tied to the
    primary field in soil_data."""
    db = get_db()
    field = payload.model_dump()
    field["id"] = uuid.uuid4().hex
    field["created_at"] = time.time()

    # Compute the same derived diagnostics (organic matter, CEC, lime
    # requirement, salinity risk, ...) the primary field gets, so a new
    # field's Soil Health numbers are real from the moment it's created,
    # not just after its first edit.
    if field.get("ph") is not None and field.get("nitrogen") is not None:
        diagnostics = fertilizer_engine.compute_soil_diagnostics(
            field["ph"], field["nitrogen"], field.get("phosphorus"), field.get("potassium"), field.get("soilType"),
        )
        field.update(diagnostics)

    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {
            "$push": {"fields": field},
            "$unset": {
                "cached_soil_report": "", "cached_soil_report_lang": "",
                "cached_soil_report_field_id": "", "cached_soil_report_ph": "", "cached_soil_report_n": "",
            },
        },
    )
    updated = await db["users"].find_one({"_id": current_user["_id"]})
    return {"status": "saved", "fields": updated.get("fields", [])}


@router.put("/fields/{field_id}")
async def update_field(field_id: str, payload: FieldUpdatePayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    fields = current_user.get("fields", [])
    if not any(f.get("id") == field_id for f in fields):
        raise HTTPException(status_code=404, detail="Field not found")

    patch = {f"fields.$[elem].{k}": v for k, v in payload.model_dump(exclude_unset=True).items()}
    if not patch:
        return {"status": "no_changes"}

    # Recompute diagnostics for this field the same way the primary field does
    if payload.ph is not None and payload.nitrogen is not None:
        diagnostics = fertilizer_engine.compute_soil_diagnostics(
            payload.ph, payload.nitrogen, payload.phosphorus, payload.potassium, payload.soilType,
        )
        for key, value in diagnostics.items():
            patch[f"fields.$[elem].{key}"] = value

    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {
            "$set": patch,
            "$unset": {
                "cached_soil_report": "", "cached_soil_report_lang": "",
                "cached_soil_report_field_id": "", "cached_soil_report_ph": "", "cached_soil_report_n": "",
            },
        },
        array_filters=[{"elem.id": field_id}],
    )
    updated = await db["users"].find_one({"_id": current_user["_id"]})
    return {"status": "saved", "fields": updated.get("fields", [])}


@router.delete("/fields/{field_id}")
async def delete_field(field_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"fields": {"id": field_id}}},
    )
    updated = await db["users"].find_one({"_id": current_user["_id"]})
    return {"status": "deleted", "fields": updated.get("fields", [])}


class FullProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    org_name: Optional[str] = None
    coordinates: Optional[dict] = None
    title: Optional[str] = None
    focuses: Optional[list] = None
    soil_data: Optional[dict] = None
    profile_photo: Optional[str] = None
    notification_prefs: Optional[dict] = None

@router.put("/me")
async def update_profile(
    payload: FullProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update full user profile."""
    db = get_db()
    patch = payload.model_dump(exclude_unset=True)

    if not patch:
        return {"status": "no_changes"}

    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": patch}
    )

    return {"status": "saved"}


from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db
import fertilizer_engine

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return full user profile including all onboarding fields."""
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
        "soil_data": current_user.get("soil_data", {}),
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

from fastapi import UploadFile, File
import random
import asyncio

@router.post("/soil-data/upload")
async def extract_soil_data_from_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Simulates extracting soil data from an uploaded Lab Report PDF or Image using AI/OCR.
    """
    # 1. Simulate OCR & AI Processing Delay
    await asyncio.sleep(2.5)
    
    # 2. Extract (Mock) realistic values ensuring they match required types
    mock_extraction = {
        "nitrogen": round(random.uniform(30.0, 80.0), 1),
        "phosphorus": round(random.uniform(15.0, 45.0), 1),
        "potassium": round(random.uniform(20.0, 50.0), 1),
        "ph": round(random.uniform(5.5, 7.5), 1),
        "cropType": random.choice(["Wheat", "Corn", "Rice", "Soybeans", "Lentils"]),
        "soilType": random.choice(["Clay", "Loam", "Sandy", "Silt"])
    }
    
    db = get_db()
    
    # Prefix keys for MongoDB nested update
    soil_patch = {f"soil_data.{k}": v for k, v in mock_extraction.items()}
    
    # Invalidate AI caches so dashboard & fertilizer hub regenerate
    unset_fields = {
        "cached_insights": "",
        "cached_insights_key": "",
        "cached_soil_report": "",
    }
    
    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": soil_patch, "$unset": unset_fields},
    )
    
    updated = await db["users"].find_one({"_id": current_user["_id"]})
    
    return {
        "status": "success",
        "soil_data": updated.get("soil_data", {})
    }


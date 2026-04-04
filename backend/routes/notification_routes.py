"""
notification_routes.py — Terroir real-time notification endpoints
POST /api/notifications/satellite-alert  → Send spike warning email
POST /api/notifications/biweekly-report  → Send biweekly AI report email
POST /api/notifications/test             → Send a test email (dev only)
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from database import get_db
from email_service import send_satellite_spike_alert, send_biweekly_ai_report

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _get_location_label(user: dict) -> str:
    coords = user.get("coordinates", {})
    if isinstance(coords, dict):
        return coords.get("label") or f"{coords.get('lat', '?')}° N, {coords.get('lng', '?')}° E"
    return str(coords) if coords else "Unknown location"


class SpikeAlertPayload(BaseModel):
    ndvi: float
    ndwi: float
    anomaly: str


class BiweeklyReportPayload(BaseModel):
    report_text: Optional[str] = None  # If None, uses cached report


@router.post("/satellite-alert")
async def satellite_alert(
    payload: SpikeAlertPayload,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Check if user has satellite_alerts enabled, then send a spike warning email.
    Called by the engine when NDVI/NDWI crosses anomaly thresholds.
    """
    prefs = user.get("notification_prefs", {})
    if not prefs.get("satellite_alerts", True):
        return {"status": "skipped", "reason": "User has satellite alerts disabled"}

    email = user.get("email", "")
    name = user.get("full_name", "Farmer")
    location = _get_location_label(user)

    background_tasks.add_task(
        send_satellite_spike_alert,
        to_email=email,
        user_name=name,
        location=location,
        ndvi=payload.ndvi,
        ndwi=payload.ndwi,
        anomaly=payload.anomaly
    )

    return {"status": "queued", "message": f"Alert email queued for {email}"}


@router.post("/biweekly-report")
async def biweekly_report(
    payload: BiweeklyReportPayload,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Send biweekly AI report email. Uses cached soil report or provided text.
    """
    prefs = user.get("notification_prefs", {})
    if not prefs.get("biweekly_reports", True):
        return {"status": "skipped", "reason": "User has biweekly reports disabled"}

    email = user.get("email", "")
    name = user.get("full_name", "Farmer")
    location = _get_location_label(user)
    soil_data = user.get("soil_data", {})
    report_text = payload.report_text or user.get("cached_soil_report", "No AI analysis available yet. Visit your dashboard to generate one.")

    background_tasks.add_task(
        send_biweekly_ai_report,
        to_email=email,
        user_name=name,
        location=location,
        report_text=report_text,
        soil_data=soil_data,
    )

    return {"status": "queued", "message": f"Biweekly report queued for {email}"}


@router.post("/test")
async def send_test_email(
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Send a test satellite alert email to verify SMTP configuration."""
    email = user.get("email", "")
    name = user.get("full_name", "Farmer")
    location = _get_location_label(user)

    background_tasks.add_task(
        send_satellite_spike_alert,
        to_email=email,
        user_name=name,
        location=location,
        ndvi=0.18,
        ndwi=0.05,
        anomaly="Critically low vegetation index — possible crop failure risk detected in north-west quadrant."
    )

    return {"status": "queued", "message": f"Test alert email queued for {email}"}


@router.put("/prefs")
async def update_notification_prefs(
    prefs: dict,
    user: dict = Depends(get_current_user),
):
    """Save user notification preferences to MongoDB."""
    db = get_db()
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"notification_prefs": prefs}}
    )
    return {"status": "saved"}

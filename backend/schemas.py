from pydantic import BaseModel, EmailStr
from typing import Optional, Union


# ── Request Schemas ──────────────────────────────────────────────────────────

class CoordinatesObject(BaseModel):
    lat: float
    lng: float
    label: Optional[str] = None

class UserRegister(BaseModel):
    full_name: str
    email: Optional[str] = None      # optional — farmer may only have a phone
    phone: Optional[str] = None      # e.g. "+91 9876543210"
    password: str
    role: str = "farmer"
    gender: Optional[str] = None
    title: Optional[str] = None
    org_name: Optional[str] = None
    coordinates: Optional[Union[CoordinatesObject, str]] = None
    focuses: Optional[list[str]] = None
    profile_photo: Optional[str] = None
    soil_data: Optional[dict] = None


class UserLogin(BaseModel):
    email: Optional[str] = None      # provide email OR phone (not both required)
    phone: Optional[str] = None
    password: str


# ── Response Schemas ─────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "farmer"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


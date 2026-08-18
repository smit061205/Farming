from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
import re

from database import get_db
from schemas import UserRegister, UserLogin, TokenResponse, UserOut
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def normalize_phone(phone: str) -> str:
    """Strip spaces/dashes/parens; ensure it starts with + for international."""
    digits = re.sub(r"[\s\-\(\)]", "", phone)
    if not digits.startswith("+"):
        # Assume Indian number if 10 digits
        if len(digits) == 10:
            digits = "+91" + digits
    return digits


def serialize_user(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user.get("email"),
        phone=user.get("phone"),
        role=user.get("role", "farmer"),
    )


@router.get("/check-email")
async def check_email(email: str = Query(...)):
    """Check if an email already exists in the database."""
    db = get_db()
    existing = await db["users"].find_one({"email": email})
    return {"exists": existing is not None}

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister):
    db = get_db()

    # Must supply at least one identifier
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Provide an email address or phone number to register.")

    # Normalize phone
    phone = normalize_phone(body.phone) if body.phone else None

    # Check duplicate email
    if body.email:
        existing = await db["users"].find_one({"email": body.email})
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.")

    # Check duplicate phone
    if phone:
        existing = await db["users"].find_one({"phone": phone})
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that phone number already exists.")

    # Serialize coordinates — may be a Pydantic model or plain string
    coords = body.coordinates
    if hasattr(coords, 'model_dump'):
        coords = coords.model_dump()

    # Insert new user
    user_doc = {
        "full_name": body.full_name,
        "email": body.email,
        "phone": phone,
        "hashed_password": hash_password(body.password),
        "role": body.role,
        "gender": body.gender,
        "title": body.title,
        "org_name": body.org_name,
        "coordinates": coords,
        "focuses": body.focuses if body.focuses else [],
        "profile_photo": body.profile_photo,
        "soil_data": body.soil_data if body.soil_data else {},
    }
    result = await db["users"].insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id)})
    return TokenResponse(access_token=token, user=serialize_user(user_doc))

@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db = get_db()

    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Provide an email address or phone number to log in.")

    # Look up by email or phone
    if body.email:
        user = await db["users"].find_one({"email": body.email})
    else:
        phone = normalize_phone(body.phone)
        user = await db["users"].find_one({"phone": phone})

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials. Please check your email/phone and password.",
        )

    token = create_access_token({"sub": str(user["_id"])})
    return TokenResponse(access_token=token, user=serialize_user(user))


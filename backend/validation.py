"""Validation rules for values submitted by the field wizard."""
from datetime import date

from data import get_crop, get_organic


LIMITS = {
    "areaHa": (0.01, 10_000),
    "ph": (0, 14),
    "oc": (0, 5),
    "n": (0, 2_000),
    "p": (0, 500),
    "k": (0, 2_000),
    "ec": (0, 20),
    "s": (0, 200),
    "zn": (0, 50),
    "targetYield": (0.01, 1_000),
    "organicTonnes": (0, 100),
    "budget": (0, 100_000_000),
    "lat": (-90, 90),
    "lon": (-180, 180),
}

ALLOWED_METHODS = {"broadcast", "incorporated", "banded", "fertigation"}
ALLOWED_IRRIGATION = {"rainfed", "canal", "drip", "sprinkler", "flood"}
ALLOWED_LANGS = {"en", "hi", "gu"}


def _as_number(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _check_number(errors, name, value, required=False, limit_key=None):
    if value is None or value == "":
        if required:
            errors[name] = "This value is required."
        return
    number = _as_number(value)
    if number is None:
        errors[name] = "Enter a number."
        return
    lo, hi = LIMITS[limit_key or name]
    if number < lo or number > hi:
        errors[name] = f"Use a value from {lo:g} to {hi:g}."


def validate_wizard_payload(body: dict) -> dict:
    """Return field errors; an empty dict means the wizard payload is valid."""
    body = body or {}
    errors = {}
    soil = body.get("soil") or {}

    crop_id = body.get("cropId")
    crop = None
    if not crop_id:
        errors["cropId"] = "Choose a crop."
    else:
        crop = get_crop(crop_id)
    if crop_id and not crop:
        errors["cropId"] = "Choose a crop from the catalog."

    _check_number(errors, "areaHa", body.get("areaHa"), required=True)
    for key in ("ph", "n", "p", "k"):
        _check_number(errors, f"soil.{key}", soil.get(key), required=True, limit_key=key)
    for key in ("oc", "ec", "s", "zn"):
        _check_number(errors, f"soil.{key}", soil.get(key), limit_key=key)

    if body.get("targetYield") not in (None, ""):
        _check_number(errors, "targetYield", body.get("targetYield"))
        if crop and body.get("zone") and (crop.get("tier") or {}).get(body.get("zone")) == "A":
            target = _as_number(body.get("targetYield"))
            low, high = crop["target"]["min"], crop["target"]["max"]
            if target is not None and not low <= target <= high:
                errors["targetYield"] = f"Use this crop's target range: {low:g} to {high:g} quintal/ha."

    organic = body.get("organic")
    if organic:
        if not organic.get("id") or not get_organic(organic.get("id")):
            errors["organic.id"] = "Choose an organic input from the list."
        _check_number(errors, "organicTonnes", organic.get("tonnesPerHa"), required=True)

    if body.get("budget") not in (None, ""):
        _check_number(errors, "budget", body.get("budget"))

    lat, lon = body.get("lat"), body.get("lon")
    if (lat in (None, "")) != (lon in (None, "")):
        errors["location"] = "Latitude and longitude must be provided together."
    else:
        if lat not in (None, ""):
            _check_number(errors, "lat", lat)
            _check_number(errors, "lon", lon)

    method = body.get("method") or "broadcast"
    if method not in ALLOWED_METHODS:
        errors["method"] = "Choose a valid application method."
    irrigation = body.get("irrigation") or "canal"
    if irrigation not in ALLOWED_IRRIGATION:
        errors["irrigation"] = "Choose a valid irrigation method."
    lang = body.get("lang") or "en"
    if lang not in ALLOWED_LANGS:
        errors["lang"] = "Choose a supported language."

    sowing_date = body.get("sowingDate")
    if sowing_date:
        try:
            date.fromisoformat(str(sowing_date))
        except ValueError:
            errors["sowingDate"] = "Use a valid sowing date."

    place = body.get("place")
    if place is not None and len(str(place)) > 200:
        errors["place"] = "Location name is too long."

    return errors

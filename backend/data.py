"""Single place that loads the versioned JSON knowledge base.

Ported from the reference Node server's lib/data.js — same three JSON files,
loaded once at import time.
"""
import json
from pathlib import Path

_DATA_DIR = Path(__file__).parent / "data"


def _read(name: str) -> dict:
    with open(_DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


crops_data = _read("crops.json")
products_data = _read("products.json")
thresholds = _read("thresholds.json")

crops = crops_data["crops"]
split_patterns = crops_data["splitPatterns"]
slopes = crops_data["_slopes"]
products = products_data["products"]
organics = products_data["organics"]
amendments = products_data["amendments"]
zones = thresholds["zones"]


def get_crop(crop_id):
    return next((c for c in crops if c["id"] == crop_id), None)


def get_product(product_id):
    return next((p for p in products if p["id"] == product_id), None)


def get_organic(organic_id):
    return next((o for o in organics if o["id"] == organic_id), None)


def get_zone(zone_id):
    return next((z for z in zones if z["id"] == zone_id), None)

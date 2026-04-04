import os
import httpx
from fastapi import APIRouter
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/library", tags=["library"])

PERENUAL_API_KEY = os.getenv("PERENUAL_API_KEY")

MOCK_PLANTS = [
    {
        "id": 101,
        "common_name": "Cabernet Sauvignon Grape",
        "scientific_name": ["Vitis vinifera 'Cabernet Sauvignon'"],
        "cycle": "Perennial",
        "watering": "Minimum",
        "sunlight": ["full sun"],
        "default_image": {
            "regular_url": "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80"
        }
    },
    {
        "id": 102,
        "common_name": "White Clover",
        "scientific_name": ["Trifolium repens"],
        "cycle": "Perennial",
        "watering": "Average",
        "sunlight": ["full sun", "part shade"],
        "default_image": {
            "regular_url": "https://images.unsplash.com/photo-1620310214818-8f8319ab4bc3?w=800&q=80"
        }
    },
    {
        "id": 103,
        "common_name": "Winter Rye (Cover Crop)",
        "scientific_name": ["Secale cereale"],
        "cycle": "Annual",
        "watering": "Average",
        "sunlight": ["full sun"],
        "default_image": {
            "regular_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"
        }
    },
    {
        "id": 104,
        "common_name": "Lavender",
        "scientific_name": ["Lavandula angustifolia"],
        "cycle": "Perennial",
        "watering": "Minimum",
        "sunlight": ["full sun"],
        "default_image": {
            "regular_url": "https://images.unsplash.com/photo-1498019559366-a1cbd07b5160?w=800&q=80"
        }
    }
]

@router.get("/search-plants")
async def search_plants(q: str = ""):
    """
    Search the Perenual API for plant species.
    Gracefully degrades to local mock database if PERENUAL_API_KEY is missing.
    """
    if not PERENUAL_API_KEY:
        # Filter mock data if query exists, else return all four
        results = MOCK_PLANTS
        if q:
            results = [p for p in MOCK_PLANTS if q.lower() in p["common_name"].lower()]
        return {"data": results, "status": "mock"}

    # Proceed with live Perenual Search
    url = f"https://perenual.com/api/species-list?key={PERENUAL_API_KEY}&q={q}"
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=2.0)
            if resp.status_code == 200:
                data = resp.json()
                # Ensure we have imagery because visual libraries demand it
                # Fallback to mock images if none are provided because a blank card is ugly
                clean_data = []
                for plant in data.get('data', [])[:12]: # limit to 12
                    clean_data.append({
                        "id": plant.get('id'),
                        "common_name": plant.get('common_name', 'Unknown Species'),
                        "scientific_name": plant.get('scientific_name', []),
                        "cycle": plant.get('cycle', 'Unknown'),
                        "watering": plant.get('watering', 'Unknown'),
                        "sunlight": plant.get('sunlight', []),
                        "default_image": plant.get('default_image') or {"regular_url": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80"}
                    })

                return {"data": clean_data, "status": "live"}
            else:
                return {"data": MOCK_PLANTS, "status": f"error_fallback_{resp.status_code}"}
        except Exception as e:
            print("Perenual API Error:", e)
            return {"data": MOCK_PLANTS, "status": "error_fallback"}


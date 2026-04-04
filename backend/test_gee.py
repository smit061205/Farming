import ee
import os
import json

gee_json_str = os.getenv("GEE_CREDENTIALS_JSON", "")
if not gee_json_str:
    with open('gee_credentials.json', 'r') as f:
        gee_json_str = f.read()
key_data = json.loads(gee_json_str)
credentials = ee.ServiceAccountCredentials(key_data.get('client_email', ''), 'gee_credentials.json')
ee.Initialize(credentials)

point = ee.Geometry.Point(72.44, 23.16)
roi = point.buffer(200)

collection = (ee.ImageCollection('COPERNICUS/S2')
              .filterBounds(roi)
              .filterDate('2025-01-01', '2026-12-31')
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
              .sort('system:time_start', False))

image = collection.first()
map_id = image.getMapId({'bands': ['B4', 'B3', 'B2'], 'min': 0, 'max': 3000, 'gamma': 1.2})
print("Single image:", map_id['tile_fetcher'].url_format)

# Try mosaic
image_mosaic = collection.mosaic()
map_id_mosaic = image_mosaic.getMapId({'bands': ['B4', 'B3', 'B2'], 'min': 0, 'max': 3000, 'gamma': 1.2})
print("Mosaic:", map_id_mosaic['tile_fetcher'].url_format)

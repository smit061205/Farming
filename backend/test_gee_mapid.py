import ee
import json
with open('gee_credentials.json', 'r') as f:
    key_data = json.load(f)
credentials = ee.ServiceAccountCredentials(key_data['client_email'], 'gee_credentials.json')
ee.Initialize(credentials)
img = ee.Image(1)
map_id = img.getMapId({'min': 0, 'max': 1, 'palette': ['red', 'green']})
print(map_id)
try:
    print("URL:", map_id['tile_fetcher'].url_format)
except Exception as e:
    print("Error:", e)

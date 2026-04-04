import ee
import os
import json
import tempfile

GEE_CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), 'gee_credentials.json')
ee_initialized = False

def initialize_gee() -> bool:
    """
    Initializes the Google Earth Engine API.
    Supports two modes:
      1. GEE_CREDENTIALS_JSON env var (production/Render) — full JSON string
      2. Local gee_credentials.json file (development)
    """
    global ee_initialized
    if ee_initialized:
        return True

    # --- Mode 1: env var (production) ---
    gee_json_str = os.getenv("GEE_CREDENTIALS_JSON", "")
    if gee_json_str:
        try:
            print("🌍 Initializing Google Earth Engine from env var...")
            key_data = json.loads(gee_json_str)
            # Write to a temp file because ee SDK requires a file path
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp:
                json.dump(key_data, tmp)
                tmp_path = tmp.name
            client_email = key_data.get('client_email', '')
            credentials = ee.ServiceAccountCredentials(client_email, tmp_path)
            ee.Initialize(credentials)
            os.unlink(tmp_path)  # clean up temp file
            ee_initialized = True
            print("✅ Earth Engine API initialized successfully.")
            return True
        except Exception as e:
            print("❌ Failed to initialize Earth Engine from env var:", str(e))
            return False

    # --- Mode 2: local file (development) ---
    if not os.path.exists(GEE_CREDENTIALS_PATH):
        print(f"⚠️ Earth Engine: Credentials not found at {GEE_CREDENTIALS_PATH}")
        print("   Set GEE_CREDENTIALS_JSON env var to enable GEE in production.")
        return False

    try:
        print("🌍 Initializing Google Earth Engine from local file...")
        with open(GEE_CREDENTIALS_PATH, 'r') as f:
            key_data = json.load(f)
        client_email = key_data.get('client_email', '')
        credentials = ee.ServiceAccountCredentials(client_email, GEE_CREDENTIALS_PATH)
        ee.Initialize(credentials)
        ee_initialized = True
        print("✅ Earth Engine API initialized successfully.")
        return True
    except Exception as e:
        print("❌ Failed to initialize Earth Engine:", str(e))
        return False

import ee
import os

GEE_CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), 'gee_credentials.json')
ee_initialized = False

def initialize_gee() -> bool:
    """
    Initializes the Google Earth Engine API using the service account credentials.
    Returns True if successful, False if credentials are missing or invalid.
    """
    global ee_initialized
    if ee_initialized:
        return True
        
    try:
        if not os.path.exists(GEE_CREDENTIALS_PATH):
            print(f"⚠️ Earth Engine: Credentials not found at {GEE_CREDENTIALS_PATH}")
            return False
            
        print("🌍 Initializing Google Earth Engine...")
        
        # Read the service account email from the JSON file if needed, 
        # but ee.ServiceAccountCredentials can auto-discover it if the first arg is empty
        # when using a standard GCP JSON key, or we fallback to modern auth.
        import json
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

import requests
import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(dotenv_path=dotenv_path)

RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
MMSI = "249373000" # Sample MMSI from user request

def test_ais_api():
    base_url = "https://ais-vessel-finder.p.rapidapi.com"
    endpoints = ["/vessels", "/vessel", "/search", "/v1/vessels", "/get-vessel"]
    
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "ais-vessel-finder.p.rapidapi.com",
        "11497305": "11497305"
    }

    for ep in endpoints:
        print(f"\n--- Testing Endpoint: {ep} ---")
        url = f"{base_url}{ep}"
        
        # Try search by mmsi (249373000 from user example)
        try:
            response = requests.get(url, headers=headers, params={"mmsi": "249373000"}, timeout=10)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print("SUCCESS!")
                import json
                print(json.dumps(response.json(), indent=2))
                break
            else:
                print(f"Failed: {response.text[:100]}")
        except Exception as e:
            print(f"Request error: {e}")

if __name__ == "__main__":
    test_ais_api()

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def check_latest_log():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get the latest entry
    response = supabase.table('tracking_logs').select('*').order('last_sync', desc=True).limit(1).execute()
    
    if response.data:
        print("Latest entry in tracking_logs:")
        print(json.dumps(response.data[0], indent=2))
    else:
        print("No records found in tracking_logs")

if __name__ == "__main__":
    check_latest_log()

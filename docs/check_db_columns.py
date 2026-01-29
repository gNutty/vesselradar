import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def check_columns():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Try to fetch one row to see columns
    response = supabase.table('tracking_logs').select('*').limit(1).execute()
    
    if response.data:
        print("Columns found in tracking_logs:")
        print(response.data[0].keys())
    else:
        # If no data, try to look at one from shipment_id?
        print("No data in tracking_logs yet.")
        # Alternatively, we can try to insert a dummy row or check via RPC if available
        # But let's just check shipments table too
        ship_resp = supabase.table('shipments').select('*').limit(1).execute()
        if ship_resp.data:
            print("Columns in shipments:")
            print(ship_resp.data[0].keys())

if __name__ == "__main__":
    check_columns()

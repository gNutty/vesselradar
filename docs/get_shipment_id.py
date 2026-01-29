import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def get_shipment():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get one shipment
    response = supabase.table('shipments').select('id, mmsi, booking_no').limit(1).execute()
    
    if response.data:
        print(f"ID: {response.data[0]['id']}")
        print(f"MMSI: {response.data[0]['mmsi']}")
        print(f"Booking: {response.data[0]['booking_no']}")
    else:
        print("No shipments found")

if __name__ == "__main__":
    get_shipment()

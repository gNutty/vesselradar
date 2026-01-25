import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch latest shipments
result = supabase.table('shipments').select('booking_no, shipper_name, consignee_name, agent_company, etd_at_pol, carrier_name, port_of_loading, origin, place_of_receipt, final_destination').order('created_at', desc=True).limit(5).execute()

output = []
for row in result.data:
    output.append(f"Booking: {row['booking_no']}")
    output.append(f"  Shipper:   {row.get('shipper_name')}")
    output.append(f"  Consignee: {row.get('consignee_name')}")
    output.append(f"  Agent:     {row.get('agent_company')}")
    output.append(f"  ETD:       {row.get('etd_at_pol')}")
    output.append(f"  Carrier:   {row.get('carrier_name')}")
    output.append(f"  POL:       {row.get('port_of_loading')}")
    output.append(f"  Origin:    {row.get('origin')}")
    output.append(f"  POR:       {row.get('place_of_receipt')}")
    output.append(f"  Final Dest:{row.get('final_destination')}")
    output.append("-" * 40)

# Write to file
with open('docs/db_verification.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print(f"Verified {len(result.data)} shipments. Results saved to docs/db_verification.txt")

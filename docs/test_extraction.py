"""Test extraction of new fields"""
import sys
sys.path.insert(0, 'docs')
from extract_bookings import extract_hmm_booking, extract_msc_booking, extract_evergreen_booking

# Load sample texts
hmm = open('docs/temp_pdf_hmm.txt', 'r', encoding='utf-8').read()
msc = open('docs/temp_pdf_msc.txt', 'r', encoding='utf-8').read()
eg = open('docs/temp_pdf_text.txt', 'r', encoding='utf-8').read()

results = []

def add_result(name, data):
    results.append(f'\n=== {name} ===')
    results.append(f"Shipper: {data.get('shipper_name')}")
    results.append(f"Consignee: {data.get('consignee_name')}")
    results.append(f"Agent: {data.get('agent_company')}")
    results.append(f"ETD: {data.get('etd_at_pol')}")
    results.append(f"Carrier: {data.get('carrier_name')}")
    results.append(f"POL: {data.get('port_of_loading')}")
    results.append(f"POR: {data.get('place_of_receipt')}")
    results.append(f"Origin: {data.get('origin')}")
    results.append(f"Final Dest: {data.get('final_destination')}")

add_result('HMM', extract_hmm_booking(hmm))
add_result('MSC', extract_msc_booking(msc))
add_result('Evergreen', extract_evergreen_booking(eg))

# Write to file
output = '\n'.join(results)
open('docs/test_results.txt', 'w', encoding='utf-8').write(output)
print("Results saved to docs/test_results.txt")



import os
import sys

# Add the parent directory of docs to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from docs.extract_bookings import extract_booking_data

def test_oocl_extraction():
    pdf_path = "d:/Project/vesselradar/2319547720.pdf"
    print(f"Testing OOCL extraction for: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        print(f"Error: File not found at {pdf_path}")
        return

    data = extract_booking_data(pdf_path)
    
    if data:
        print("\nExtracted Data:")
        for key, value in data.items():
            print(f"  {key:20}: {value}")
        
        # Validation checks
        expected_booking = "2319547720"
        if data.get('booking_no') == expected_booking:
            print(f"\n[PASS] Booking No matches: {expected_booking}")
        else:
            print(f"\n[FAIL] Booking No mismatch: Expected {expected_booking}, got {data.get('booking_no')}")
            
        if data.get('main_vessel_name') == "YM CAPACITY":
            print("[PASS] Vessel Name matches: YM CAPACITY")
        else:
            print(f"[FAIL] Vessel Name mismatch: Got {data.get('main_vessel_name')}")

        if data.get('voyage_no') == "064N":
            print("[PASS] Voyage No matches: 064N")
        else:
            print(f"[FAIL] Voyage No mismatch: Got {data.get('voyage_no')}")

        if data.get('carrier_scac') == "OOLU":
            print("[PASS] Carrier SCAC matches: OOLU")
        else:
            print(f"[FAIL] Carrier SCAC mismatch: Got {data.get('carrier_scac')}")
            
        if data.get('eta_at_pod') == "2026-02-14":
            print("[PASS] ETA matches: 2026-02-14")
        else:
            print(f"[FAIL] ETA mismatch: Got {data.get('eta_at_pod')}")
            
        if data.get('etd_at_pol') == "2026-01-30":
            print("[PASS] ETD matches: 2026-01-30")
        else:
            print(f"[FAIL] ETD mismatch: Got {data.get('etd_at_pol')}")
    else:
        print("\n[FAIL] Failed to extract data")

if __name__ == "__main__":
    test_oocl_extraction()

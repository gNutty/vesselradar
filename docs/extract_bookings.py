"""
PDF Booking Data Extraction Script
Extracts booking information from PDF files and inserts into Supabase shipments table.
Includes smart MMSI lookup with caching via vessel_master table.
"""

import pdfplumber
import re
import os
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')

BOOKING_DIR = os.path.join(os.path.dirname(__file__), 'Booking')

# Hardcoded vessel data for known ships (to avoid API calls)
HARDCODED_VESSELS = {
    'HMM HOPE': {'mmsi': '440176000', 'carrier_scac': 'HDMU', 'imo': None},
    'MSC OSCAR': {'mmsi': '355906000', 'carrier_scac': 'MSCU', 'imo': '9703291'},
    'EVER WEB': {'mmsi': '563237400', 'carrier_scac': 'EGLV', 'imo': None},
}

# Ship types to filter for cargo vessels
CARGO_SHIP_TYPES = ['Cargo', 'Container Ship', 'Cargo - Hazard A (Major)', 'Cargo - Hazard B']


def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def get_vessel_mmsi(vessel_name: str, supabase: Client = None) -> dict:
    """
    Get MMSI for a vessel by name using smart search logic:
    1. Check hardcoded references
    2. Check vessel_master cache table
    3. Call VesselFinder1 /search API
    4. Filter for Cargo/Container Ship types
    5. Save to vessel_master cache
    
    Args:
        vessel_name: The name of the vessel to search for
        supabase: Supabase client instance (optional, will create if not provided)
        
    Returns:
        dict with keys: mmsi, imo, ship_type, carrier_scac, from_cache
    """
    normalized_name = vessel_name.strip().upper()
    
    # Step 0: Check hardcoded references first
    if normalized_name in HARDCODED_VESSELS:
        hardcoded = HARDCODED_VESSELS[normalized_name]
        print(f"[get_vessel_mmsi] Found hardcoded MMSI for {normalized_name}: {hardcoded['mmsi']}")
        return {
            'mmsi': hardcoded['mmsi'],
            'imo': hardcoded.get('imo'),
            'carrier_scac': hardcoded.get('carrier_scac'),
            'from_cache': True,
        }
    
    # Get or create Supabase client
    if supabase is None:
        supabase = get_supabase_client()
    
    # Step 1: Check vessel_master cache table
    if supabase:
        try:
            result = supabase.table('vessel_master').select('mmsi, imo, ship_type').eq('vessel_name', normalized_name).execute()
            if result.data and len(result.data) > 0:
                cached = result.data[0]
                print(f"[get_vessel_mmsi] Cache hit for {normalized_name}: {cached['mmsi']}")
                return {
                    'mmsi': cached['mmsi'],
                    'imo': cached.get('imo'),
                    'ship_type': cached.get('ship_type'),
                    'from_cache': True,
                }
        except Exception as e:
            print(f"[get_vessel_mmsi] Cache lookup failed: {e}")
    
    # Step 2: Call VesselFinder1 /search API with vessel name
    if not RAPIDAPI_KEY:
        print("[get_vessel_mmsi] RAPIDAPI_KEY is missing")
        return {'mmsi': None}
    
    url = "https://vesselfinder1.p.rapidapi.com/search"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "vesselfinder1.p.rapidapi.com"
    }
    params = {"name": vessel_name}
    
    try:
        print(f"[get_vessel_mmsi] Calling VesselFinder1 API for: {vessel_name}")
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        results = response.json()
        
        if not results or (isinstance(results, list) and len(results) == 0):
            print(f"[get_vessel_mmsi] No results found for: {vessel_name}")
            return {'mmsi': None}
        
        # Step 3: Filter for Cargo/Container Ship types
        vessels = results if isinstance(results, list) else [results]
        
        selected_vessel = None
        for v in vessels:
            ais_type = v.get('AIS_TYPE_SUMMARY', '')
            if ais_type and any(ship_type.lower() in ais_type.lower() for ship_type in CARGO_SHIP_TYPES):
                selected_vessel = v
                break
        
        # If no cargo vessel found, use the first result
        if not selected_vessel and len(vessels) > 0:
            selected_vessel = vessels[0]
            print(f"[get_vessel_mmsi] No cargo vessel found, using first result")
        
        if not selected_vessel or not selected_vessel.get('MMSI'):
            print(f"[get_vessel_mmsi] No valid vessel found for: {vessel_name}")
            return {'mmsi': None}
        
        mmsi = selected_vessel.get('MMSI')
        imo = selected_vessel.get('IMO')
        ship_type = selected_vessel.get('AIS_TYPE_SUMMARY')
        
        print(f"[get_vessel_mmsi] Found vessel: {selected_vessel.get('NAME')}, MMSI: {mmsi}, Type: {ship_type}")
        
        # Step 4: Save to vessel_master cache
        if supabase:
            try:
                supabase.table('vessel_master').upsert({
                    'vessel_name': normalized_name,
                    'mmsi': mmsi,
                    'imo': imo,
                    'ship_type': ship_type,
                }, on_conflict='vessel_name').execute()
                print(f"[get_vessel_mmsi] Cached MMSI for {normalized_name}")
            except Exception as e:
                print(f"[get_vessel_mmsi] Failed to cache vessel: {e}")
        
        return {
            'mmsi': mmsi,
            'imo': imo,
            'ship_type': ship_type,
            'from_cache': False,
        }
        
    except Exception as e:
        print(f"[get_vessel_mmsi] Error searching for vessel {vessel_name}: {e}")
        return {'mmsi': None}


def extract_hmm_booking(text: str) -> dict:
    """Extract data from HMM booking confirmation (BKKM format)"""
    data = {
        'carrier_scac': None,
        'booking_no': None,
        'main_vessel_name': None,
        'voyage_no': None,
        'pod_name': None,
        'eta_at_pod': None,
        'shipper_name': None,
        'consignee_name': None,
        'agent_company': None,
        'etd_at_pol': None,
        'carrier_name': None,
        'port_of_loading': None,
        'place_of_receipt': None,
        'origin': None,
        'final_destination': None,
    }
    
    # Booking No
    match = re.search(r'Booking No\.\s*(\S+)', text)
    if match:
        data['booking_no'] = match.group(1)
    
    # SCAC Code
    match = re.search(r'Carrier Scac Code\s*:\s*(\w+)', text, re.IGNORECASE)
    if match:
        data['carrier_scac'] = match.group(1)
    
    # Vessel and Voyage - format: "Vessel HMM HOPE V. 059E"
    match = re.search(r'Vessel\s+(.+?)\s+V\.\s*(\S+)', text)
    if match:
        data['main_vessel_name'] = match.group(1).strip()
        data['voyage_no'] = match.group(2)
    
    # POD - format: "Discharge Port TACOMA, WASHINGTON,U.S.A."
    match = re.search(r'Discharge Port\s+(.+?)(?:\s+Dis\.Port|\s+ETA)', text)
    if match:
        pod = match.group(1).strip()
        data['pod_name'] = pod.split(',')[0].strip()
    
    # ETA - format: "Dis.Port ETA 13-Feb-2026"
    match = re.search(r'Dis\.Port ETA\s+(\d{1,2}-[A-Za-z]{3}-\d{4})', text)
    if match:
        data['eta_at_pod'] = parse_date(match.group(1))
    
    # Shipper
    match = re.search(r'Shipper\s+(.+?)(?:\n|$)', text)
    if match:
        data['shipper_name'] = match.group(1).strip()
    
    # Consignee (TO field)
    match = re.search(r'^To\s+(.+?)\s+Tel\.', text, re.MULTILINE)
    if match:
        data['consignee_name'] = match.group(1).strip()
    
    # Agent Company (first line of PDF - letterhead)
    lines = text.strip().split('\n')
    if lines and len(lines[0]) > 5:
        data['agent_company'] = lines[0].strip()
    
    # ETD - format: "ETD - BKK 15-Jan-2026"
    match = re.search(r'ETD\s*-?\s*\w*\s*(\d{1,2}-[A-Za-z]{3}-\d{4})', text)
    if match:
        data['etd_at_pol'] = parse_date(match.group(1))
    
    # Carrier - format: "Carrier HMM CO., LTD. BY HMM (THAILAND)"
    match = re.search(r'Carrier\s+(.+?)(?:\s+BY|\n|$)', text)
    if match:
        data['carrier_name'] = match.group(1).strip()
    
    # Port of Loading - format: "Port of Loading LAEM CHABANG,THAILAND"
    match = re.search(r'Port of Loading\s+(.+?)(?:\n|$)', text)
    if match:
        data['port_of_loading'] = match.group(1).strip()
    
    # Origin fallback: Use Port of Loading if Origin not explicitly found
    if not data.get('origin') and data.get('port_of_loading'):
        data['origin'] = data['port_of_loading']
    
    # Place of Receipt - format: "Place of Receipt BANGKOK,THAILAND"
    match = re.search(r'Place of Receipt\s+(.+?)(?:\n|$)', text)
    if match:
        data['place_of_receipt'] = match.group(1).strip()
    
    # Final Dest - format: "Final Dest. TACOMA, WASHINGTON,U.S.A."
    match = re.search(r'Final Dest\.\s+(.+?)(?:\n|$)', text)
    if match:
        data['final_destination'] = match.group(1).strip()
    
    return data


def extract_msc_booking(text: str) -> dict:
    """Extract data from MSC booking confirmation (EBKG format)"""
    data = {
        'carrier_scac': 'MSCU',  # MSC's SCAC code
        'booking_no': None,
        'main_vessel_name': None,
        'voyage_no': None,
        'pod_name': None,
        'eta_at_pod': None,
        'shipper_name': None,
        'consignee_name': None,
        'agent_company': 'MSC (Direct)',  # MSC books directly
        'etd_at_pol': None,
        'carrier_name': 'MSC',
        'port_of_loading': None,
        'place_of_receipt': None,
        'origin': None,
        'final_destination': None,
    }
    
    # Booking Ref
    match = re.search(r'BOOKING REF\s*:\s*(\S+)', text)
    if match:
        data['booking_no'] = match.group(1)
    
    # Connecting Vessel - format: "CONNECTING VESSEL: MSC OSCAR V.FY602A"
    match = re.search(r'CONNECTING VESSEL:\s*(.+?)\s+V\.(\S+)', text)
    if match:
        data['main_vessel_name'] = match.group(1).strip()
        data['voyage_no'] = match.group(2)
    
    # POD - format: "P . O . D : ABIDJAN"
    match = re.search(r'P\s*\.\s*O\s*\.\s*D\s*:\s*(.+)', text)
    if match:
        data['pod_name'] = match.group(1).strip()
    
    # ETA - format: "ETA AT POD 09 MAR"
    match = re.search(r'ETA AT POD\s+(\d{1,2}\s+[A-Za-z]{3})', text)
    if match:
        date_str = match.group(1) + " 2026"  # Assume 2026
        data['eta_at_pod'] = parse_date(date_str)
    
    # Shipper - format: "SHIPPER : C.P.INTERTRADE CO.,LTD"
    match = re.search(r'SHIPPER\s*:\s*(.+?)(?:\n|$)', text)
    if match:
        data['shipper_name'] = match.group(1).strip()
    
    # Consignee (TO field) - format: "TO : DYNAMIC INTERTRANSPORT CO.,LTD."
    match = re.search(r'^TO\s*:\s*(.+?)(?:\n|$)', text, re.MULTILINE)
    if match:
        data['consignee_name'] = match.group(1).strip()
    
    # ETD - format: "ETD : 29-JAN-26" or in FEEDER VESSEL line
    match = re.search(r'ETD\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})', text)
    if match:
        data['etd_at_pol'] = parse_date(match.group(1))
    
    # Origin - format: "ORIGIN : SIAM BANGKOK PORT"
    match = re.search(r'ORIGIN\s*:\s*(.+?)(?:\n|$)', text)
    if match:
        data['origin'] = match.group(1).strip()
    
    # POL - format: "P . O . L / 1st T/S : LAEM CHABANG / SINGAPORE"
    match = re.search(r'P\s*\.\s*O\s*\.\s*L\s*/?\s*(?:1st T/S)?\s*:\s*(.+?)(?:\s*/|$|\n)', text)
    if match:
        data['port_of_loading'] = match.group(1).strip()
    
    # Final Dest - format: "FINAL DEST :"
    match = re.search(r'FINAL DEST\s*:\s*(.+?)(?:\s+DEST\.STATE|$|\n)', text)
    if match:
        dest = match.group(1).strip()
        if dest:
            data['final_destination'] = dest
    
    # Origin fallback: Use Port of Loading if Origin not explicitly found
    if not data.get('origin') and data.get('port_of_loading'):
        data['origin'] = data['port_of_loading']
    
    return data


def extract_evergreen_booking(text: str) -> dict:
    """Extract data from Evergreen booking confirmation (SB format)
    
    Note: In Evergreen PDFs, values appear on the line BEFORE the label, e.g.:
        050600075718
        BOOKING NO. :
    """
    data = {
        'carrier_scac': None,
        'booking_no': None,
        'main_vessel_name': None,
        'voyage_no': None,
        'pod_name': None,
        'eta_at_pod': None,
        'shipper_name': None,
        'consignee_name': None,
        'agent_company': 'EVERGREEN SHIPPING AGENCY (THAILAND) CO., LTD.',
        'etd_at_pol': None,
        'carrier_name': 'EVERGREEN LINE',
        'port_of_loading': None,
        'place_of_receipt': None,
        'origin': None,
        'final_destination': None,
    }
    
    # Booking No - value appears BEFORE "APPLICATION NO.:" label
    # Format: "050600075718 APPLICATION NO.:26012002259145"
    match = re.search(r'(\d{10,15})\s+APPLICATION NO\.', text)
    if match:
        data['booking_no'] = match.group(1)
    
    # SCAC - format: "SCAC:EGLV"
    match = re.search(r'SCAC[:\s]*(EGLV)', text)
    if match:
        data['carrier_scac'] = match.group(1)
    
    # Vessel/Voyage - value appears BEFORE "VESSEL/VOYAGE :" label
    # Format: "EVER WEB 0340-021A\nVESSEL/VOYAGE :"
    match = re.search(r'(EVER\s+\w+)\s+(\S+)\s*\n\s*VESSEL/VOYAGE', text)
    if match:
        data['main_vessel_name'] = match.group(1).strip()
        data['voyage_no'] = match.group(2).strip()
    
    # POD - format: "PORT OF DISCHARGING :VANCOUVER, BC,CANADA"
    match = re.search(r'PORT OF DISCHARGING\s*:(.+?)(?:\r?\n|$)', text)
    if match:
        pod = match.group(1).strip()
        data['pod_name'] = pod.split(',')[0].strip()
    
    # ETA - search for ETA DATE after PORT OF DISCHARGING
    # Format: "ETA DATE :2026/03/29"
    match = re.search(r'PORT OF DISCHARGING.+?ETA DATE\s*:(\d{4}/\d{2}/\d{2})', text, re.DOTALL)
    if match:
        data['eta_at_pod'] = parse_date(match.group(1))
    
    # Shipper - format: "SHIPPER :C.P. INTERTRADE CO.,LTD."
    match = re.search(r'SHIPPER\s*:(.+?)(?:\n|$)', text)
    if match:
        data['shipper_name'] = match.group(1).strip()
    
    # Consignee (TO field) - format: "TO:C.P. INTERTRADE CO.,LTD."
    match = re.search(r'^TO:(.+?)(?:\n|$)', text, re.MULTILINE)
    if match:
        data['consignee_name'] = match.group(1).strip()
    
    # ETD DATE - format: "ETD DATE :2026/02/23"
    match = re.search(r'ETD DATE\s*:(\d{4}/\d{2}/\d{2})', text)
    if match:
        data['etd_at_pol'] = parse_date(match.group(1))
    
    # Port of Loading - format: "PORT OF LOADING :LAEM CHABANG,THAILAND"
    match = re.search(r'PORT OF LOADING\s*:(.+?)(?:\n|$)', text)
    if match:
        data['port_of_loading'] = match.group(1).strip()
    
    # Place of Receipt - format: "PLACE OF RECEIPT :LAT KRABANG,THAILAND"
    match = re.search(r'PLACE OF RECEIPT\s*:(.+?)(?:\n|$)', text)
    if match:
        data['place_of_receipt'] = match.group(1).strip()
    
    # Final Destination - format: "FINAL DESTINATION :VANCOUVER, BC,CANADA"
    match = re.search(r'FINAL DESTINATION\s*:(.+?)(?:\n|$)', text)
    if match:
        data['final_destination'] = match.group(1).strip()
    
    # Origin fallback: Use Port of Loading if Origin not explicitly found
    if not data.get('origin') and data.get('port_of_loading'):
        data['origin'] = data['port_of_loading']
    
    return data



def parse_date(date_str: str) -> str:
    """Parse various date formats to YYYY-MM-DD"""
    from datetime import datetime
    
    formats = [
        '%d-%b-%Y',      # 13-Feb-2026
        '%d %b %Y',      # 09 MAR 2026
        '%Y/%m/%d',      # 2026/03/29
        '%d-%b-%y',      # 13-Feb-26
        '%d-%B-%Y',      # 13-February-2026
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    return None


def detect_booking_type(text: str) -> str:
    """Detect the type of booking document"""
    if 'Carrier Scac Code' in text and 'HDMU' in text:
        return 'HMM'
    elif 'BOOKING REF' in text and 'MSC' in text:
        return 'MSC'
    elif 'EVERGREEN' in text or 'EGLV' in text:
        return 'EVERGREEN'
    return 'UNKNOWN'


def extract_booking_data(pdf_path: str, supabase: Client = None) -> dict:
    """Extract booking data from PDF file with smart MMSI lookup"""
    with pdfplumber.open(pdf_path) as pdf:
        text = ''
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + '\n'
    
    booking_type = detect_booking_type(text)
    
    if booking_type == 'HMM':
        data = extract_hmm_booking(text)
    elif booking_type == 'MSC':
        data = extract_msc_booking(text)
    elif booking_type == 'EVERGREEN':
        data = extract_evergreen_booking(text)
    else:
        print(f"Unknown booking type for: {pdf_path}")
        return None
    
    # Smart MMSI lookup for vessel
    vessel_name = data.get('main_vessel_name', '')
    if vessel_name:
        mmsi_result = get_vessel_mmsi(vessel_name, supabase)
        data['mmsi'] = mmsi_result.get('mmsi')
        
        # If we got carrier_scac from MMSI lookup (e.g., hardcoded), use it if not already set
        if not data.get('carrier_scac') and mmsi_result.get('carrier_scac'):
            data['carrier_scac'] = mmsi_result.get('carrier_scac')
        
        # Log cache status
        if mmsi_result.get('from_cache'):
            print(f"  MMSI retrieved from cache")
        elif mmsi_result.get('mmsi'):
            print(f"  MMSI retrieved from API and cached")
    
    return data


def insert_to_supabase(records: list[dict], supabase: Client = None) -> None:
    """Insert booking records into Supabase shipments table"""
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("ERROR: Supabase credentials not found in environment variables")
            print(f"  SUPABASE_URL: {'Set' if SUPABASE_URL else 'Not set'}")
            print(f"  SUPABASE_KEY: {'Set' if SUPABASE_KEY else 'Not set'}")
            return
        supabase = get_supabase_client()
    
    for record in records:
        if not record or not record.get('booking_no'):
            continue
        
        try:
            # Use upsert to avoid duplicates based on booking_no
            result = supabase.table('shipments').upsert(
                record,
                on_conflict='booking_no'
            ).execute()
            print(f"[OK] Inserted/Updated: {record['booking_no']}")
        except Exception as e:
            print(f"[ERROR] inserting {record.get('booking_no')}: {e}")


def main():
    print("=" * 60)
    print("PDF Booking Data Extraction")
    print("=" * 60)
    
    if not os.path.exists(BOOKING_DIR):
        print(f"ERROR: Booking directory not found: {BOOKING_DIR}")
        return
    
    # Initialize Supabase client once
    supabase = get_supabase_client()
    if not supabase:
        print("WARNING: Supabase client not initialized - MMSI caching will be disabled")
    
    pdf_files = [f for f in os.listdir(BOOKING_DIR) if f.lower().endswith('.pdf')]
    print(f"Found {len(pdf_files)} PDF files\n")
    
    all_records = []
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(BOOKING_DIR, pdf_file)
        print(f"Processing: {pdf_file}")
        
        data = extract_booking_data(pdf_path, supabase)
        
        if data:
            print(f"  Booking No: {data.get('booking_no')}")
            print(f"  Carrier:    {data.get('carrier_scac')}")
            print(f"  Vessel:     {data.get('main_vessel_name')}")
            print(f"  Voyage:     {data.get('voyage_no')}")
            print(f"  MMSI:       {data.get('mmsi') or 'null'}")
            print(f"  POD:        {data.get('pod_name')}")
            print(f"  ETA:        {data.get('eta_at_pod')}")
            print(f"  Shipper:    {data.get('shipper_name')}")
            print(f"  Consignee:  {data.get('consignee_name')}")
            print(f"  Agent:      {data.get('agent_company')}")
            all_records.append(data)
        else:
            print("  Failed to extract data")
        print()
    
    print("=" * 60)
    print("Inserting into Supabase...")
    print("=" * 60)
    insert_to_supabase(all_records, supabase)
    
    print("\nDone!")


if __name__ == '__main__':
    main()


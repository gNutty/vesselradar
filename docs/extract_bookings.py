"""
PDF Booking Data Extraction Script
Extracts booking information from PDF files and inserts into Supabase shipments table.
"""

import pdfplumber
import re
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

BOOKING_DIR = os.path.join(os.path.dirname(__file__), 'Booking')

# MMSI lookup based on project-context.md
VESSEL_MMSI_MAP = {
    'HMM HOPE': '440176000',
}


def extract_hmm_booking(text: str) -> dict:
    """Extract data from HMM booking confirmation (BKKM format)"""
    data = {
        'carrier_scac': None,
        'booking_no': None,
        'main_vessel_name': None,
        'voyage_no': None,
        'pod_name': None,
        'eta_at_pod': None,
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
        # Clean up POD name - take first part
        data['pod_name'] = pod.split(',')[0].strip()
    
    # ETA - format: "Dis.Port ETA 13-Feb-2026"
    match = re.search(r'Dis\.Port ETA\s+(\d{1,2}-[A-Za-z]{3}-\d{4})', text)
    if match:
        data['eta_at_pod'] = parse_date(match.group(1))
    
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


def extract_booking_data(pdf_path: str) -> dict:
    """Extract booking data from PDF file"""
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
    
    # Add MMSI if vessel is known
    vessel_name = data.get('main_vessel_name', '')
    data['mmsi'] = VESSEL_MMSI_MAP.get(vessel_name)
    
    return data


def insert_to_supabase(records: list[dict]) -> None:
    """Insert booking records into Supabase shipments table"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Supabase credentials not found in environment variables")
        print(f"  SUPABASE_URL: {'Set' if SUPABASE_URL else 'Not set'}")
        print(f"  SUPABASE_KEY: {'Set' if SUPABASE_KEY else 'Not set'}")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
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
    
    pdf_files = [f for f in os.listdir(BOOKING_DIR) if f.lower().endswith('.pdf')]
    print(f"Found {len(pdf_files)} PDF files\n")
    
    all_records = []
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(BOOKING_DIR, pdf_file)
        print(f"Processing: {pdf_file}")
        
        data = extract_booking_data(pdf_path)
        
        if data:
            print(f"  Booking No: {data.get('booking_no')}")
            print(f"  Carrier:    {data.get('carrier_scac')}")
            print(f"  Vessel:     {data.get('main_vessel_name')}")
            print(f"  Voyage:     {data.get('voyage_no')}")
            print(f"  MMSI:       {data.get('mmsi') or 'null'}")
            print(f"  POD:        {data.get('pod_name')}")
            print(f"  ETA:        {data.get('eta_at_pod')}")
            all_records.append(data)
        else:
            print("  Failed to extract data")
        print()
    
    print("=" * 60)
    print("Inserting into Supabase...")
    print("=" * 60)
    insert_to_supabase(all_records)
    
    print("\nDone!")


if __name__ == '__main__':
    main()

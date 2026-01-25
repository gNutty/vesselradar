"""
AIS Data Extraction and Processing Script
Uncompresses .csv.zst files, filters for cargo vessels, and upserts to vessel_master.
"""

import os
import zstandard as zstd
import pandas as pd
import io
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

AIS_DIR = os.path.join(os.path.dirname(__file__), 'ais')
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), 'vessels_list.csv')
TRACKING_FILE = os.path.join(os.path.dirname(__file__), 'processed_files.json')

# Vessel types for Cargo/Container ships
CARGO_VESSEL_TYPES = range(70, 80)


def load_processed_files():
    """Load the list of already processed files"""
    if os.path.exists(TRACKING_FILE):
        try:
            with open(TRACKING_FILE, 'r') as f:
                return set(json.load(f))
        except:
            return set()
    return set()


def save_processed_files(processed_list):
    """Save the list of processed files"""
    with open(TRACKING_FILE, 'w') as f:
        json.dump(list(processed_list), f, indent=2)


def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Supabase credentials not found")
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def process_ais_file(file_path: str):
    """Read, filter, and extract unique vessels from a .csv.zst file"""
    print(f"Processing: {os.path.basename(file_path)}")
    
    # Initialize decompressor
    dctx = zstandard.ZstdDecompressor() if 'zstandard' in globals() else zstd.ZstdDecompressor()
    
    unique_vessels = pd.DataFrame()
    
    # Read in chunks to handle large files
    try:
        with open(file_path, 'rb') as f:
            with dctx.stream_reader(f) as reader:
                with io.TextIOWrapper(reader, encoding='utf-8') as text_stream:
                    # Read in chunks of 100,000 rows
                    chunk_iter = pd.read_csv(text_stream, chunksize=100000)
                    
                    for i, chunk in enumerate(chunk_iter):
                        # Clean column names
                        chunk.columns = [c.strip() for c in chunk.columns]
                        
                        # Find relevant columns
                        col_map = {
                            'MMSI': ['MMSI', 'mmsi'],
                            'VesselName': ['VesselName', 'Vessel Name', 'vessel_name', 'NAME', 'name'],
                            'IMO': ['IMO', 'imo'],
                            'VesselType': ['VesselType', 'Vessel Type', 'vessel_type', 'TYPE', 'type']
                        }
                        
                        actual_cols = {}
                        for target, aliases in col_map.items():
                            for alias in aliases:
                                if alias in chunk.columns:
                                    actual_cols[target] = alias
                                    break
                        
                        if 'VesselType' not in actual_cols or 'MMSI' not in actual_cols:
                            continue
                        
                        # Apply filter
                        mask = chunk[actual_cols['VesselType']].isin(CARGO_VESSEL_TYPES)
                        filtered_chunk = chunk[mask].copy()
                        
                        if filtered_chunk.empty:
                            continue
                            
                        # Select and rename
                        select_cols = []
                        rename_map = {}
                        
                        if 'MMSI' in actual_cols:
                            select_cols.append(actual_cols['MMSI'])
                            rename_map[actual_cols['MMSI']] = 'mmsi'
                        if 'VesselName' in actual_cols:
                            select_cols.append(actual_cols['VesselName'])
                            rename_map[actual_cols['VesselName']] = 'vessel_name'
                        if 'IMO' in actual_cols:
                            select_cols.append(actual_cols['IMO'])
                            rename_map[actual_cols['IMO']] = 'imo'
                        if 'VesselType' in actual_cols:
                            select_cols.append(actual_cols['VesselType'])
                            rename_map[actual_cols['VesselType']] = 'ship_type'
                        
                        filtered_chunk = filtered_chunk[select_cols].rename(columns=rename_map)
                        unique_vessels = pd.concat([unique_vessels, filtered_chunk]).drop_duplicates(subset=['vessel_name'])
                        
                        if i % 10 == 0:
                            print(f"  Processed {i*100000} rows... Found {len(unique_vessels)} unique vessels.")

    except Exception as e:
        print(f"  Error processing {os.path.basename(file_path)}: {e}")
        
    return unique_vessels


def upsert_to_vessel_master(vessels: pd.DataFrame, supabase: Client):
    """UPSERT vessel data into Supabase vessel_master table"""
    if vessels.empty or not supabase:
        return
    
    print(f"Upserting {len(vessels)} vessels to vessel_master...")
    records = vessels.to_dict('records')
    
    clean_records = []
    for r in records:
        v_name = str(r.get('vessel_name', '')).strip().upper()
        if not v_name or v_name == 'NAN':
            continue
            
        mmsi_raw = r.get('mmsi')
        mmsi = None
        if not pd.isna(mmsi_raw):
            mmsi = str(int(float(mmsi_raw))) if str(mmsi_raw).replace('.', '').isdigit() else str(mmsi_raw)

        imo_raw = r.get('imo')
        imo = None
        if not pd.isna(imo_raw):
            imo_str = str(imo_raw).upper().replace('IMO', '').strip()
            imo = ''.join(filter(str.isdigit, imo_str)) if imo_str else None

        clean_r = {
            'vessel_name': v_name,
            'mmsi': mmsi,
            'imo': imo if imo else None,
            'ship_type': str(r['ship_type']) if not pd.isna(r['ship_type']) else 'Cargo',
            'updated_at': pd.Timestamp.now(tz='UTC').isoformat()
        }
        
        if not clean_r['mmsi'] or not clean_r['vessel_name']:
            continue
            
        clean_records.append(clean_r)

    batch_size = 1000
    for i in range(0, len(clean_records), batch_size):
        batch = clean_records[i:i + batch_size]
        try:
            supabase.table('vessel_master').upsert(batch, on_conflict='vessel_name').execute()
            if i % 5000 == 0:
                print(f"  Upserted {i + len(batch)} records...")
        except Exception as e:
            print(f"  [Error] Batch starting at {i} failed: {e}")


def main():
    print("=" * 60)
    print("Incremental AIS Data Extraction & Vessel Master Update")
    print("=" * 60)
    
    if not os.path.exists(AIS_DIR):
        print(f"ERROR: AIS directory not found: {AIS_DIR}")
        return
    
    all_files = [f for f in os.listdir(AIS_DIR) if f.endswith('.csv.zst')]
    processed_files = load_processed_files()
    
    files_to_process = [f for f in all_files if f not in processed_files]
    
    if not files_to_process:
        print("All AIS files have already been processed and skipped.")
        return
    
    print(f"Found {len(all_files)} files total. {len(files_to_process)} new files to process.")
    
    supabase = get_supabase_client()
    
    for ais_file in files_to_process:
        file_path = os.path.join(AIS_DIR, ais_file)
        vessels = process_ais_file(file_path)
        
        if not vessels.empty:
            # Upsert immediately for this file
            if supabase:
                upsert_to_vessel_master(vessels, supabase)
            
            # Record that this file is done
            processed_files.add(ais_file)
            save_processed_files(processed_files)
            print(f"Successfully processed and recorded: {ais_file}")
        
        print("-" * 30)
    
    print("\nIncremental Extraction Complete!")


if __name__ == '__main__':
    main()

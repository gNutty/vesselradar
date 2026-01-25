"""
NOAA AIS Data Downloader & Processor
Downloads .csv.zst files from NOAA, filters for cargo vessels, and upserts to vessel_master.
Optimized version of the user-provided code with streaming and batching.
"""

import os
import requests
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

TRACKING_FILE = os.path.join(os.path.dirname(__file__), 'noaa_processed_urls.json')

# Vessel types for Cargo/Container ships
CARGO_VESSEL_TYPES = range(70, 80)

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Supabase credentials not found")
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_processed_urls():
    """Load the list of already processed URLs"""
    if os.path.exists(TRACKING_FILE):
        try:
            with open(TRACKING_FILE, 'r') as f:
                return set(json.load(f))
        except:
            return set()
    return set()

def save_processed_urls(processed_list):
    """Save the list of processed URLs"""
    with open(TRACKING_FILE, 'w') as f:
        json.dump(list(processed_list), f, indent=2)

def process_noaa_ais(url, supabase: Client):
    """Download, decompress stream, and upsert data in batches"""
    print(f"\n{'='*60}")
    print(f"Starting NOAA AIS Download & Process: {os.path.basename(url)}")
    print(f"{'='*60}")

    try:
        # 1. Start streaming download
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # 2. Setup decompression stream
        dctx = zstd.ZstdDecompressor()
        
        unique_vessels = {} # Use dict to maintain uniqueness in memory [vessel_name] -> data
        
        # 3. Process decompressed stream directly with pandas in chunks
        with dctx.stream_reader(response.raw) as reader:
            with io.TextIOWrapper(reader, encoding='utf-8') as text_stream:
                # Use chunksize to keep RAM usage low
                df_iter = pd.read_csv(text_stream, chunksize=50000)
                
                for i, chunk in enumerate(df_iter):
                    # Clean column names
                    chunk.columns = [c.strip() for c in chunk.columns]
                    
                    # Map columns (NOAA usually uses MMSI, VesselName, IMO, VesselType)
                    col_map = {
                        'MMSI': ['MMSI', 'mmsi'],
                        'VesselName': ['VesselName', 'vessel_name', 'Vessel Name', 'NAME'],
                        'IMO': ['IMO', 'imo'],
                        'VesselType': ['VesselType', 'vessel_type', 'Vessel Type', 'TYPE']
                    }
                    
                    actual_cols = {}
                    for target, aliases in col_map.items():
                        for alias in aliases:
                            if alias in chunk.columns:
                                actual_cols[target] = alias
                                break
                    
                    if 'VesselType' not in actual_cols or 'MMSI' not in actual_cols:
                        continue
                    
                    # Filter Cargo/Container
                    mask = chunk[actual_cols['VesselType']].isin(CARGO_VESSEL_TYPES)
                    filtered = chunk[mask].copy()
                    
                    if filtered.empty:
                        continue
                    
                    # Clean and prepare for upsert
                    for _, row in filtered.iterrows():
                        v_name = str(row[actual_cols['VesselName']]).strip().upper() if 'VesselName' in actual_cols else None
                        if not v_name or v_name == 'NAN':
                            continue
                            
                        mmsi_raw = row[actual_cols['MMSI']]
                        if pd.isna(mmsi_raw): continue
                        
                        mmsi = str(int(float(mmsi_raw)))
                        
                        imo = None
                        if 'IMO' in actual_cols and not pd.isna(row[actual_cols['IMO']]):
                            imo_str = str(row[actual_cols['IMO']]).upper().replace('IMO', '').strip()
                            imo = ''.join(filter(str.isdigit, imo_str))
                        
                        ship_type = str(row[actual_cols['VesselType']]) if 'VesselType' in actual_cols else 'Cargo'
                        
                        # Add to our unique set (latest data wins for this session)
                        unique_vessels[v_name] = {
                            'vessel_name': v_name,
                            'mmsi': mmsi,
                            'imo': imo if imo else None,
                            'ship_type': ship_type,
                            'updated_at': pd.Timestamp.now(tz='UTC').isoformat()
                        }
                    
                    if i % 10 == 0:
                        print(f"  Processed {i*50000} rows... Current unique vessels: {len(unique_vessels)}")

        # 4. Batch UPSERT to Supabase
        if unique_vessels:
            v_list = list(unique_vessels.values())
            print(f"\nUpserting {len(v_list)} vessels to Supabase...")
            
            batch_size = 1000
            for k in range(0, len(v_list), batch_size):
                batch = v_list[k:k+batch_size]
                try:
                    supabase.table("vessel_master").upsert(batch, on_conflict='vessel_name').execute()
                    if k % 5000 == 0:
                        print(f"  Batch starting at {k} upserted.")
                except Exception as upsert_err:
                    print(f"  [Error] Batch starting at {k} failed: {upsert_err}")
            
            print("  [OK] All batches processed.")
            return True
        else:
            print("  No cargo vessels found in this file.")
            return True # Still considered success

    except Exception as e:
        print(f"  [ERROR] Failed to process {url}: {e}")
        return False

def main():
    supabase = get_supabase_client()
    if not supabase: return
    
    processed_urls = load_processed_urls()
    
    # URL provided by user
    urls_to_process = [
        "https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2025/ais-2025-01-01.csv.zst",
        "https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2025/ais-2025-01-02.csv.zst" # Adding one more for "more data"
    ]
    
    for url in urls_to_process:
        if url in processed_urls:
            print(f"Skipping already processed URL: {url}")
            continue
            
        success = process_noaa_ais(url, supabase)
        if success:
            processed_urls.add(url)
            save_processed_urls(processed_urls)
            
    print("\nAll NOAA tasks finished.")

if __name__ == "__main__":
    main()

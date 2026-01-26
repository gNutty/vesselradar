import streamlit as st
import pandas as pd
import os
import sys
from io import BytesIO

# Add current directory to path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import backend logic
try:
    from extract_bookings import extract_booking_data, insert_to_supabase, get_supabase_client
except ImportError as e:
    st.error(f"Failed to import backend module: {e}")
    st.stop()

# Page Config
st.set_page_config(
    page_title="OCR Booking Manager",
    page_icon="🚢",
    layout="wide"
)

# Initialize Session State
if 'extracted_data' not in st.session_state:
    st.session_state.extracted_data = []
if 'processed_count' not in st.session_state:
    st.session_state.processed_count = 0

def main():
    st.title("🚢 OCR Booking Manager")
    st.markdown("Extract booking data from PDFs and upload to Supabase.")

    # Sidebar: Setup & Status
    with st.sidebar:
        st.header("Status")
        supabase = get_supabase_client()
        if supabase:
            st.success("✅ Supabase Connected")
        else:
            st.error("❌ Supabase Not Connected")
            st.warning("Check your .env.local file")
        
        st.divider()
        st.info("Supported Formats: HMM, MSC, Evergreen")

    # Main Connection
    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader("1. Source Selection")
        input_type = st.radio("Select Input Method:", ["Upload Files", "Scan Folder"])

        files_to_process = []
        
        if input_type == "Upload Files":
            uploaded_files = st.file_uploader("Drop PDF files here", type=["pdf"], accept_multiple_files=True)
            if uploaded_files:
                for f in uploaded_files:
                    files_to_process.append({"name": f.name, "file": f})
        
        elif input_type == "Scan Folder":
            folder_path = st.text_input("Enter Folder Path:", value=os.path.join(current_dir, "Booking"))
            if st.button("Scan Directory"):
                if os.path.exists(folder_path):
                    files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
                    st.write(f"Found {len(files)} PDF documents.")
                    for f in files:
                        full_path = os.path.join(folder_path, f)
                        files_to_process.append({"name": f, "file": full_path})
                else:
                    st.error("Directory not found.")
            
            # Persist found files from folder between reruns if we want, 
            # but for now we rely on the button being pressed or just reprocessing.
            # actually, better to re-scan or create a list in session state if needed.
            # For simplicity, we just look at the path. 
            if os.path.exists(folder_path) and not files_to_process:
                 # Auto scan if path exists
                 files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
                 for f in files:
                    full_path = os.path.join(folder_path, f)
                    files_to_process.append({"name": f, "file": full_path})

        st.divider()
        
        if st.button("Process Extraction", type="primary", disabled=not files_to_process):
            with st.spinner(f"Processing {len(files_to_process)} files..."):
                results = []
                progress_bar = st.progress(0)
                
                for i, item in enumerate(files_to_process):
                    try:
                        # Extract data
                        data = extract_booking_data(item["file"], supabase)
                        if data:
                            # Add filename for reference
                            data['source_file'] = item["name"]
                            results.append(data)
                        else:
                            st.toast(f"Skipped {item['name']} (No data/Unknown type)", icon="⚠️")
                    except Exception as e:
                        st.error(f"Error processing {item['name']}: {e}")
                    
                    progress_bar.progress((i + 1) / len(files_to_process))
                
                st.session_state.extracted_data = results
                st.session_state.processed_count = len(results)
                st.success(f"Processed {len(results)} bookings successfully!")

    with col2:
        st.subheader("2. Data Preview")
        
        if st.session_state.extracted_data:
            df = pd.DataFrame(st.session_state.extracted_data)
            
            # Reorder columns slightly for better view
            cols = ['booking_no', 'main_vessel_name', 'carrier_scac', 'mmsi', 'eta_at_pod', 'source_file']
            # Add other cols that exist in df
            all_cols = cols + [c for c in df.columns if c not in cols]
            
            # Use data_editor to allow modifications
            edited_df = st.data_editor(
                df[all_cols],
                use_container_width=True,
                num_rows="dynamic",
                key="data_editor"
            )
            
            st.divider()
            
            col_act1, col_act2 = st.columns(2)
            with col_act1:
                st.subheader("3. Actions")
                if st.button("Confirm & Send to Supabase", type="primary"):
                    if supabase:
                        with st.spinner("Uploading to database..."):
                            # Convert edited dataframe back to records
                            # We work with the edited_df now
                            records = edited_df.to_dict('records')
                            
                            # Clean records (remove source_file if not needed, handle NaNs)
                            clean_records = []
                            for r in records:
                                clean_r = r.copy()
                                #Remove source_file if it helps, though usually ignored if not in DB schema
                                if 'source_file' in clean_r:
                                    del clean_r['source_file']
                                    
                                # Convert NaN/None properly if needed, but extract_bookings return None for missing
                                # Pandas might turn None to NaN. Supabase handles nulls often.
                                # Let's ensure strict dict structure
                                clean_records.append(clean_r)
                            
                            insert_to_supabase(clean_records, supabase)
                            st.balloons()
                            st.success("Data successfully uploaded to Supabase!")
                    else:
                        st.error("Cannot upload: Supabase client not initialized.")
            
        else:
            st.info("No data extracted yet. Select files and click Process.")

if __name__ == "__main__":
    main()

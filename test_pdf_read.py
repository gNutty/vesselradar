import pdfplumber
import os

booking_dir = r"d:\Project\vesselradar\Booking"
files = [f for f in os.listdir(booking_dir) if f.endswith(".PDF") or f.endswith(".pdf")]

for file in files:
    path = os.path.join(booking_dir, file)
    print(f"\n--- Reading: {file} ---")
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    print(text[:1000]) # First 1000 chars
                else:
                    print("[No text found - maybe image-based]")
    except Exception as e:
        print(f"Error: {e}")

# Project Instructions: Shipping Tracking Dashboard

## Tech Stack Roles
* **Frontend:** Next.js 15+, TypeScript, Tailwind CSS.
* **UI Components:** Lucide Icons for logistics-related icons.
* **State Management:** React Hooks and Supabase Client.
* **Database:** Supabase (PostgreSQL).
* **Mapping:** Leaflet.js (Use OpenStreetMap tiles).

## Coding Standards
* **Minimalist UI:** เน้นดีไซน์ทันสมัยแบบ Glassmorphism โทนสี Navy Blue และ White.
* **Responsive:** ต้องรองรับการแสดงผลทั้ง Mobile และ Desktop.
* **Security:** ใช้ Row Level Security (RLS) ใน Supabase เพื่อให้ลูกค้าเห็นเฉพาะข้อมูลของตนเอง.
* **Performance:** ทำ Data Caching ข้อมูล API ในฐานข้อมูลทุก 6 ชั่วโมง เพื่อลดการเรียก API ซ้ำซ้อน.

## API Usage
* **Primary Source:** RapidAPI (Vesselfinder1 หรือ Ship Tracking API).
* **Identifier:** ใช้ MMSI เป็นหลักในการดึงพิกัดเรือ.
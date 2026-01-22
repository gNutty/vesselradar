# Implementation Plan

## Phase 1: Database Schema & Supabase Setup (Current)
- [x] สร้างตาราง `shipments` เพื่อเก็บข้อมูลเลข Booking และ MMSI.
- [x] สร้างตาราง `tracking_logs` เพื่อเก็บประวัติพิกัดเรือ (Lat, Long, Speed, ETA).
- [x] ตั้งค่า Supabase Auth สำหรับลูกค้ารายย่อย.

## Phase 2: API Integration (RapidAPI)
- [x] เขียนฟังก์ชันดึงข้อมูลจาก Vesselfinder1 API โดยใช้ MMSI 440176000.
- [x] พัฒนาระบบ Background Sync เพื่ออัปเดตพิกัดเรือลงฐานข้อมูลอัตโนมัติ.

## Phase 3: Frontend Dashboard Development
- [ ] ออกแบบ Summary Cards (In Transit, Arriving Soon).
- [ ] ติดตั้งและตั้งค่า Leaflet.js เพื่อแสดงแผนที่ตำแหน่งเรือ.
- [ ] สร้างตารางรายการ Shipment พร้อม Progress Bar แสดงสถานะ.
เพื่อให้ชัดเจนมากขึ้น
Component Library: "ใช้ shadcn/ui สำหรับ UI Components พื้นฐาน เช่น Table, Card, และ Button" เพื่อให้ได้ดีไซน์ที่พรีเมียมและรวดเร็ว
Color Palette: "Primary: Navy Blue (#000080), Accent: Electric Blue (#0070f3) สำหรับสถานะ Active"
Map Configuration: "แผนที่ Leaflet ต้องใช้ธีมแบบ Minimal/Dark เพื่อให้เข้ากับดีไซน์ Dashboard"


## Phase 4: Testing & Deployment
- [ ] ทดสอบระบบการแยกข้อมูลตามสิทธิ์ของลูกค้า (Multitenancy).
- [ ] Deploy ระบบขึ้น Vercel.
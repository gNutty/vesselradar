# Implementation Plan

## Phase 1: Database Schema & Supabase Setup (Current)
- [x] สร้างตาราง `shipments` เพื่อเก็บข้อมูลเลข Booking และ MMSI.
- [x] สร้างตาราง `tracking_logs` เพื่อเก็บประวัติพิกัดเรือ (Lat, Long, Speed, ETA).
- [ ] ตั้งค่า Supabase Auth สำหรับลูกค้ารายย่อย.

## Phase 2: API Integration (RapidAPI)
- [ ] เขียนฟังก์ชันดึงข้อมูลจาก Vesselfinder1 API โดยใช้ MMSI 440176000.
- [ ] พัฒนาระบบ Background Sync เพื่ออัปเดตพิกัดเรือลงฐานข้อมูลอัตโนมัติ.

## Phase 3: Frontend Dashboard Development
- [ ] ออกแบบ Summary Cards (In Transit, Arriving Soon).
- [ ] ติดตั้งและตั้งค่า Leaflet.js เพื่อแสดงแผนที่ตำแหน่งเรือ.
- [ ] สร้างตารางรายการ Shipment พร้อม Progress Bar แสดงสถานะ.

## Phase 4: Testing & Deployment
- [ ] ทดสอบระบบการแยกข้อมูลตามสิทธิ์ของลูกค้า (Multitenancy).
- [ ] Deploy ระบบขึ้น Vercel.
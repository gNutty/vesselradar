# Project Context: Freight Forwarder Export Tracking

## Business Overview
บริษัทเป็น Freight Forwarder ให้บริการส่งออกต่างประเทศ ต้องการสร้าง Dashboard ให้ลูกค้าติดตามสถานะเรือและตู้สินค้าได้เองผ่านหน้าเว็บ โดยใช้ข้อมูลจาก Booking Confirmation เป็นฐานข้อมูลเริ่มต้น.

## Key Reference Data (Example Shipment)
* [cite_start]**Booking Number:** BKKM23324000[cite: 7].
* [cite_start]**Carrier:** HMM CO., LTD.[cite: 7].
* [cite_start]**Vessel Name:** HMM HOPE (Voyage 059E)[cite: 7].
* **Vessel Identifiers:**
    * **MMSI:** 440176000.
    * **IMO:** 9637234.
* [cite_start]**Origin:** Laem Chabang, Thailand[cite: 7].
* [cite_start]**Destination:** Tacoma, Washington, U.S.A.[cite: 7].
* [cite_start]**Estimated Arrival (ETA):** 13-Feb-2026[cite: 7].

## Core Functionality Required
1. **Real-time Map:** แสดงตำแหน่งปัจจุบันของเรือบนแผนที่โลก.
2. **Status Timeline:** แสดงสถานะการขนส่ง (Booking -> Loading -> On Vessel -> Arrived).
3. **Customer Portal:** ระบบ Login สำหรับลูกค้าเพื่อดูรายการ Shipment ของตัวเอง.
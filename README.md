# Image Cropper Web

เว็บตัดรูปแบบตารางสำหรับแบ่งภาพออกเป็นหลายช่อง พร้อมปรับเส้นตาราง ลบพื้นหลัง ดูตัวอย่าง และดาวน์โหลดผลลัพธ์

## Features

- อัปโหลดรูปภาพจากเครื่อง
- ลากกรอบครอปบน canvas
- เลือกอัตราส่วนกรอบตัดได้ เช่น อิสระ, 1:1, 4:5, 16:9, 3:4
- ตั้งค่าจำนวนคอลัมน์และแถวของตารางได้
- ลากขยับเส้นตารางด้านในได้ทุกเส้น
- ลากขยับขอบกรอบด้านนอกได้ทั้ง 4 ด้าน
- ปรับ `ขนาดเส้น` ได้ด้วย slider เดียว ใช้ร่วมกันทั้งเส้นในและเส้นนอก
- การตัดรูปคำนวณตามความหนาของเส้น โดยเว้นพื้นที่เส้นออกจากรูปที่ถูกตัด
- ลบพื้นหลังอัตโนมัติจากสีขาว/สีเขียว หรือเปิดโหมดดูดสีเพื่อเลือกสีที่ต้องการลบเอง
- ปรับค่าความใกล้เคียงของสีสำหรับลบพื้นหลังได้
- แสดง preview รูปที่ตัดแล้วแบบ grid
- กด `View` เพื่อดูรูปตัวอย่างขนาดใหญ่
- ดาวน์โหลดรูปแยกทีละไฟล์
- ดาวน์โหลดทั้งหมดเป็นไฟล์ ZIP
- รองรับ layout แบบ sidebar และ responsive สำหรับจอเล็ก

## Project Structure

```text
.
|-- index.html
|-- assets/
|   |-- css/
|   |   `-- styles.css
|   `-- js/
|       `-- app.js
`-- README.md
```

## Files

- `index.html` contains the page markup and loads the app assets.
- `assets/css/styles.css` contains all layout and visual styles.
- `assets/js/app.js` contains canvas drawing, grid editing, cropping, preview, and download logic.

## Run

Open `index.html` directly in a browser.

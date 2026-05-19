# Smart Stay Firmware - Fitur Lengkap

## 📋 Daftar Fitur Sistem

### 1. 🔐 Sistem Autentikasi Multi-Metode

- **Face Recognition (Wajah)**
  - Verifikasi wajah real-time
  - API integration ke backend
  - Feedback "Wajah OK" / error handling
  - Aktif saat server online
- **PIN Entry (Keypad)**
  - Input PIN melalui keypad 4x4
  - Validasi minimum 4 digit
  - Maksimal 8 digit PIN
  - Clear PIN dengan tombol C
  - Aktif hanya saat server offline
- **RFID Card Reader**
  - Baca kartu RFID otomatis
  - UID formatting dan detection
  - Debounce untuk mencegah double-read
  - Aktif hanya saat server offline

---

### 2. 🚪 Kontrol Akses Pintu

- **Relay Control**
  - Aktifkan/deaktifkan relay untuk pintu
  - Status terkunci/terbuka
  - Synchronisasi dengan backend via API
- **Reed Switch Monitoring**
  - Sensor untuk mendeteksi kondisi pintu
  - Pull-up configuration
  - Real-time state tracking

---

### 3. 🚨 Sistem Alarm & Monitoring

- **Door Open Alarm**
  - Trigger alarm jika pintu terbuka > 10 detik
  - Buzzer berkedip dengan frekuensi 400ms
  - Display alarm warning
- **Buzzer Feedback**
  - Konfirmasi akses (3x beep, 200ms)
  - Error notification (2x beep, 800ms)
  - Keypad feedback (1x beep, 50ms)
  - WiFi status notification

---

### 4. 📱 Komunikasi Network & API

- **WiFi Connectivity**
  - Auto-connect ke SSID tertentu
  - Timeout 15 detik untuk koneksi
  - Status feedback
- **HTTP API Integration**
  - POST requests ke backend
  - Timeout 5 detik per request
  - Support untuk 4 endpoint:
    - `/verification/pin` - PIN verification
    - `/verification/face` - Face verification
    - `/verification/rfid` - RFID verification
    - `/gate/status` - Update gate status (PATCH)
    - `/residents/device/cache` - Cache penghuni untuk mode offline
    - `/access-logs/sync` - Sync log offline ke server

---

### 5. 🔁 Mode Online / Offline

- **Mode Online**
  - Hanya verifikasi wajah yang diizinkan
  - PIN dan RFID dinonaktifkan dari keypad dan reader
  - Cache penghuni tetap di-refresh dari server
  - Log offline yang tertunda langsung di-sync ke server

- **Mode Offline**
  - Verifikasi menggunakan cache lokal penghuni
  - PIN dan RFID tetap aktif
  - Face recognition dinonaktifkan
  - Access log disimpan lokal di ESP32
  - Log akan dikirim otomatis saat server kembali online

---

### 6. 💻 User Interface (LCD 16x2)

- **Display Management**
  - Auto-padding text ke 16 karakter
  - Two-line display support
  - Real-time status updates
- **Menu System**
  - Online: A = Face only
  - Offline: A = Face offline notice, B = PIN, C = Clear PIN
- **Status Messages**
  - "SERVER ONLINE" - Face only mode
  - "SERVER OFFLINE" - Local mode aktif
  - "AKSES DISETUJUI" - Access granted
  - "AKSES DITOLAK" - Access denied
  - "ALARM! TUTUP!!" - Door alarm
  - "WiFi TERPUTUS" - WiFi error

---

### 7. ⚙️ Hardware Components

| Komponen                  | Pin                                    | Fungsi             |
| ------------------------- | -------------------------------------- | ------------------ |
| **RFID Reader (MFRC522)** | SDA: 5, RST: 4                         | Read RFID cards    |
| **Keypad 4x4**            | Rows: 13,12,14,27<br>Cols: 26,25,33,32 | PIN input          |
| **Buzzer**                | 2                                      | Audio feedback     |
| **Reed Switch**           | 15                                     | Door sensor        |
| **Relay**                 | 17                                     | Gate control       |
| **LCD 16x2**              | I2C: 0x27                              | Status display     |
| **SPI**                   | SCK: 18, MISO: 19, MOSI: 23            | RFID communication |

---

### 8. 🔄 Workflow Sistem

#### Boot Sequence:

```
1. Display "SISTEM SIAP"
2. Initialize RFID, Buzzer, Relay, Keypad, LCD
3. Connect WiFi dengan timeout 15s
4. Jika server online, ambil cache penghuni dan sync log lokal
5. Jika server offline, aktifkan mode lokal
6. Show ready state sesuai mode
7. Double beep confirmation
```

#### Access Flow (General):

```
1. User trigger (Face/PIN/RFID)
2. Mode online: hanya Face yang diizinkan
3. Mode offline: PIN dan RFID verifikasi dari cache lokal
4. Jika online, kirim HTTP request ke backend
5. Jika offline, simpan access log ke lokal ESP32
6. If approved:
   - Display "AKSES DISETUJUI"
   - 3x beep feedback
   - Set relay LOW (unlock)
   - Update gate status
7. If denied:
   - Display "AKSES DITOLAK"
   - 2x beep feedback
   - Keep relay HIGH (locked)
```

#### Specific Access Methods:

**Face Recognition:**

- Press A
- Display "Verifikasi Wajah"
- POST to `/verification/face`
- Backend sends response

**PIN Entry:**

- Press numeric keys (0-9)
- Display current PIN
- Press B to submit (min 4 digits)
- Press C to clear
- POST to `/verification/pin` with PIN value

**RFID Card:**

- Tap card to reader
- Auto-read UID
- 100ms debounce delay
- POST to `/verification/rfid` with card UID

---

### 9. 📊 Timing & Thresholds

| Parameter       | Nilai    | Fungsi                     |
| --------------- | -------- | -------------------------- |
| WiFi Timeout    | 15 s     | Connection attempt timeout |
| Door Open Limit | 10 s     | Trigger alarm threshold    |
| Alarm Blink     | 400 ms   | Buzzer blink frequency     |
| RFID Debounce   | 100 ms   | Prevent double-read        |
| Display Delay   | 2 s      | Message display duration   |
| PIN Minimum     | 4 digits | Validation requirement     |
| PIN Maximum     | 8 digits | Input limit                |

---

### 10. 🔌 API Endpoints Configuration

```
WiFi SSID: "Adi"
WiFi Pass: "12345678"

Base URL: http://10.138.39.73:8000

Endpoints:
- POST /verification/pin
- POST /verification/face
- POST /verification/rfid
- PATCH /gate/status
- GET /residents/device/cache
- POST /access-logs/sync
```

---

### 11. 📝 State Management

### 10. 📝 State Management

**Global Variables:**

- `currentInputPin` - Current PIN input buffer
- `doorOpenedTime` - Timestamp saat pintu dibuka
- `isBuzzerAlarmActive` - Status alarm buzzer
- `isAccessGranted` - Flag akses granted
- `serverOnline` - Status mode server
- `residentCache` - Cache penghuni lokal untuk mode offline
- `pendingLogs` - Antrian log akses yang belum di-sync

**Static Variables (in functions):**

- `lastState` - Previous door state
- `alarmStartTime` - Alarm trigger timestamp
- `lastBlink` - Last buzzer blink time

---

## 🎯 Ringkasan Fitur Inti

✅ Multi-method access control (Face, PIN, RFID)  
✅ Online mode: face only  
✅ Offline mode: PIN dan RFID via cache lokal  
✅ Local access log queue dan auto-sync  
✅ Real-time door monitoring dengan alarm  
✅ WiFi connectivity dengan API integration  
✅ LCD feedback untuk user experience  
✅ Audio-visual feedback (buzzer & display)  
✅ Relay control untuk door/gate mechanism  
✅ State tracking & status management  
✅ Error handling & timeout protection  
✅ Customizable timing & thresholds  
✅ Clean, modular code architecture

---

## 🔧 Compile & Upload

**Board:** ESP32  
**Required Libraries:**

- Arduino.h
- SPI.h
- MFRC522.h
- Keypad.h
- WiFi.h
- HTTPClient.h
- Wire.h
- LiquidCrystal_I2C.h

---

Last Updated: May 12, 2026

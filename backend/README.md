# Smart Stay Backend

## Mode Verifikasi Online/Offline

Backend menyediakan alur berikut untuk ESP32:

- `GET /health` untuk mengecek status server dan database.
- `GET /residents/device/cache` untuk mengekspor cache penghuni dalam format text sederhana agar perangkat bisa menyimpan data lokal.
- `POST /access-logs/sync` untuk sinkronisasi batch access log dari perangkat setelah server kembali online.

## Catatan Implementasi

- Verifikasi wajah tetap menjadi mode utama saat server online.
- Verifikasi RFID dan PIN dipakai saat server offline dengan cache lokal di ESP32.
- Access log offline disimpan dulu di perangkat, lalu disinkronkan ke backend ketika koneksi kembali tersedia.
- Endpoint sync dibuat idempotent dengan kombinasi `source_device_id` dan `source_log_id`.

## Menjalankan Test

```bash
python3 -m pytest -q
```

Untuk menginstall dependencies development (testing), jalankan di folder `backend`:

```bash
python3 -m pip install -r requirements-dev.txt
```

Untuk menjalankan aplikasi (runtime dependencies):

```bash
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

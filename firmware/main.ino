#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

/**
 * KONFIGURASI SISTEM
 * Pengaturan pin hardware, kredensial jaringan, dan endpoint API.
 */
struct AppConfig {
  const char *ssid = "Adi";
  const char *pass = "12345678";
  static const int baud = 115200;

  const String urlPin = "http://10.138.39.73:8000/verification/pin";
  const String urlFace = "http://10.138.39.73:8000/verification/face";
  const String urlRfid = "http://10.138.39.73:8000/verification/rfid";
  const String urlRfidCapture = "http://10.138.39.73:8000/verification/rfid/capture";
  const String urlGateStatus = "http://10.138.39.73:8000/gate/status";

  static const uint8_t rfidSda = 5;
  static const uint8_t rfidRst = 4;
  static const uint8_t sck = 18;
  static const uint8_t miso = 19;
  static const uint8_t mosi = 23;

  static const uint8_t lcdAddr = 0x27;
  static const uint8_t lcdCols = 16;
  static const uint8_t lcdRows = 2;

  static const uint8_t rows = 4;
  static const uint8_t cols = 4;
  const char keys[rows][cols] = {
      {'1', '2', '3', 'A'},
      {'4', '5', '6', 'B'},
      {'7', '8', '9', 'C'},
      {'*', '0', '#', 'D'}};
  const uint8_t rowPins[rows] = {13, 12, 14, 27};
  const uint8_t colPins[cols] = {26, 25, 33, 32};

  static const uint8_t buzzerPin = 2;
  static const uint8_t reedSwitchPin = 15;
  static const uint8_t relayPin = 17;  // TX2 - lebih aman dari RX2
  static const bool relayActiveLow = true;
  static const uint16_t doorOpenLimit = 10000;
};

/**
 * INSTANSIASI DAN VARIABLE GLOBAL
 * Objek hardware dan variabel state untuk kontrol pintu serta alarm.
 */
AppConfig config;
LiquidCrystal_I2C lcd(config.lcdAddr, config.lcdCols, config.lcdRows);
MFRC522 mfrc522(config.rfidSda, config.rfidRst);
Keypad keypad = Keypad(makeKeymap(config.keys), (byte *)config.rowPins,
                       (byte *)config.colPins, config.rows, config.cols);

String currentInputPin = "";
String capturedRfidUid = "";
unsigned long doorOpenedTime = 0;
bool isBuzzerAlarmActive = false;
bool isAccessGranted = false;
bool isRfidCaptureMode = false;

/**
 * MODUL UI DAN INDIKATOR
 * Pengelolaan tampilan LCD dan feedback audio buzzer.
 */
void display(String line1, String line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  if (line2 != "") {
    lcd.setCursor(0, 1);
    lcd.print(line2);
  }
}

void showReadyState() {
  if (isRfidCaptureMode) {
    display("Mode Ambil UID", "Tap kartu RFID");
    return;
  }

  if (isAccessGranted || digitalRead(config.reedSwitchPin) == HIGH) {
    display("Status: TERBUKA", "Silahkan masuk...");
  } else {
    display("Status: TERKUNCI", "A:Face B:OK C:CL");
  }
}

void triggerBuzzer(uint16_t durationMs, uint8_t repeat) {
  for (uint8_t i = 0; i < repeat; i++) {
    digitalWrite(config.buzzerPin, HIGH);
    delay(durationMs);
    digitalWrite(config.buzzerPin, LOW);
    if (repeat > 1)
      delay(100);
  }
}

/**
 * KOMUNIKASI API
 * Fungsi pengiriman data ke server menggunakan protokol HTTP.
 */
bool isNetworkReady() {
  if (WiFi.status() != WL_CONNECTED) {
    display("Error:", "WiFi Terputus");
    triggerBuzzer(1000, 1);
    return false;
  }
  return true;
}

void setRelayOutput(bool isRelayOn) {
  // Untuk modul low-active, relay ON saat pin bernilai LOW.
  bool pinHigh = config.relayActiveLow ? !isRelayOn : isRelayOn;
  digitalWrite(config.relayPin, pinHigh ? HIGH : LOW);
  Serial.print("[RELAY] isRelayOn=");
  Serial.print(isRelayOn);
  Serial.print(" pin=");
  Serial.println(pinHigh ? "HIGH" : "LOW");
}

void applyGateLockState(bool isLocked) {
  // Solenoid NC + relay NO contact + active-low: relay OFF saat lock, ON saat unlock.
  bool isRelayOn = !isLocked;
  Serial.print("[LOCK] isLocked=");
  Serial.println(isLocked);
  setRelayOutput(isRelayOn);
}

void updateGateStatus(bool isLocked) {
  applyGateLockState(isLocked);

  if (!isNetworkReady())
    return;

  HTTPClient http;
  http.begin(config.urlGateStatus);
  http.addHeader("Content-Type", "application/json");
  http.PATCH("{\"is_locked\": " + String(isLocked ? "true" : "false") + "}");
  http.end();
}

void processAccessResponse(int16_t httpCode, String payload, String successMsg,
                           String failMsg) {
  if (httpCode > 0) {
    if (payload == "true") {
      isAccessGranted = true;
      display("Akses Diterima", successMsg);
      triggerBuzzer(200, 2);
      updateGateStatus(false);
    } else {
      display("Akses Ditolak", failMsg);
      triggerBuzzer(1000, 1);
    }
  } else {
    display("Error:", "Server Offline");
    triggerBuzzer(1000, 1);
  }
  delay(2000);
  showReadyState();
}

void sendRequest(String url, String jsonBody, String success, String fail) {
  if (!isNetworkReady())
    return;
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  int16_t httpCode = http.POST(jsonBody);
  String payload = (httpCode > 0) ? http.getString() : "";
  processAccessResponse(httpCode, payload, success, fail);
  http.end();
}

bool sendCapturedRfidUid(String uid) {
  if (!isNetworkReady())
    return false;

  HTTPClient http;
  http.begin(config.urlRfidCapture);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  int16_t httpCode = http.POST("{\"rfid_code\": \"" + uid + "\"}");
  http.end();

  return httpCode > 0 && httpCode < 300;
}

/**
 * LOGIKA VERIFIKASI
 * Eksekusi permintaan autentikasi berdasarkan metode yang dipilih.
 */
void verifyFace() {
  display("Verifikasi", "Wajah...");
  sendRequest(config.urlFace, "{}", "Wajah Dikenali", "Wajah Asing");
}

void verifyPin(String pin) {
  display("Verifikasi", "PIN...");
  sendRequest(config.urlPin, "{\"pin\": \"" + pin + "\"}", "Selamat Datang",
              "PIN Salah");
}

void verifyRFID(String uid) {
  display("RFID Terbaca", "Verifikasi...");
  sendRequest(config.urlRfid, "{\"rfid_code\": \"" + uid + "\"}",
              "Kartu Terdaftar", "Kartu Asing");
}

/**
 * RFID HELPER
 * Memisahkan pembacaan UID fisik dengan proses verifikasi ke server.
 */
bool readRfidUid(String &uid) {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return false;
  }

  uid = "";
  for (uint8_t i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  return true;
}

void startRfidCaptureMode() {
  isRfidCaptureMode = true;
  capturedRfidUid = "";
  display("Mode Ambil UID", "Tap kartu RFID");
}

void stopRfidCaptureMode(bool showStatus = true) {
  isRfidCaptureMode = false;
  if (showStatus) {
    showReadyState();
  }
}

/**
 * MONITORING SENSOR
 * Pemantauan fisik pintu dan manajemen alarm peringatan.
 */
void monitorGate() {
  static int8_t lastState = -1;
  bool currentIsOpened = (digitalRead(config.reedSwitchPin) == HIGH);

  if (currentIsOpened != lastState) {
    lastState = currentIsOpened;

    if (currentIsOpened) {
      display("Gerbang:", "Terbuka");
      doorOpenedTime = millis();
      isAccessGranted = false;
    } else {
      if (!isAccessGranted) {
        display("Gerbang:", "Terkunci");
        updateGateStatus(true);
        isBuzzerAlarmActive = false;
        digitalWrite(config.buzzerPin, LOW);
        delay(1000);
        showReadyState();
      }
    }
  }

  if (currentIsOpened && !isBuzzerAlarmActive) {
    if (millis() - doorOpenedTime > config.doorOpenLimit) {
      isBuzzerAlarmActive = true;
      display("Peringatan!", "Tutup Pintu");
    }
  }

  if (isBuzzerAlarmActive) {
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 500) {
      lastBlink = millis();
      digitalWrite(config.buzzerPin, !digitalRead(config.buzzerPin));
    }
  }
}

/**
 * INPUT HANDLERS
 * Pemrosesan interaksi pengguna melalui Keypad dan RFID.
 */
void handleKeypad() {
  char key = keypad.getKey();
  if (!key)
    return;

  switch (key) {
  case 'A':
    if (!isRfidCaptureMode && !isAccessGranted &&
        digitalRead(config.reedSwitchPin) != HIGH) {
      verifyFace();
      currentInputPin = "";
    }
    break;

  case 'B':
    if (!isRfidCaptureMode && !isAccessGranted &&
        digitalRead(config.reedSwitchPin) != HIGH) {
      if (currentInputPin.length() > 0)
        verifyPin(currentInputPin);
      currentInputPin = "";
    }
    break;

  case 'C':
    if (isRfidCaptureMode) {
      stopRfidCaptureMode();
    } else {
      currentInputPin = "";
      display("PIN Dihapus");
      delay(1000);
      showReadyState();
    }
    break;

  case 'D':
    if (isRfidCaptureMode) {
      stopRfidCaptureMode();
    } else {
      startRfidCaptureMode();
    }
    break;

  default:
    if (!isRfidCaptureMode && !isAccessGranted &&
        digitalRead(config.reedSwitchPin) != HIGH) {
      if (isdigit(key) && currentInputPin.length() < 8) {
        currentInputPin += key;
        display("Input PIN:", currentInputPin);
      }
    }
    break;
  }
}

void handleRFID() {
  String uid;
  if (!readRfidUid(uid)) {
    return;
  }

  if (isRfidCaptureMode) {
    capturedRfidUid = uid;
    bool isSent = sendCapturedRfidUid(capturedRfidUid);

    if (isSent) {
      display("RFID Terkirim", "Isi form admin");
      triggerBuzzer(200, 2);
    } else {
      display("RFID Gagal", "Cek server/WiFi");
      triggerBuzzer(1000, 1);
    }

    delay(1500);
    stopRfidCaptureMode();
    return;
  }

  if (isAccessGranted || digitalRead(config.reedSwitchPin) == HIGH) {
    return;
  }

  verifyRFID(uid);
}

/**
 * MAIN SETUP DAN LOOP
 * Inisialisasi awal hardware dan siklus eksekusi program.
 */
void setup() {
  Serial.begin(config.baud);
  lcd.init();
  lcd.backlight();
  display("Booting...");

  Serial.println("\n[BOOT] Starting...");
  Serial.print("[CONFIG] relayPin=");
  Serial.print(config.relayPin);
  Serial.print(" relayActiveLow=");
  Serial.println(config.relayActiveLow);

  SPI.begin(config.sck, config.miso, config.mosi, config.rfidSda);
  mfrc522.PCD_Init();

  pinMode(config.buzzerPin, OUTPUT);
  pinMode(config.reedSwitchPin, INPUT_PULLUP);
  pinMode(config.relayPin, OUTPUT);
  pinMode(21, OUTPUT);  // Test GPIO 21
  digitalWrite(config.buzzerPin, LOW);
  Serial.println("[SETUP] Applying lock state (should be LOCK)...");
  applyGateLockState(true);

  WiFi.begin(config.ssid, config.pass);
  while (WiFi.status() != WL_CONNECTED)
    delay(500);

  showReadyState();
}

void loop() {
  // TEST RELAY: toggle every 2 seconds on both GPIO 17 and GPIO 21
  static unsigned long lastToggle = 0;
  if (millis() - lastToggle > 2000) {
    lastToggle = millis();
    static bool testState = true;
    Serial.print("[TEST] Toggle: ");
    Serial.println(testState ? "ON (LOW)" : "OFF (HIGH)");
    
    // Test GPIO 17 (original relay pin)
    digitalWrite(config.relayPin, testState ? LOW : HIGH);
    Serial.println("  - GPIO 17 toggled");
    
    // Test GPIO 21 (alternative pin)
    digitalWrite(21, testState ? LOW : HIGH);
    Serial.println("  - GPIO 21 toggled");
    
    testState = !testState;
  }
  
  // Original logic commented out for testing
  // monitorGate();
  // handleKeypad();
  // handleRFID();
}

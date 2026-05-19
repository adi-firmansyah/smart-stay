#include <Arduino.h>
#include <HTTPClient.h>
#include <Keypad.h>
#include <LiquidCrystal_I2C.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <SPI.h>
#include <WiFi.h>
#include <Wire.h>


// ============================================================================
// CONFIGURATION
// ============================================================================

struct AppConfig {
  const char *ssid = "Adi";
  const char *pass = "12345678";
  const String urlPin            = "http://10.80.224.73:8000/verification/pin";
  const String urlFace           = "http://10.80.224.73:8000/verification/face";
  const String urlRfid           = "http://10.80.224.73:8000/verification/rfid";
  const String urlRfidCapture    = "http://10.80.224.73:8000/verification/rfid/capture";
  const String urlResidentsCache = "http://10.80.224.73:8000/residents/device/cache";
  const String urlAccessLogSync  = "http://10.80.224.73:8000/access-logs/sync";
  const String urlGateStatus     = "http://10.80.224.73:8000/gate/status";

  static const uint8_t rfidSda = 5, rfidRst = 4, sck = 18, miso = 19, mosi = 23;
  static const uint8_t lcdAddr = 0x27, lcdCols = 16, lcdRows = 2;
  static const uint8_t rows = 4, cols = 4;

  const char    keys[rows][cols]  = {{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};
  const uint8_t rowPins[rows]     = {13, 12, 14, 27};
  const uint8_t colPins[cols]     = {26, 25, 33, 32};

  static const uint8_t  buzzerPin = 2, reedSwitchPin = 15, relayPin = 17, doorExitPin = 16;
  static const uint16_t doorOpenLimit = 10000;
};


// ============================================================================
// DATA STRUCTURES
// ============================================================================

struct ResidentCacheItem {
  String residentId;
  String rfidCode;
  String pin;
};

struct OfflineLogItem {
  int    sourceLogId = 0;
  String residentId;
  String method;
  bool   granted    = false;
  int    similarity = 0;
};


// ============================================================================
// GLOBAL STATE
// ============================================================================

AppConfig config;
LiquidCrystal_I2C lcd(config.lcdAddr, config.lcdCols, config.lcdRows);
MFRC522   mfrc522(config.rfidSda, config.rfidRst);
Keypad    keypad = Keypad(makeKeymap(config.keys), (byte *)config.rowPins, (byte *)config.colPins, config.rows, config.cols);
Preferences prefs;

static const uint8_t maxResidentCache = 32;
static const uint8_t maxPendingLogs   = 24;

ResidentCacheItem residentCache[maxResidentCache];
uint8_t           residentCacheCount = 0;

OfflineLogItem pendingLogs[maxPendingLogs];
uint8_t        pendingLogCount  = 0;
int            nextOfflineLogId = 1;

String currentInputPin      = "";
String deviceId             = "";
bool   isAccessGranted      = false;
bool   isBuzzerAlarmActive  = false;
bool   serverOnline         = false;
bool   isRfidCaptureMode    = false;

unsigned long doorOpenedTime        = 0;
unsigned long lastServerCheck       = 0;
unsigned long lastSyncAttempt       = 0;
unsigned long rfidCaptureStartedAt  = 0;


// ============================================================================
// FORWARD DECLARATIONS
// ============================================================================

void saveResidentCache();
void savePendingLogs();
bool syncPendingLogsToServer();
void showReadyState();


// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Pads or truncates a string to exactly `width` characters.
 */
String padDisplay(String text, uint8_t width = 16) {
  while (text.length() < width) text += " ";
  if (text.length() > width) text = text.substring(0, width);
  return text;
}

/**
 * Normalizes a string: trim whitespace and convert to uppercase.
 */
String normalizeValue(String value) {
  value.trim();
  value.toUpperCase();
  return value;
}

/**
 * Splits a pipe-delimited record into `partCount` parts.
 * Returns false if the record has fewer separators than expected.
 */
bool splitRecord(const String &record, String parts[], uint8_t partCount) {
  int start = 0;
  for (uint8_t i = 0; i < partCount; i++) {
    int sep = record.indexOf('|', start);
    if (i == partCount - 1) { parts[i] = record.substring(start); return true; }
    if (sep < 0) return false;
    parts[i] = record.substring(start, sep);
    start = sep + 1;
  }
  return true;
}

/**
 * Generates a unique device ID based on the ESP32 eFuse MAC address.
 */
String makeDeviceId() {
  uint64_t mac = ESP.getEfuseMac();
  char buf[24];
  snprintf(buf, sizeof(buf), "esp32-%04X%08X", (uint16_t)(mac >> 32), (uint32_t)mac);
  return String(buf);
}


// ============================================================================
// DISPLAY & BUZZER
// ============================================================================

/**
 * Clears the LCD and writes up to two lines of text.
 */
void display(const char *line1, const char *line2 = nullptr) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(padDisplay(String(line1)));
  if (line2) {
    lcd.setCursor(0, 1);
    lcd.print(padDisplay(String(line2)));
  }
}

/**
 * Beeps the buzzer `repeat` times, each lasting `durationMs` ms,
 * with `gap` ms between beeps.
 */
void triggerBuzzer(uint16_t durationMs, uint8_t repeat, uint16_t gap = 100) {
  for (uint8_t i = 0; i < repeat; i++) {
    digitalWrite(config.buzzerPin, HIGH);
    delay(durationMs);
    digitalWrite(config.buzzerPin, LOW);
    if (i < repeat - 1) delay(gap);
  }
}

/**
 * Shows the idle/ready state on the LCD based on current system state.
 */
void showReadyState() {
  if (isRfidCaptureMode) {
    display("RFID CAPTURE", "Tap kartu sekarang");
    return;
  }
  bool doorIsOpen = isAccessGranted || digitalRead(config.reedSwitchPin) == HIGH;
  display(doorIsOpen ? "KUNCI: TERBUKA" : "KUNCI: TERKUNCI",
          serverOnline ? "A:FACE" : "B:PIN C:CLEAR");
}


// ============================================================================
// SERVER STATE
// ============================================================================

void setServerOffline() { serverOnline = false; }
void setServerOnline()  { serverOnline = true;  }

/**
 * Checks whether WiFi is connected; shows an error and beeps if not.
 */
bool isNetworkReady() {
  if (WiFi.status() != WL_CONNECTED) {
    display("WiFi TERPUTUS");
    triggerBuzzer(1000, 1);
    return false;
  }
  return true;
}


// ============================================================================
// RESIDENT CACHE — STORAGE
// ============================================================================

/**
 * Parses a newline-delimited text payload into the resident cache array.
 * Expected line format: residentId|rfidCode|pin|dummy
 */
void loadResidentCacheFromText(String payload) {
  residentCacheCount = 0;
  payload.replace("\r", "");
  payload.trim();

  int start = 0;
  while (start < (int)payload.length() && residentCacheCount < maxResidentCache) {
    int    end  = payload.indexOf('\n', start);
    String line = (end >= 0) ? payload.substring(start, end) : payload.substring(start);
    line.trim();

    if (line.length() > 0) {
      String parts[4];
      if (splitRecord(line, parts, 4)) {
        residentCache[residentCacheCount].residentId = parts[0];
        residentCache[residentCacheCount].rfidCode   = normalizeValue(parts[1]);
        residentCache[residentCacheCount].pin        = parts[2];
        residentCacheCount++;
      }
    }

    if (end < 0) break;
    start = end + 1;
  }
}

void loadResidentCacheFromPrefs() {
  String raw = prefs.getString("resident_cache", "");
  if (raw.length() > 0) loadResidentCacheFromText(raw);
}

void saveResidentCache() {
  String raw = "";
  for (uint8_t i = 0; i < residentCacheCount; i++) {
    if (i > 0) raw += "\n";
    raw += residentCache[i].residentId + "|" +
           residentCache[i].rfidCode   + "|" +
           residentCache[i].pin        + "|0";
  }
  prefs.putString("resident_cache", raw);
}


// ============================================================================
// OFFLINE LOG — STORAGE
// ============================================================================

void loadPendingLogsFromPrefs() {
  pendingLogCount = 0;
  String raw = prefs.getString("pending_logs", "");
  raw.replace("\r", "");
  raw.trim();

  int start = 0;
  while (start < (int)raw.length() && pendingLogCount < maxPendingLogs) {
    int    end  = raw.indexOf('\n', start);
    String line = (end >= 0) ? raw.substring(start, end) : raw.substring(start);
    line.trim();

    if (line.length() > 0) {
      String parts[5];
      if (splitRecord(line, parts, 5)) {
        pendingLogs[pendingLogCount].sourceLogId = parts[0].toInt();
        pendingLogs[pendingLogCount].residentId  = parts[1];
        pendingLogs[pendingLogCount].method      = parts[2];
        pendingLogs[pendingLogCount].granted     = (parts[3] == "1");
        pendingLogs[pendingLogCount].similarity  = parts[4].toInt();
        pendingLogCount++;
      }
    }

    if (end < 0) break;
    start = end + 1;
  }

  nextOfflineLogId = prefs.getInt("next_log_id", 1);
  if (nextOfflineLogId < 1) nextOfflineLogId = 1;
}

void savePendingLogs() {
  String raw = "";
  for (uint8_t i = 0; i < pendingLogCount; i++) {
    if (i > 0) raw += "\n";
    raw += String(pendingLogs[i].sourceLogId) + "|" +
           pendingLogs[i].residentId          + "|" +
           pendingLogs[i].method              + "|" +
           (pendingLogs[i].granted ? "1" : "0") + "|" +
           String(pendingLogs[i].similarity);
  }
  prefs.putString("pending_logs", raw);
  prefs.putInt("next_log_id", nextOfflineLogId);
}

/**
 * Appends a new log entry to the pending queue.
 * Drops the oldest entry if the queue is full.
 */
void enqueueOfflineLog(const String &residentId, const String &method, bool granted, int similarity) {
  if (pendingLogCount >= maxPendingLogs) {
    for (uint8_t i = 1; i < pendingLogCount; i++) pendingLogs[i - 1] = pendingLogs[i];
    pendingLogCount--;
  }
  pendingLogs[pendingLogCount] = {nextOfflineLogId++, residentId, method, granted, similarity};
  pendingLogCount++;
  savePendingLogs();
}


// ============================================================================
// RESIDENT LOOKUP
// ============================================================================

bool findResidentByPin(const String &pin, ResidentCacheItem &out) {
  for (uint8_t i = 0; i < residentCacheCount; i++) {
    if (residentCache[i].pin == pin) { out = residentCache[i]; return true; }
  }
  return false;
}

bool findResidentByRfid(const String &uid, ResidentCacheItem &out) {
  String normalized = normalizeValue(uid);
  if (normalized.length() == 0) return false;
  for (uint8_t i = 0; i < residentCacheCount; i++) {
    if (residentCache[i].rfidCode.length() > 0 && residentCache[i].rfidCode == normalized) {
      out = residentCache[i];
      return true;
    }
  }
  return false;
}


// ============================================================================
// ACCESS CONTROL — GRANT / DENY
// ============================================================================

void grantLocalAccess(const String &line2) {
  isAccessGranted = true;
  digitalWrite(config.relayPin, LOW);
  display("AKSES DISETUJUI", line2.c_str());
  triggerBuzzer(200, 3, 100);
}

void denyLocalAccess(const String &line2) {
  display("AKSES DITOLAK", line2.c_str());
  triggerBuzzer(800, 2, 150);
}


// ============================================================================
// NETWORK — HTTP HELPERS
// ============================================================================

/**
 * Fetches resident cache from the server and refreshes local storage.
 * Returns true on success (HTTP 200 with non-empty body).
 */
bool fetchResidentCacheFromServer() {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(config.urlResidentsCache);
  int    code    = http.GET();
  String payload = (code == 200) ? http.getString() : "";
  http.end();
  if (code == 200 && payload.length() > 0) {
    loadResidentCacheFromText(payload);
    saveResidentCache();
    return true;
  }
  return false;
}

/**
 * Sends the pending offline log queue to the server in a single batch request.
 * Clears the queue on success (HTTP 200).
 */
bool syncPendingLogsToServer() {
  if (!serverOnline || pendingLogCount == 0 || WiFi.status() != WL_CONNECTED) return false;

  String payload = "{\"items\":[";
  for (uint8_t i = 0; i < pendingLogCount; i++) {
    if (i > 0) payload += ",";
    payload += "{\"source_device_id\":\"" + deviceId + "\",";
    payload += "\"source_log_id\":"        + String(pendingLogs[i].sourceLogId)             + ",";
    payload += "\"resident_id\":"          + (pendingLogs[i].residentId.length() > 0 ? "\"" + pendingLogs[i].residentId + "\"" : "null") + ",";
    payload += "\"method\":\""             + pendingLogs[i].method                          + "\",";
    payload += "\"granted\":"              + (pendingLogs[i].granted ? "true" : "false")    + ",";
    payload += "\"similarity\":"           + String(pendingLogs[i].similarity)              + ",";
    payload += "\"image_path\":null}";
  }
  payload += "]}";

  HTTPClient http;
  http.begin(config.urlAccessLogSync);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int    code     = http.POST(payload);
  String response = (code > 0) ? http.getString() : "";
  http.end();

  if (code == 200) {
    pendingLogCount = 0;
    savePendingLogs();
    return true;
  }

  if (code <= 0 || response.indexOf("failed") >= 0) setServerOffline();
  return false;
}

/**
 * Reports the gate lock/unlock status to the server and drives the relay accordingly.
 */
void updateGateStatus(bool isLocked) {
  if (!isNetworkReady()) return;
  digitalWrite(config.relayPin, isLocked ? HIGH : LOW);
  HTTPClient http;
  http.begin(config.urlGateStatus);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);
  http.PATCH("{\"is_locked\": " + String(isLocked ? "true" : "false") + "}");
  http.end();
}

/**
 * Sends a captured RFID UID to the backend for registration.
 */
bool sendCapturedRfidToBackend(const String &uid) {
  if (WiFi.status() != WL_CONNECTED) { setServerOffline(); return false; }
  HTTPClient http;
  http.begin(config.urlRfidCapture);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int code = http.POST("{\"rfid_code\": \"" + normalizeValue(uid) + "\"}");
  http.end();
  return (code == 200);
}

/**
 * Refreshes server connectivity by fetching the resident cache.
 * If successful, also attempts to sync any pending offline logs.
 */
void refreshServerState() {
  if (WiFi.status() != WL_CONNECTED) { setServerOffline(); return; }
  if (fetchResidentCacheFromServer()) {
    setServerOnline();
    if (pendingLogCount > 0) syncPendingLogsToServer();
  } else {
    setServerOffline();
  }
}


// ============================================================================
// RFID CAPTURE MODE
// ============================================================================

void startRfidCaptureMode() {
  isRfidCaptureMode      = true;
  rfidCaptureStartedAt   = millis();
  currentInputPin        = "";
  display("BACA RFID", "Tap kartu...");
}

void stopRfidCaptureMode(const char *line1 = nullptr, const char *line2 = nullptr) {
  isRfidCaptureMode    = false;
  rfidCaptureStartedAt = 0;
  if (line1) { display(line1, line2); delay(1200); }
  showReadyState();
}


// ============================================================================
// VERIFICATION — ONLINE (FACE) & OFFLINE (PIN / RFID)
// ============================================================================

void verifyFaceOnline() {
  display("Verifikasi Wajah");
  if (!isNetworkReady()) { setServerOffline(); return; }

  HTTPClient http;
  http.begin(config.urlFace);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int    code    = http.POST("{}");
  String payload = (code > 0) ? http.getString() : "";
  http.end();

  if (code <= 0) { setServerOffline(); showReadyState(); return; }

  String compact = payload;
  compact.replace(" ", "");

  if (compact.indexOf("\"granted\":true") >= 0) {
    isAccessGranted = true;
    display("AKSES DISETUJUI", "Wajah OK");
    triggerBuzzer(200, 3, 100);
    updateGateStatus(false);
  } else {
    display("AKSES DITOLAK", "Wajah tidak cocok");
    triggerBuzzer(800, 2, 150);
  }

  delay(2000);
  showReadyState();
}

void verifyPinOffline(const String &pin) {
  ResidentCacheItem resident;
  if (findResidentByPin(pin, resident)) {
    enqueueOfflineLog(resident.residentId, "PIN", true, 100);
    grantLocalAccess("PIN OK");
  } else {
    enqueueOfflineLog("", "PIN", false, 0);
    denyLocalAccess("PIN salah");
  }
  delay(800);
  showReadyState();
}

void verifyRFIDOffline(const String &uid) {
  String normalized = normalizeValue(uid);
  if (normalized.length() == 0) { showReadyState(); return; }

  ResidentCacheItem resident;
  if (findResidentByRfid(normalized, resident)) {
    enqueueOfflineLog(resident.residentId, "RFID", true, 100);
    grantLocalAccess("RFID OK");
  } else {
    enqueueOfflineLog("", "RFID", false, 0);
    denyLocalAccess("Kartu tidak dikenal");
  }
  delay(800);
  showReadyState();
}


// ============================================================================
// HARDWARE MONITORS — GATE, KEYPAD, RFID, EXIT BUTTON
// ============================================================================

/**
 * Monitors the reed switch to detect door open/close events,
 * and activates the alarm buzzer if the door stays open too long.
 */
void monitorGate() {
  static int           lastState     = -1;
  static unsigned long alarmStartTime = 0;

  bool doorIsOpen = (digitalRead(config.reedSwitchPin) == HIGH);

  if ((int)doorIsOpen != lastState) {
    lastState = (int)doorIsOpen;

    if (doorIsOpen) {
      display("PINTU TERBUKA");
      doorOpenedTime = millis();
      isAccessGranted = false;
      alarmStartTime  = 0;
    } else {
      doorOpenedTime     = 0;
      isBuzzerAlarmActive = false;
      digitalWrite(config.buzzerPin, LOW);
      if (!isAccessGranted) {
        display("PINTU TERKUNCI");
        updateGateStatus(true);
        delay(400);
        showReadyState();
      }
    }
  }

  if (doorIsOpen && doorOpenedTime > 0 && !isBuzzerAlarmActive) {
    if (millis() - doorOpenedTime > config.doorOpenLimit) {
      isBuzzerAlarmActive = true;
      alarmStartTime      = millis();
      display("ALARM! TUTUP!!");
    }
  }

  if (isBuzzerAlarmActive && alarmStartTime > 0) {
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 400) {
      lastBlink = millis();
      digitalWrite(config.buzzerPin, !digitalRead(config.buzzerPin));
    }
  }
}

/**
 * Handles keypad input for PIN entry, face verification trigger,
 * RFID capture mode, and PIN clear.
 */
void handleKeypad() {
  if (isAccessGranted || digitalRead(config.reedSwitchPin) == HIGH) return;

  char key = keypad.getKey();
  if (!key) return;

  triggerBuzzer(50, 1);

  if (key == 'D' && !isRfidCaptureMode) { startRfidCaptureMode(); return; }

  if (isRfidCaptureMode) {
    if (key == 'C') { display("BATAL", "Capture dibatalkan"); delay(300); stopRfidCaptureMode(); }
    else              { display("RFID CAPTURE", "Tekan C untuk batal"); }
    return;
  }

  if (serverOnline) {
    if (key == 'A') { currentInputPin = ""; verifyFaceOnline(); }
    else            { display("SERVER ONLINE", "FACE ONLY"); delay(400); showReadyState(); }
    return;
  }

  if (key == 'A') {
    currentInputPin = "";
    display("FACE OFFLINE", "PIN RFID READY");
    delay(400);
    showReadyState();
  } else if (key == 'B') {
    if (currentInputPin.length() >= 4) {
      verifyPinOffline(currentInputPin);
    } else {
      display("PIN minimal 4");
      triggerBuzzer(300, 1);
      delay(400);
      showReadyState();
    }
    currentInputPin = "";
  } else if (key == 'C') {
    currentInputPin = "";
    display("PIN DIHAPUS");
    delay(400);
    showReadyState();
  } else if (isdigit(key) && currentInputPin.length() < 8) {
    currentInputPin += key;
    display(("PIN: " + currentInputPin).c_str());
  }
}

/**
 * Reads RFID cards for offline verification or RFID capture mode.
 * In capture mode, times out after 30 seconds of inactivity.
 */
void handleRFID() {
  if (isAccessGranted || digitalRead(config.reedSwitchPin) == HIGH) return;

  if (isRfidCaptureMode && rfidCaptureStartedAt > 0 &&
      millis() - rfidCaptureStartedAt > 30000) {
    display("WAKTU HABIS", "Capture timeout.");
    delay(300);
    stopRfidCaptureMode();
    return;
  }

  if (!isRfidCaptureMode) {
    if (serverOnline) return;
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
      String uid = "";
      for (uint8_t i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
        uid += String(mfrc522.uid.uidByte[i], HEX);
      }
      mfrc522.PICC_HaltA();
      mfrc522.PCD_StopCrypto1();
      verifyRFIDOffline(uid);
    }
    return;
  }

  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String uid = "";
    for (uint8_t i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
      uid += String(mfrc522.uid.uidByte[i], HEX);
    }
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    display("UID DITERIMA", uid.c_str());
    triggerBuzzer(100, 2);
    delay(200);

    if (sendCapturedRfidToBackend(uid)) stopRfidCaptureMode("KIRIM SUKSES", "Ke server.");
    else                                stopRfidCaptureMode("KIRIM GAGAL",  "Offline?");
  }
}

/**
 * Handles the interior door exit button (INPUT_PULLUP: LOW = pressed).
 */
void handleDoorExit() {
  if (isAccessGranted || digitalRead(config.doorExitPin) == LOW) return;

  enqueueOfflineLog("", "EXIT", true, 100);
  isAccessGranted = true;
  digitalWrite(config.relayPin, LOW);
  display("EXIT: TERBUKA", "Kunci terbuka");
  triggerBuzzer(200, 2, 100);

  if (serverOnline) updateGateStatus(false);

  delay(200);
  showReadyState();
}


// ============================================================================
// INITIALIZATION & MAIN LOOP
// ============================================================================

void setup() {
  Serial.begin(115200);
  prefs.begin("smartstay", false);
  deviceId = makeDeviceId();

  loadResidentCacheFromPrefs();
  loadPendingLogsFromPrefs();

  lcd.init();
  lcd.backlight();
  display("  SISTEM SIAP  ");

  SPI.begin(config.sck, config.miso, config.mosi, config.rfidSda);
  mfrc522.PCD_Init();

  pinMode(config.buzzerPin,    OUTPUT);
  pinMode(config.reedSwitchPin, INPUT_PULLUP);
  pinMode(config.relayPin,     OUTPUT);
  pinMode(config.doorExitPin,  INPUT_PULLUP);
  digitalWrite(config.buzzerPin, LOW);
  digitalWrite(config.relayPin,  HIGH);

  display("Koneksi WiFi...");
  WiFi.begin(config.ssid, config.pass);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 15000) {
    delay(250);
    triggerBuzzer(50, 1);
  }

  if (WiFi.status() == WL_CONNECTED) {
    refreshServerState();
    display("KUNCI: TERKUNCI", serverOnline ? "Online: A:FACE" : "Offline: B:PIN");
    delay(800);
  } else {
    setServerOffline();
  }

  showReadyState();
  triggerBuzzer(100, 2, 100);
}

void loop() {
  // Refresh server state every 30 seconds to minimize blocking HTTP in main loop
  if (millis() - lastServerCheck > 30000) {
    lastServerCheck      = millis();
    bool prevOnline      = serverOnline;
    refreshServerState();
    if (serverOnline != prevOnline) showReadyState();
  }

  // Attempt log sync every 10 seconds when online and queue is non-empty
  if (serverOnline && pendingLogCount > 0 && millis() - lastSyncAttempt > 10000) {
    lastSyncAttempt = millis();
    syncPendingLogsToServer();
  }

  monitorGate();
  handleDoorExit();
  handleKeypad();
  handleRFID();
}

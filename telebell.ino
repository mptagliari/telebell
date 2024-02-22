#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <EEPROM.h>
#include <Crypto.h>
#include <SHA256.h>
#include <Arduino.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <FS.h>


// Define constants for EEPROM addresses
#define SSID_ADDRESS 0
#define SALT_ADDRESS (SSID_ADDRESS + 32)
#define PASSWORD_HASH_ADDRESS (SALT_ADDRESS + 16)
#define BOT_TOKEN_ADDRESS (PASSWORD_HASH_ADDRESS + 32)
#define CHAT_ID_ADDRESS (BOT_TOKEN_ADDRESS + 32)
#define USERNAME_ADDRESS (CHAT_ID_ADDRESS + 32)
#define PASSWORD_ADDRESS (USERNAME_ADDRESS + 16)
#define NTP_SERVER1_ADDRESS (PASSWORD_ADDRESS + 16)
#define NTP_SERVER2_ADDRESS (NTP_SERVER1_ADDRESS + 32)
#define FLAG_ADDRESS (NTP_SERVER2_ADDRESS + 32)
#define PUSHBULLET_API_KEY_ADDRESS (FLAG_ADDRESS + 32)
#define CONFIG_SSID_NAME "MyConfigNetwork"
#define MAGIC_NUMBER 0xDEADBEEF

const int eepromSize = 512;

// Declarations for GPIO pins
const int shortcutPin1 = 4;  // Assign the appropriate GPIO pin number
const int shortcutPin2 = 5;  // Assign the appropriate GPIO pin number

const int PORT = 80; // Change as needed

struct FileData {
  const char* path;
  const char* contentType;
};

// Define the files and their content types
FileData files[] = {
  { "/index.html", "text/html" },
  { "/script.js", "application/javascript" },
  { "/styles.css", "text/css" }
};



struct Config {
  char ssid[32];
  char password[16];
  char botToken[32];
  char chatId[32];
  char username[16];
  char guiPassword[16];
  char ntpServer1[32];
  char ntpServer2[32];
};

ESP8266WebServer server(PORT);
Config initConf;

WiFiUDP ntpUDP;

unsigned long updateInterval;
unsigned long intervalUnit;

NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 0); 

void serveFile(const char* path, const char* contentType) {
  File file = SPIFFS.open(path, "r");

  if (!file) {
    server.send(500, "text/plain", "Internal Server Error");
    return;
  }

  server.streamFile(file, contentType);
  file.close();
}

void updateNtpServers(const char *ntpServer1, const char *ntpServer2) {
  EEPROM.put(NTP_SERVER1_ADDRESS, ntpServer1);
  EEPROM.put(NTP_SERVER2_ADDRESS, ntpServer2);
  EEPROM.commit();

  // Update NTP client with new servers
  timeClient = NTPClient(ntpUDP, ntpServer1, 0, updateInterval * intervalUnit);
  timeClient.begin();
  timeClient.forceUpdate();  // Force an immediate update
}

void connectToWiFi(Config &conf) {
  Serial.println("Starting initial setup...");
  WiFi.begin(conf.ssid, conf.password);
  Serial.println("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting...");
  }
  Serial.println("Connected to WiFi. IP address: " + WiFi.localIP().toString());
}

void saveConfig(Config &conf) {
  EEPROM.put(SSID_ADDRESS, conf.ssid);
  EEPROM.put(NTP_SERVER1_ADDRESS, conf.ntpServer1);
  EEPROM.put(NTP_SERVER2_ADDRESS, conf.ntpServer2);

  // Generate a random salt for each password
  uint8_t salt[32];
  for (int i = 0; i < sizeof(salt); i++) {
    salt[i] = random(256);
  }
  EEPROM.put(SALT_ADDRESS, salt);

  // Hash the password with SHA-256 and store the hash
  SHA256 sha256;
  sha256.update(salt, sizeof(salt));
  sha256.update((uint8_t *)conf.password, strlen(conf.password));
  uint8_t hash[32];
  sha256.finalize(hash, sizeof(hash));
  EEPROM.put(PASSWORD_HASH_ADDRESS, hash);

  // Store the bot token and chat ID
  EEPROM.put(BOT_TOKEN_ADDRESS, conf.botToken);
  EEPROM.put(CHAT_ID_ADDRESS, conf.chatId);

  // Store the flag
  EEPROM.put(FLAG_ADDRESS, MAGIC_NUMBER);

  EEPROM.commit();
}

bool loadConfig(Config &conf) {
  EEPROM.get(SSID_ADDRESS, conf.ssid);
  EEPROM.get(NTP_SERVER1_ADDRESS, conf.ntpServer1);
  EEPROM.get(NTP_SERVER2_ADDRESS, conf.ntpServer2);

  uint8_t salt[32];
  EEPROM.get(SALT_ADDRESS, salt);

  uint8_t hash[32];
  EEPROM.get(PASSWORD_HASH_ADDRESS, hash);

  SHA256 sha256;
  sha256.update(salt, sizeof(salt));
  sha256.update((uint8_t *)conf.password, strlen(conf.password));
  uint8_t newHash[32];
  sha256.finalize(newHash, sizeof(newHash));

  if (memcmp(hash, newHash, sizeof(hash)) != 0) {
    return false;
  }

  // Load the bot token and chat ID
  EEPROM.get(BOT_TOKEN_ADDRESS, conf.botToken);
  EEPROM.get(CHAT_ID_ADDRESS, conf.chatId);

  // Load the flag
  uint32_t magicNumber = EEPROM.get(FLAG_ADDRESS, magicNumber);

  return (magicNumber == MAGIC_NUMBER);
}

bool checkEepromFlag() {
  EEPROM.begin(eepromSize);
  uint32_t magicNumber = EEPROM.get(FLAG_ADDRESS, magicNumber);

  return (magicNumber == MAGIC_NUMBER);
}

void initSetup() {
  if (!loadConfig(initConf) || !checkEepromFlag()) {
    Serial.println("Starting initial setup");

    // Start the configuration network
    WiFi.softAP(CONFIG_SSID_NAME, "");
    WiFi.softAPConfig(IPAddress(192, 168, 4, 1), IPAddress(192, 168, 4, 1), IPAddress(255, 255, 255, 0));

    EEPROM.begin(eepromSize);
    loadConfig(initConf);

    if (checkEepromFlag()) {
      server.on("/", HTTP_GET, handleRoot);
      server.on("/setup", HTTP_POST, handleSave);
      server.begin();
      Serial.println("Web server started for setup");
    } else {
      Serial.println("Normal mode. Web server not started.");
    }
  }
}

void handleRoot() {
   serveFile("/index.html", "text/html");
   serveFile("/script.js", "application/javascript");
   serveFile("/styles.css", "text/css");
}

void handleSave() {
  bool isCheckboxChecked = server.hasArg("checkBox") && server.arg("checkBox") == "on";
  String ssid = server.arg("ssid");
  String password = server.arg("password");
  String botToken = server.arg("botToken");
  String chatId = server.arg("chatId");
  String ntpServer1 = server.arg("ntpServer1");
  String ntpServer2 = server.arg("ntpServer2");
  String updateNtp1 = server.arg("updateNtp1");
  String updateNtp2 = server.arg("updateNtp2");
  String updateInterval = server.arg("updateInterval");
  unsigned long updateInterval = updateIntervalStr.toInt();
  if (isCheckboxChecked) {
    // The checkbox is checked, get values frominput fields
    String updateNtp1 = server.arg("updateNtp1");
    String updateNtp2 = server.arg("updateNtp2");
    String updateInterval = server.arg ("updateInterval");
    String intervalUnit = server.arg("intervalUnit");

    // Update NTP servers
    updateNtpServers(updateNtp1.c_str(), updateNtp2.c_str());
    server.send(200, "text/plain", "Settings and NTP servers updated. Please reboot the device.");
  } else {
    // The checkbox is not checked, send default content to the client
    String defaultDateTime = getCurrentDateTime(); // Implement a function to get current date and time
    server.send(200, "text/plain", "Settings saved. Please reboot the device.|" + defaultDateTime);
  }
    // Update configuration
  strncpy(initConf.ssid, ssid.c_str(), sizeof(initConf.ssid));
  strncpy(initConf.password, password.c_str(), sizeof(initConf.password));
  strncpy(initConf.botToken, botToken.c_str(), sizeof(initConf.botToken));
  strncpy(initConf.chatId, chatId.c_str(), sizeof(initConf.chatId));
  strncpy(initConf.ntpServer1, ntpServer1.c_str(), sizeof(initConf.ntpServer1));
  strncpy(initConf.ntpServer2, ntpServer2.c_str(), sizeof(initConf.ntpServer2));
  
  // Save configuration to file
  saveConfig(initConf);

}

void saveConfig(Configuration &config) {
  File configFile = SPIFFS.open("/config.json", "w");
  if (!configFile) {
    Serial.println("Failed to open config file for writing");
    return;
  }

  // Serialize configuration to JSON and write to file
  serializeJson(config, configFile);
  configFile.close();
}

void updateNtpServers(const char *ntpServer1, const char *ntpServer2) {
  // Update NTP servers if provided
  if (ntpServer1 && strlen(ntpServer1) > 0) {
    // Update NTP server 1
  }
  if (ntpServer2 && strlen(ntpServer2) > 0) {
    // Update NTP server 2
  }
}


void setup() {
  Serial.begin(115200);
   // Mount the file system
   if (SPIFFS.begin()) {
    Serial.println("File system mounted successfully");
    return;
  }else {
    Serial.println("An Error has occurred while mounting SPIFFS");
  }
  randomSeed(analogRead(0));

  EEPROM.begin(eepromSize);
  bool flag = checkEepromFlag();

  if (!flag) {
    Serial.println("EEPROM flag is not set. Setting initial value.");
    EEPROM.put(FLAG_ADDRESS, MAGIC_NUMBER);
    EEPROM.commit();
  }

  pinMode(shortcutPin1, INPUT_PULLUP);
  pinMode(shortcutPin2, INPUT_PULLUP);

  initSetup();
  timeClient.begin(); // Initialize the NTP client
}

void loop() {
  server.handleClient();

  if (!checkEepromFlag()) {
    connectToWiFi(initConf);
    timeClient.update(); // Update the NTP client
  }

  if (digitalRead(shortcutPin1) == LOW && digitalRead(shortcutPin2) == LOW) {
    Serial.println("Shortcut buttons pressed. Sending message.");
    sendMessageToTelegram("Hello from the ESP8266!");
  }
}

void sendMessageToTelegram(const char *message) {
  // Read the bot token and chat ID from the EEPROM
  char botToken[32];
  char chatId[32];
  EEPROM.get(BOT_TOKEN_ADDRESS, botToken);
  EEPROM.get(CHAT_ID_ADDRESS, chatId);

  // Construct the URL
  String url = "https://api.telegram.org/bot" + String(botToken) + "/sendMessage?chat_id=" + String(chatId) + "&text=" + String(message);

  // Send the request
  WiFiClient client;
  HTTPClient http;
  http.begin(client, url.c_str());
  int httpCode = http.GET();

  // Check the response code
  if (httpCode > 0) {
    Serial.println("Message sent successfully");
  } else {
    Serial.println("Error sending message");
  }

  // Close the connection
  http.end();
}
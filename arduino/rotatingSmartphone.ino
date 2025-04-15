#include <M5Stack.h>
#include <WiFi.h>       // Wi-Fi接続用
#include <WebServer.h>  // サーバー設定用
#include <ESPmDNS.h>    // ドメインネームでIPアドレス取得用

// 変数宣言
// bool state = false; // ボタン状態保持用

// Wi-Fiローカル接続先設定
const char ssid[] = "later";  // 接続先SSID
const char pass[] = "later"; // 接続先パスワード
const char mdnsName[] = "m5stack";  // mDNS Name（mdnsName.localで接続可能）

// サーバー設定ポート80で接続
WebServer server(80);

/******************サーバーリクエスト時処理関数 ******************/
// ルートアクセス時の応答関数
void handleRoot() {
  server.send(200, "text/html", html);  //レスポンス200を返しhtml送信
}
// エラー（Webページが見つからない）時の応答関数
void handleNotFound() {
  server.send(404, "text/plain", "404 Not Found!");  //text送信
}
// ブラウザONボタン処理
void btnOn() {
  // digitalWrite(BLUE_LED_PIN, HIGH); // 本体LED点灯
  digitalWrite(26, HIGH);      // 外部出力ON
  // Serial.println("get:/get/btn_on");
  server.send(200, "text/plain", 'on');  //レスポンス200を返しhtml送信
}
// ブラウザOFFボタン処理
void btnOff() {
  // digitalWrite(BLUE_LED_PIN, LOW);  // 本体LED消灯
  digitalWrite(26, LOW);       // 外部出力OFF
  // Serial.println("get:/get/btn_off");
  server.send(200, "text/plain", "off");  //レスポンス200を返しhtml送信
}


void setup()
{
    M5.begin();             // Init M5Stack.  初始化M5Stack
    M5.Power.begin();       // Init power  初始化电源模块
    M5.Lcd.setTextSize(2);  // Set the text size to 2.  设置文字大小为2
    M5.Lcd.setCursor(85, 0);
  // Wi-Fi接続開始
  while (WiFi.localIP()[0] == 0) { // IPアドレスが取得されるまで繰り返し
    WiFi.begin(ssid, pass);        //ローカル Wi-Fi接続実行
    //delay(3000); // 再接続待ち
    for(int i=0;i<6;i++){
      Serial.print(".");
      delay(500); // 再接続待ち
    }
    Serial.println();
  }

  // mDNS設定（mdnsName.localでアクセス）
  MDNS.begin(mdnsName);

  // 接続情報シリアル出力表示
  M5.Lcd.println("IP:");
  M5.Lcd.println(WiFi.localIP());       // IPアドレス（配列）表示
  M5.Lcd.printf("mDNS:%S\n", mdnsName); // mDNS名表示
  // サーバー設定
  server.on("/", handleRoot);         //ルートアクセス時の応答関数を設定
  server.onNotFound(handleNotFound);  //Webページが見つからない時の応答関数を設定
  server.on("/on", btnOn);    //ボタンオン受信処理
  server.on("/off", btnOff);  //ボタンオフ受信処理
  server.begin();                     //Webサーバー開始


    // M5.Lcd.println(("rotate"));
    dacWrite(25, 0);      // disable the speak noise.  禁用喇叭
    pinMode(26, OUTPUT);  // Set pin 26 to output mode.  设置26号引脚为输出模式

}

void loop()
{
  M5.update(); // M5Stackの状態更新
  server.handleClient(); // クライアント接続待ち
  // Serial.println("loop");
  delay(100);
}

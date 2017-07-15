# 概要
node.js + socket.io + web audio apiを用いて接続したクライアントで音をだすやつです

# 使い方(2017年5月14日時点)
## 基本の使用方法
- 各機能のコマンドをキーボード入力し、ENTERを押下します。
- キーボード入力内容は接続されたクライアントに表示されます（英数字のみ）
- stand aloneの場合以外は上記ですべての端末が機能発火します

## 発音の制御
 機能 | 概要 | 操作方法
----- | ---- | --------
VIDEO CHAT | 各クライアントで取得した音声、画像情報をサーバに送信、サーバはランダムな宛先に送信する | CHAT or VIDEOCHAT
FEEDBACK | 各クライアントの音声入力をそのまま出力します | FEEDBACK or FEED
SINEWAVE | 入力した周波数の正弦波を出力します | （数字を入力）
WHITENOISE | ホワイトノイズを出力します | WHITENOISE or NOISE
CLICK | 電子メトロノームを模した音を出力します | CLICK
RECORD | 映像、音声の情報を最大15秒分各クライアント側でデータ保持します | RECORD or REC
PLAYBACK | RECORDにて保持した映像、音声を再生します | PLAYBACK or PLAY
LOOKBACK | 各クライアントは15秒に一度映像、音声の情報をサーバに送信しており、本コマンドにてその映像、音声を各クライアントに送信、クライアント側は再生します | LOOKBACK or LOOK
LOOPBACK | LOOKBACKをループ再生する機能 | LOOPBACK or LOOP
BASS | ベース音（音程はいくつかの選択肢からランダム）を再生します。 | B（Enterなしで発音します）
SAMPLE RATE | VIDEO CHATまたはDRUMでの再生サンプリングレートを変更します（22050Hz→44100Hz→88200Hz→11025Hzの順に変更になります） | SAMPLERATE or RATE
FILTER | VIDEO CHATまたはFEEDBACKの再生にローパスフィルタをかけており、その周波数値を変更します（200Hz→2000Hz→8000Hz→14000Hz→0Hzの順に変更になります | FILTER
STOP | 音声・映像の再生を停止します | STOP or ESCキー（ESCはEnter不要）

- 発生した音を止めるのはSTOPまたは発生時と同じコマンドを実行すれば止まります
- 前回実施したコマンドを呼び出すには上矢印キーを押下します

## stand aloneについて
- カンマキーを押下するとstand alone状態になります。戻すにはもう一度カンマキー押下
- stand alone状態では全クライアントの制御はできず、キー入力した端末のみの操作となります
- 操作方法も変わります。詳細下記

機能 | 操作方法
----- | --------
CLICK | C
BASS | B
FEEDBACK | F
WHITENOISE | W or N
SAMPLE RATE | S

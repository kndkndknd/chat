# 概要
- node.js + socket.io + web audio apiを用いて接続したクライアントで音をだすやつです

# 使い方(2022年8月13日時点)
## 基本の使用方法
- 各機能のコマンドをキーボード入力し、ENTERを押下します。
- キーボード入力内容は接続されたクライアントに表示されます（英数字のみ）
- ※TypeScript化した際に機能はいくつか削減していす

## 発音の制御
 機能 | 概要 | 操作方法
----- | ---- | --------
CHAT | 各クライアントで取得した音声、画像情報をサーバに送信、サーバはランダムな宛先に送信・再生する | CHAT
FEEDBACK | 各クライアントの音声入力をそのまま出力します | FEEDBACK or FEED
SINEWAVE | 入力した周波数の正弦波を出力します | （数字を入力）
WHITENOISE | ホワイトノイズを出力します | WHITENOISE or NOISE
CLICK | 電子メトロノームを模した音を出力します | CLICK
RECORD | 映像、音声の情報を最大15秒分各クライアント側でデータ保持します | RECORD or REC
PLAYBACK | RECORDにて保持した映像、音声を再生します | PLAYBACK or PLAY
TIMELAPSE | 各クライアントは15秒に一度映像、音声の情報をサーバに送信しており、本コマンドにてその映像、音声を各クライアントに送信、クライアント側は再生します | TIMELAPSE
DRUM | ドラム音をサーバよりランダムな宛先に送信、再生する | DRUM
BASS | ベース音（音程はいくつかの選択肢からランダム）を再生します。 | BASS
SAMPLE RATE | VIDEO CHATまたはDRUM、PLAYBACK、TIMELAPSEでの再生サンプリングレートを変更します（22050Hz→44100Hz→88200Hz→11025Hzの順に変更になります） | SAMPLERATE or RATE
STOP | 音声・映像の再生を停止します | STOP or ESCキー（ESCはEnter不要）

- 発生した音を止めるのはSTOPまたは発生時と同じコマンドを実行すれば止まります
- 前回実施したコマンドを呼び出すには上矢印キーを押下します


## VOICE MODEについて
- VOICEと入力しEnterを押下すると該当端末はVOICE MODEになります。同じ操作を繰り返すと戻ります。
- VOICE MODE時にはすべての入力内容をEnter時に端末より発声します。


# 概要
- node.js + socket.io + web audio apiを用いて接続したクライアントで音をだすやつです

# 使い方(2017年12月25日時点)
## 基本の使用方法
- 各機能のコマンドをキーボード入力し、ENTERを押下します。
- キーボード入力内容は接続されたクライアントに表示されます（英数字のみ）
- stand aloneの場合以外は上記ですべての端末が機能発火します
- timeTable.jsonに入れた予定も時刻になると機能発火します（RECORD、TIMELAPSE以外は表示するのみ）。時刻表記はYYYY-MM-DD HH:MM

## 発音の制御
 機能 | 概要 | 操作方法
----- | ---- | --------
CHAT | 各クライアントで取得した音声、画像情報をサーバに送信、サーバはランダムな宛先に送信・再生する | CHAT or VIDEOCHAT
FEEDBACK | 各クライアントの音声入力をそのまま出力します | FEEDBACK or FEED
SINEWAVE | 入力した周波数の正弦波を出力します | （数字を入力）
WHITENOISE | ホワイトノイズを出力します | WHITENOISE or NOISE
CLICK | 電子メトロノームを模した音を出力します | CLICK
RECORD | 映像、音声の情報を最大15秒分各クライアント側でデータ保持します | RECORD or REC
PLAYBACK | RECORDにて保持した映像、音声を再生します | PLAYBACK or PLAY
TIMELAPSE | 各クライアントは15秒に一度映像、音声の情報をサーバに送信しており、本コマンドにてその映像、音声を各クライアントに送信、クライアント側は再生します |
DRUM | ドラム音をサーバよりランダムな宛先に送信、再生する | DRUM
BASS | ベース音（音程はいくつかの選択肢からランダム）を再生します。 | ALT/CTRL（Enterなしで発音します）
SAMPLE RATE | VIDEO CHATまたはDRUM、PLAYBACK、TIMELAPSEでの再生サンプリングレートを変更します（22050Hz→44100Hz→88200Hz→11025Hzの順に変更になります） | SAMPLERATE or RATE
FILTER | VIDEO CHAT、FEEDBACKの再生にはローパスフィルタをかけており、その周波数値を変更します（200Hz→2000Hz→8000Hz→14000Hz→0Hzの順に変更になります | FILTER
STOP | 音声・映像の再生を停止します | STOP or ESCキー（ESCはEnter不要）
GLITCH | CHAT、PLAYBACK時の映像、音声をいじります | GLITCH
CTRL | CTRL画面を呼び出します（再度入力すると基に戻ります | CTRL

- 発生した音を止めるのはSTOPまたは発生時と同じコマンドを実行すれば止まります
- 前回実施したコマンドを呼び出すには上矢印キーを押下します


## VOICE MODEについて
- VOICEと入力しEnterを押下すると該当端末はVOICE MODEになります。同じ操作を繰り返すと戻ります。
- VOICE MODE時にはすべての入力内容をEnter時に端末より発声します。


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


## ctrlページでの操作について
- CHAT、RECORDの入力元の端末、CHAT、PLAYBACK、TIMELAPSE、DRUMの再生先の端末を選択できるチェックボックスを具備
- CHAT、PLAYBACK、DRUMの再生時のサンプリングレートをフェーダー操作可能。CHATは端末ごとの再生時のレートを操作可能
- 各機能ごとのボリュームをフェーダー操作可能

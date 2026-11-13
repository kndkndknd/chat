# GAIN コントローラ

> 最終更新: 2026-11-14
> 対象: `GAIN` + Enter で表示されるゲインUI、`GAIN` コマンド、`gainFromClient` / `gainFromServer`、各音声チャンネルへの適用

## 1. 概要

`GAIN` コントローラは、全クライアント共通のゲイン（音量）を調整するためのミキサーUIです。

- バックエンドの `cmdState.GAIN` を正本とし、Redis の `state:cmdState` に永続化する。
- UIは10項目のスライダーを持つ。
- `CLICK` を除く9項目は、発音中の音声へリアルタイムに反映される。
- `CLICK` は次回のクリック発音時に反映される。
- 値の範囲は `0.00〜2.00`、刻みは `0.01`。
- ゲイン変更は全クライアントへ配信され、各端末の音声グラフへ適用される。

## 2. 表示とキー操作

### 表示条件

初期化完了後、入力バッファが `GAIN` の状態で Enter を押すとUIをトグルします。

- 小文字で入力しても、文字は大文字化されるため `gain` でも動作する。
- `GAIN` + Enter はローカルで処理され、通常のコマンドとしてバックエンドへEnterは送信されない。
- UI表示中に再度 `GAIN` + Enter を押すと閉じる。
- 閉じるボタンはない。
- UIを閉じても音源のミュートやゲインの変更は行わない。

### 入力文字列のクリア

`GAIN` + Enter 時は以下を行う。

1. `toggleGainUI()` でUIを開閉
2. `clearStringFromClient` をバックエンドへ送信
3. ローカルの `stringsClient` を空にする
4. `erasePrint()` で入力表示を消去

バックエンドは `clearStringFromClient` 受信時に以下を行う。

- 入力バッファ `strings` を空にする
- `erasePrintEmit()` で全クライアントの入力表示を消去する

これにより、GAIN実行後に `"GAIN"` が入力バッファへ残り、次のコマンドに混ざることを防ぐ。

### Escape

Escape を押すと `hideGainUI()` でUIを非表示にする。

- 既存の Escape 動作（STOP）は維持される。
- ローカルの入力文字列もクリアする。
- バックエンドの `charProcess` も Escape で入力バッファを空にし、STOPを実行する。
- UIを閉じるだけでは音源のミュートやゲイン同期は行わない。

### Safari / snowleopard

`html/snowleopard.html` では `initGainUI()` を呼んでいないため、GAIN UI自体は表示されない。ただし、初期化後に `gainReqFromClient` を送るため、グローバルゲインの同期と音量適用は行われる。

## 3. UI構成

表示は画面中央固定、`scale(1.5)`、`z-index: 10`、背景 `rgba(0,0,0,0.82)`、等幅フォント13px。

| 順序 | キー | 既定値 |
|---:|---|---:|
| 1 | `MASTER` | 1.0 |
| 2 | `SINEWAVE` | 0.2 |
| 3 | `FEEDBACK` | 0.6 |
| 4 | `WHITENOISE` | 0.5 |
| 5 | `CLICK` | 0.4 |
| 6 | `BASS` | 1.5 |
| 7 | `CHAT` | 1.5 |
| 8 | `GLITCH` | 2 |
| 9 | `SIMULATE` | 1.0 |
| 10 | `METRONOME` | 0.9 |

- 各スライダーは `min=0`, `max=2`, `step=0.01`。
- 数値表示は小数2桁。
- 初回の `gainFromServer` が届くまではスライダーを無効化し、数値表示は `--`。
- 初回同期後はスライダーを有効化する。
- 既定値は `cmdState.GAIN` の初期値。Redisに保存済みの値がある場合は、その値が優先される。

## 4. 値の同期フロー

### 初期化・再接続

1. `initGainUI()` が10項目のUIを生成する。
2. バックエンドへ `gainReqFromClient` を送る。
3. バックエンドの `gainReqFromClient` が現在の `cmdState.GAIN` を `gainFromServer` で配信する。
4. フロントの `gainFromServer` ハンドラが `setGainUI()` と `applyGlobalGain()` を実行する。
5. `setGainUI()` は値を正規化して表示へ反映し、スライダーを有効化する。

再接続・初期接続時にも `socket.ts` の `connected` ハンドラが `gainReqFromClient` を送る。

`SocketFacade.emit()` はWebSocketが `OPEN` でない場合に送信を破棄するため、再接続時の要求が重要になる。

### スライダー操作

1. スライダーの `input` イベントで値を取得する。
2. `0.00〜2.00` にクランプする。
3. グローバル対象キーなら、ローカルの音声グラフへ即時適用する。
4. 変更したキーだけを `gainFromClient` で送信する。

```json
{ "MASTER": 0.75 }
```

全10項目を送ることはない。これにより、他クライアントの最新値を古い値で上書きする競合を減らしている。

5. バックエンドは受信したキーだけを更新する。
6. 更新後の完全な `cmdState.GAIN` を `gainFromServer` で全クライアントへ配信する。
7. 全クライアントがUI表示とグローバルゲインを更新する。

バックエンドから返る `gainFromServer` は完全なスナップショットで、クライアントから送る `gainFromClient` は部分更新である。

### `gainFromServer` の受信

`gainFromServer` はUIの開閉状態に関係なく処理される。

- UIが未生成の場合は `latestGainState` に保持する。
- UI生成後に保持していた値で初期化する。
- 音声ノードが未初期化の場合は適用をスキップする。
- 音声初期化後の `gainReqFromClient` で再同期する。

## 5. グローバルリアルタイム適用

`GLOBAL_GAIN_KEYS` は `CLICK` を除く9項目。

| キー | リアルタイム適用 | 適用先 | 備考 |
|---|---|---|---|
| `MASTER` | あり | `masterGain` | 全Web Audio出力のマスター |
| `SINEWAVE` | あり | `sinewaveMixGain` | 発音中は即時反映 |
| `FEEDBACK` | あり | `feedbackMixGain` | counterbalanceにも追従 |
| `WHITENOISE` | あり | `whitenoiseMixGain` | 発音中は即時反映 |
| `CLICK` | なし | `clickGain` | 次回のクリック発音時に反映 |
| `BASS` | あり | `bassMixGain` | 発音中は即時反映 |
| `CHAT` | あり | `chatGain` | フィルタ付きCHATも経由 |
| `GLITCH` | あり | `glitchGain` | MASTER配下 |
| `SIMULATE` | あり | `simulateMixGain` | 発音中は即時反映 |
| `METRONOME` | あり | 専用GainNodeなし | 次のtickから反映 |

`CLICK` 以外のキーは、`gainFromServer` 受信時に全クライアントの該当ミックスバスへ `setTargetAtTime(value, currentTime, 0.01)` で適用される。

## 6. 音声グラフ

```text
destination
  ↑
muteGain
  ↑
masterPanner
  ↑
masterGain（MASTER）
  ↑
  ├─ sinewaveMixGain ← oscGain（発音ゲート） ← oscillator
  ├─ feedbackMixGain ← feedbackGain（発音ゲート） ← microphone
  ├─ whitenoiseMixGain ← whitenoiseGain（発音ゲート） ← whitenoise worklet
  ├─ bassMixGain ← bassGain（発音ゲート） ← bass oscillator
  ├─ simulateMixGain ← simulateGain（発音ゲート） ← simulate oscillator
  ├─ chatGain ← chat audio / chatFilter
  ├─ glitchGain ← convolver
  ├─ clickGain ← click oscillator
  └─ threeGain / GPS / accelerate など
```

### 発音ゲートとミックスバスの分離

SINEWAVE / FEEDBACK / WHITENOISE / BASS / SIMULATE は、既存のGainNodeを「発音中かどうか」のゲートとして使う。

- 発音中: ゲートを `1`
- 停止中: ゲートを `0`
- 音量: 後段のミックスGainNode

この分離により、停止中のオシレーターやノイズ源が、音量変更だけを理由に鳴り出すことはない。

`STOP` はゲートを `0` にするだけで、ミックスバスの値は保持する。次回の発音時は保存されているグローバル音量が使われる。

### FEEDBACKのcounterbalance

通常のFEEDBACKコマンドはゲートを `1` にする。

`/counterbalance` の加速度センサー入力は `feedbackLevel(value, fade)` を使う。

- `value` は `rms × 係数`
- 既定ゲイン `0.6` を基準に `value / 0.6` をゲート値へ設定
- 出力は `ゲート値 × feedbackMixGain`
- `FEEDBACK` のグローバル音量を変更すると、counterbalanceの出力も比例して変化する
- `FEEDBACK = 0` の場合は無音

### METRONOME

METRONOMEはクリックごとに `click()` を呼ぶため、専用のGainNodeを持たない。

- 各tickで `getGlobalGainValue("METRONOME")` を取得
- その値で `click(gain, 440)` を実行
- 音量変更は次のtickから反映される
- 停止中に変更した場合も、次回のMETRONOME開始時から反映される

### CLICK

CLICKは発音ごとのゲインを使う。

- `CLICK` コマンドはバックエンドの `cmdState.GAIN.CLICK` を `gain` として送る
- UIの `CLICK` スライダーは値を保存する
- UIの `change` 時にはテスト用に `click(value, 440)` を1回実行する
- 発音中のクリック音量を変更するものではない

## 7. VOICEとMASTER

### サーバーTTS

left / right パスのサーバーTTSは以下の経路を通る。

```text
AudioBufferSourceNode → GainNode → masterGain → masterPanner → muteGain → destination
```

- `MASTER` の変更は再生中のサーバーTTSにも即時反映される。
- `MUTE` は `muteGain` で適用される。

### speechSynthesis

中央パスの `speechSynthesis` はWeb Audioの外で再生されるため、`masterGain` を通らない。

- `utterance.volume = MASTER × data.volume`
- `0〜1` にクランプ
- `MASTER = 0` の場合は発話を開始しない
- `MASTER` の変更は次回の発話から反映される

## 8. バリデーションと範囲外値

### WebSocket `gainFromClient`

`isGainData()` で以下を検証する。

- オブジェクトである
- キーが既知の10項目のいずれか
- 値が有限数
- 値が `0〜2`

不正な場合は `wsServer` がメッセージを破棄する。

`gainFromClient()` 側でも二重防御として以下を行う。

- 既知キーだけを更新
- 有限数だけを更新
- `0〜2` にクランプ
- 更新後の完全な `cmdState.GAIN` を配信

### `GAIN` コマンド

- `GAIN <key> <value>` は値を `0〜2` にクランプする
- 設定後に `gainFromServer` を全クライアントへ配信する
- `GAIN <key>` は現在値をテキスト表示するだけ
- `GAIN <key>` は `gainFromServer` を送らないため、開いているUIは次に `gainReqFromClient` を送るまで更新されない
- 未知キーは処理しない
- 値が数値でない場合は現在値を表示する
- キーは大文字の完全一致

### フロントエンド

`setGainUI()` は受信値を以下のように正規化する。

- 欠損値: 直前の値へフォールバック
- 非数値: 直前の値へフォールバック
- 範囲外: `0〜2` にクランプ
- `null` / `undefined`: 直前の値へフォールバック

`applyGlobalGainValue()` も非数値を無視し、範囲外をクランプする。

### 起動時の正規化

Redisから復元した `cmdState.GAIN` は、起動時に `normalizeGainState()` で `0〜2` に正規化する。

- 古いバージョンで範囲外の値が保存されていても補正される
- 非有限値は安全側に倒して `0` になる

## 9. 既知の制約・注意点

- `METRONOME` の音量変更は次のtickから反映される。
- `CLICK` はリアルタイム音量変更の対象外で、次回のクリック発音時に反映される。
- `speechSynthesis` の `MASTER` 変更は次回の発話から反映される。サーバーTTSは即時反映。
- `MASTER` は `GLITCH` を含むWeb Audio出力に適用される。そのため `GLITCH` は `masterPanner` の左右パン対象にもなる。
- GAIN UIは初回の `gainFromServer` が届くまで無効。切断中に開いた場合も、応答が届くまで操作できない。
- 切断中のスライダー変更は `SocketFacade.emit()` が破棄するためサーバーへ送信されない。再接続時の `gainFromServer` でサーバー状態へ戻る。
- スライダー操作は `input` ごとに部分更新を送る。送信回数の間引き（デバウンス）は未実装。
- ゲイン変更は全クライアント共通。認証はないため、接続できるクライアントは誰でも変更できる。
- バックエンドの入力バッファ `strings` は現状モジュール共有のため、`clearStringFromClient` は全クライアント共通の入力バッファをクリアする。
- フロントエンドの `GAIN_DEFAULTS` はバックエンドの `cmdState.GAIN` 初期値と一致させる必要がある。
- `snowleopard.html` ではGAIN UIは表示されない。グローバルゲインの同期・適用のみ行われる。
- 実ブラウザ・複数端末での音量変化は自動テストでは検証していない。テストはGainNodeの呼び出し内容までを検証する。

## 10. 実装ファイル

### バックエンド

| ファイル | 役割 |
|---|---|
| `packages/backend/src/state/states/cmdState.ts` | `cmdState.GAIN` の既定値 |
| `packages/backend/src/redis/stateRedis.ts` | `state:cmdState` の永続化・復元 |
| `packages/backend/src/cmd/gainValue.ts` | キー一覧、範囲、クランプ、起動時正規化 |
| `packages/backend/src/cmd/gainFromClient.ts` | `gainFromClient` / `gainReqFromClient` |
| `packages/backend/src/cmd/splitSpace/index.ts` | `GAIN <key> [値]` コマンド |
| `packages/backend/src/socket/validateMessage.ts` | `isGainData` による入力検証 |
| `packages/backend/src/socket/wsServer.ts` | `gainFromClient` / `gainReqFromClient` / `clearStringFromClient` |
| `packages/backend/src/parameterChange/resetParameters.ts` | `GAIN` のリセットと再配信 |
| `packages/backend/src/app.ts` | 起動時の `normalizeGainState` |

### フロントエンド

| ファイル | 役割 |
|---|---|
| `packages/frontend/src/ui/gainUI.ts` | UI生成、表示、入力、同期、Esc閉じる |
| `packages/frontend/src/textInput.ts` | GAIN + Enter、Escape、入力文字列クリア |
| `packages/frontend/src/socket.ts` | `gainFromServer` の受信、再接続時の同期要求 |
| `packages/frontend/src/webaudio/params/applyGlobalGain.ts` | グローバルキー、既定値、ミックスバスへの適用 |
| `packages/frontend/src/webaudio/init/initAudio.ts` | 各ミックスGainNodeの生成と配線 |
| `packages/frontend/src/webaudio/sound/*.ts` | 発音ゲート、counterbalance、METRONOME |
| `packages/frontend/src/stream/init/initAudioStream.ts` | マイク入力をfeedbackGainへ接続 |
| `packages/frontend/src/initialize.ts` | counterbalanceのfeedbackLevel呼び出し |
| `packages/frontend/src/initializeSnowleopard.ts` | snowleopard初期化後のゲイン同期 |
| `packages/frontend/src/voice.ts` | サーバーTTSとspeechSynthesisのMASTER連動 |
| `packages/frontend/src/state/webAudio/gainState.ts` | 音声ノードの保持 |

## 11. テスト

### 関連テスト

| テスト | 内容 |
|---|---|
| `packages/backend/test/cmd/gainFromClient.test.ts` | 部分更新、範囲外クランプ、非有限値の無視 |
| `packages/backend/test/cmd/gainValue.test.ts` | クランプ、起動時正規化 |
| `packages/backend/test/socket/validateMessage.test.ts` | 未知キー・範囲外・非数値の拒否 |
| `packages/frontend/test/webaudio/params/applyGlobalGain.test.ts` | 9キーのミックスバス適用、METRONOME値保持、CLICK除外 |
| `packages/frontend/test/ui/gainUI.test.ts` | 10項目UI、部分送信、クランプ、CLICKテスト、表示トグル、Esc非表示 |
| `packages/frontend/test/ui/textInput.test.ts` | GAIN + EnterのUIトグルと入力クリア、Escape |
| `packages/frontend/test/webaudio/sound/globalGainChannels.test.ts` | 発音ゲートとミックスバスの分離、counterbalance |
| `packages/frontend/test/webaudio/sound/metronome.test.ts` | 各tickの最新METRONOME音量 |
| `packages/frontend/test/voice/voice.test.ts` | サーバーTTSのMASTER連動、speechSynthesisの音量 |

### 実行

```bash
pnpm -F backend test
pnpm -F frontend test
pnpm -F backend exec tsc --noEmit
pnpm -F frontend exec tsc --noEmit
pnpm -F backend build
pnpm -F frontend build
```

2026-11-14時点の実績:

- backend: 71ファイル / 329テスト成功
- frontend: 17ファイル / 91テスト成功
- 両方の `tsc --noEmit` 成功
- 両方の本番ビルド成功

## 12. 関連ドキュメント

- `README.md`: キーボード操作と `GAIN` コマンド一覧
- `document/voice.md`: VOICEとMASTERの関係
- `document/frontend_test.md`: フロントエンドテストの構成

# SYNTH 実装

> 対象: `SYNTH` / `SYNTH <Hz>` コマンド、`cmdFromServer` の `SYNTH`、
> `webaudio/sound/synth.ts`、`webaudio/init/initAudio.ts` の SYNTH バス。

## 概要

`SYNTH` は、Web Audio API のノードだけでモジュラーシンセ風のワンショット音を鳴らすコマンドです。AudioWorklet / WebAssembly は使っていません。

- 1 回のコマンドで約 2.8 秒の音を 1 ボイス生成します。
- 周波数を省略すると A マイナーペンタトニックからランダムに選びます。
- `SYNTH <Hz>` で 20〜20000Hz の周波数を指定できます。
- ターゲット未指定時は接続中の全クライアントで鳴らします。
- `STOP` / `Escape` で鳴っているボイスをフェードアウトして停止します。

## コマンドとルーティング

| 入力 | 動作 | 主な経路 |
| --- | --- | --- |
| `SYNTH` | 全クライアントでランダムな 1 音 | `receiveEnter` → `execEnter` → `execCmd` |
| `SYNTH <Hz>` | 全クライアントで指定周波数 | `splitSpace` → `execSynth` |
| `<index> SYNTH` | 指定クライアントでランダムな 1 音 | `numTarget` → `execCmd` |
| `<index> SYNTH <Hz>` | 指定クライアントで指定周波数 | `numTarget` → `execSynth` |
| `ALL SYNTH` | 全クライアントでランダムな 1 音 | `splitSpace` の `ALL` 分岐 → `execCmd` |
| `ALL SYNTH <Hz>` | 全クライアントで指定周波数 | `splitSpace` の `ALL` 分岐 → `execSynth` |
| `PA SYNTH` | PA 対象クライアントでランダムな 1 音 | `splitPaTarget` → `execCmd` |
| `PA SYNTH <Hz>` | PA 対象クライアントで指定周波数 | `splitPaTarget` → `execSynth` |
| `SELF` 中の `SYNTH` / `SYNTH <Hz>` | 入力端末のみ | `execEnter` / `splitSpace` の self 判定 |
| `STOP` / `Escape` | 鳴っている SYNTH を停止 | `execStop` → `stopFromServer` → `stopCmd` |

`<Hz>` はバックエンドでは正の数として送られ、フロントの `resolveSynthFrequency()` で 20〜20000Hz を検証します。範囲外・非数の場合はランダム音にフォールバックします。

### バックエンド側の登録

- `cmdList` に `SYNTH: "SYNTH"` を登録しています。これにより `receiveEnter` の単体コマンド判定、`<index> SYNTH`、`ALL SYNTH`、`PA SYNTH`、`FADE SYNTH`、`SOLO SYNTH` が既存のコマンド経路に乗ります。
- `getCmd("SYNTH")` は `{ cmd: "SYNTH" }` を返します（周波数なし）。
- `execSynth(frequency?, target?)` は `SYNTH <Hz>` 用に `{ cmd: "SYNTH", value: frequency }` を生成します。
- `commonPickupCmdTarget` の `SYNTH` は、ターゲット未指定時に `clientState.cmdClient` 全体を返します。
- `currentState.cmd.SYNTH` / `previousState.cmd.SYNTH` は、`FADE SYNTH` や `SOLO SYNTH` が参照しても落ちないように空配列で初期化しています。

## データフロー

```
SYNTH / SYNTH <Hz>
  → backend: execCmd / execSynth
  → cmdEmit("cmdFromServer", { cmd: "SYNTH", value?: Hz })
  → frontend: cmdFromServer
  → synth(frequency?, gain?)
  → Web Audio ノードを生成して再生
```

- 周波数なし: `{ cmd: "SYNTH" }`
- 周波数あり: `{ cmd: "SYNTH", value: 440 }`
- 停止: `{ cmd: "SYNTH", flag: false }`（`STOP SYNTH` / `STOP CMD` 経由。通常の `SYNTH` は `currentState.cmd.SYNTH` にターゲットを登録しないため、`STOP SYNTH` 単体は実質 no-op です）

`cmdFromServer` は `SYNTH` 受信時、`cmd.flag === false` なら `stopSynth()`、それ以外なら `synth(cmd.value, cmd.gain)` を呼びます。画面には `SYNTH` または `SYNTH 440Hz` を表示します。

## 音源の構成

`packages/frontend/src/webaudio/sound/synth.ts` が 1 ボイスを生成します。

### オシレータ

- デチューンしたノコギリ波 2 本（±約 5〜13 cents）
- 1 オクターブ下の矩形波（サブ）
- 指定周波数がある場合はその周波数、なければ A マイナーペンタトニック
  （110 / 130.81 / 146.83 / 164.81 / 196 / 220 / 261.63 / 293.66 / 329.63 / 392Hz）

### フィルター

- レゾナンスの強いローパスフィルター（Q 約 9〜18）
- カットオフエンベロープ
  - アタックで一瞬開き、約 1.6 秒かけて閉じる
  - 指定周波数が高いほどカットオフ範囲も高くなる
- 低周波 LFO（約 0.07〜0.35Hz）によるカットオフ変調

### キャラクター

- フィルター後のソフトクリップ（`WaveShaperNode`、tanh カーブ）
- アタック用の短いバンドパスノイズ（約 0.3 秒）
- ランダムなステレオパン
- 共通バスのコンプレッサー
- ローパス入りのフィードバックディレイ（約 0.27 秒、フィードバック 0.32）

### 信号の流れ

```
oscA / oscB / sub
  → mix → filter → shaper → voiceGain
noise → noiseFilter → noiseGain → voiceGain
voiceGain → panner → synthState.input
synthState.input → compressor → masterGain
compressor → delay → delayFilter → feedback → delay
delayFilter → wet → masterGain
```

`synthState.input` は `initAudio()` で生成します。`masterGain` の後段には既存のパン / ミュートがあるため、SYNTH も全体ミュートの影響を受けます。

## 状態とライフサイクル

`packages/frontend/src/state/webAudio/synthState.ts` が以下を保持します。

| フィールド | 役割 |
| --- | --- |
| `input` | SYNTH ボイスの入力バス |
| `compressor` | 音量を整えるコンプレッサー |
| `delay` / `delayFilter` / `feedback` / `wet` | フィードバックディレイ |
| `activeVoices` | 再生中のボイス（`Set<SynthVoice>`） |

1 ボイスは約 2.8 秒で減衰します。生成時に `activeVoices` へ追加し、約 3.3 秒後の `setTimeout` で削除します。

## 停止

- `STOP` / `Escape` は `execStop` → `stopEmit` → フロントの `stopCmd` を経由します。
- `stopCmd` は `except !== "SYNTH"` のとき `stopSynth(fade)` を呼びます。
- `stopSynth()` は各ボイスのゲインをフェードアウトし、オシレータ / ノイズを停止します。
- 併せて `synthState.input` と `wet` を 0 にするため、ディレイの残響も止まります。次回の `synth()` で元のゲインに戻します。

`STOP SYNTH` は `currentState.cmd.SYNTH` にターゲットが入っている場合だけ停止コマンドを送ります。通常の `SYNTH` はワンショットでターゲットを登録しないため、`STOP` / `Escape` を使ってください。

## 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `packages/backend/src/data/list/cmdList.ts` | `SYNTH` コマンド登録 |
| `packages/backend/src/cmd/execCmd.ts` | `SYNTH` の `cmdFromServer` 生成（周波数なし） |
| `packages/backend/src/cmd/execSynth.ts` | `SYNTH <Hz>` の `cmdFromServer` 生成 |
| `packages/backend/src/cmd/pickupCmdTarget.ts` | ターゲット未指定時の全クライアント選択 |
| `packages/backend/src/cmd/splitSpace/index.ts` | `SYNTH <Hz>` / `ALL SYNTH <Hz>` のルーティング |
| `packages/backend/src/cmd/splitSpace/numTarget.ts` | `<index> SYNTH <Hz>` のルーティング |
| `packages/backend/src/cmd/splitSpace/splitPaTarget.ts` | `PA SYNTH <Hz>` のルーティング |
| `packages/backend/src/state/states/currentState.ts` / `previousState.ts` | `cmd.SYNTH` の初期化 |
| `packages/frontend/src/webaudio/sound/synth.ts` | ボイス生成・周波数検証・停止 |
| `packages/frontend/src/state/webAudio/synthState.ts` | SYNTH バスとアクティブボイス |
| `packages/frontend/src/webaudio/init/initAudio.ts` | コンプレッサー / ディレイの初期化 |
| `packages/frontend/src/cmd/cmdFromServer.ts` | `SYNTH` 受信時の発音・停止 |
| `packages/frontend/src/cmd/stopCmd.ts` | `STOP` 時の `stopSynth()` |

## テスト

- `packages/backend/test/cmd/execSynth.test.ts`
  - target 未指定で全 client
  - target 指定で対象のみ
  - 周波数付き `value`
  - 未指定・不正時は `value` なし
- `packages/backend/test/cmd/execCmd.test.ts`
  - `getCmd("SYNTH")` が CMD 型を返す
- `packages/backend/test/cmd/pickupCmdTarget/commonPickupCmdTarget.test.ts`
  - `SYNTH` が `clientArr` 全体を返す
- `packages/backend/test/cmd/splitSpace/numTarget.test.ts`
  - `<index> SYNTH` / `<index> SYNTH <Hz>`
- `packages/backend/test/cmd/splitSpace/splitPaTarget.test.ts`
  - `PA SYNTH <Hz>`
- `packages/frontend/test/webaudio/sound/synth.test.ts`
  - `SYNTH_NOTES` からの選択
  - 20〜20000Hz の周波数検証
  - 指定周波数のオシレータ反映
  - AudioContext 未初期化時に例外を投げない
  - ボイス生成と `stopSynth()` の停止

## 注意点

- 音を出すには、そのクライアントで先に画面クリック / Enter による `initialize()`（AudioContext の生成）が必要です。
- `SYNTH` はワンショットです。連続音が必要な場合はコマンドを繰り返すか、別途シーケンサを実装してください。
- 同時に複数の `SYNTH` が届くとボイスが重なります。共通バスのコンプレッサーで音量を抑えていますが、連打すると密度が上がります。
- 指定周波数は 20〜20000Hz です。範囲外はランダム音になります。
- 音色はランダム要素（デチューン、フィルター、LFO、ノイズ、パン）を含むため、同じ周波数でも毎回少し変わります。

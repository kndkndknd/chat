# RANDOM RATE（サンプルレートのランダマイズ）

> 最終更新: 2026-11-24
> 対象: `RANDOM RATE ...` コマンドと `sampleRateState`

## 概要

`RANDOM RATE` は、ストリーム再生時のサンプルレートをランダムに変化させる設定を操作するコマンドです。
サンプルレートを変えると再生速度と音程が変化します。

設定は `sampleRateState` に保持され、Redis の `state:sampleRateState` に永続化されます。
`splitSpace` は第 1 トークンが `RANDOM` のときに `cmd/splitSpace/splitRandomRate.ts` の
`splitRandomRate()` を呼び出し、さらに `stringArr[1] === "RATE"` のときだけ処理します。
`RANDOM` で始まっても `RATE` 以外の第 2 トークンは無視されます。

## 状態

`packages/backend/src/state/states/sampleRateState.ts` の定義は次のとおりです。

| キー | 内容 | 初期値 |
| --- | --- | --- |
| `sampleRate` | ランダム化しないときの基本サンプルレート | 全ストリーム `44100` |
| `randomrate` | ストリームごとのランダム化 ON/OFF | 全ストリーム `false` |
| `randomraterange` | ストリームごとの選択範囲（Hz） | 全ストリーム `4000`〜`132300` |
| `randomratemode` | サンプルレートの選択方法 | `"random"`（対数一様） |
| `randomratenote` | CHAT の音階モード ON/OFF | `CHAT` / `PLAYBACK` / `TIMELAPSE` は `false`、`EMPTY` はキーなし |
| `randomratekey` | 未使用 | `"A"` |

`randomrate` / `randomraterange` のキーは `CHAT` / `PLAYBACK` / `TIMELAPSE` / `EMPTY` です。

### 永続化の注意

起動時は Redis の `state:sampleRateState` を読み込み、ソース上の初期値へ上書きマージします。
そのため、既存の Redis 状態がある場合は上記の初期値は適用されません。
初期値に戻したい場合はサーバ停止中に `state:sampleRateState` を削除してから再起動してください。

## コマンド一覧

`<STREAM>` は `CHAT` / `PLAYBACK` / `TIMELAPSE` / `EMPTY` のいずれかです。
コマンドは大文字小文字を区別します。

| 入力 | 動作 | 応答メッセージ |
| --- | --- | --- |
| `RANDOM RATE` | 全ストリームの `randomrate` を反転 | `SAMPLERATE RANDOM: <CHAT の値>` |
| `RANDOM RATE <STREAM>` | 指定ストリームの `randomrate` を反転 | `SAMPLERATE RANDOM(<STREAM>): <値>` |
| `RANDOM RATE TRUE\|FALSE` | 全ストリームの `randomrate` を指定値に設定 | `SAMPLERATE RANDOM: <true\|false>` |
| `RANDOM RATE <STREAM> TRUE\|FALSE` | 指定ストリームの `randomrate` を指定値に設定 | `SAMPLERATE RANDOM(<STREAM>): <true\|false>` |
| `RANDOM RATE <min>-<max>` | 全ストリームの `randomraterange` を設定 | `SAMPLERATE RANDOM RATE RANGE: <min>-<max>Hz` |
| `RANDOM RATE <STREAM> <min>-<max>` | 指定ストリームの `randomraterange` を設定 | `SAMPLERATE RANDOM RATE RANGE(<STREAM>): <min>-<max>Hz` |
| `RANDOM RATE RANDOM` | `randomratemode` を完全ランダム（線形一様）に設定 | `SAMPLERATE RANDOM MODE: RANDOM` |
| `RANDOM RATE LOG` | `randomratemode` を対数一様分布に設定 | `SAMPLERATE RANDOM MODE: LOG` |
| `RANDOM RATE NOTE` | `randomratenote` を全キーで反転 | `SAMPLERATE RANDOM(NOTE): <CHAT の値>` |

### 入力例

```text
RANDOM RATE
RANDOM RATE CHAT
RANDOM RATE TRUE
RANDOM RATE PLAYBACK FALSE
RANDOM RATE 4000-132300
RANDOM RATE PLAYBACK 8000-22050
RANDOM RATE RANDOM
RANDOM RATE LOG
RANDOM RATE NOTE
```

### 範囲指定の規則

- 全ストリーム版（`RANDOM RATE <min>-<max>`）は `min >= 4000` かつ `max <= 132300` のときだけ反映します。
  範囲外のときは変更せず `OUT RATE RANGE: 4000-132300` を送信します。
- 全ストリーム版でも `min < max` の整合性は検証しません。
- 個別ストリーム版（`RANDOM RATE <STREAM> <min>-<max>`）は範囲チェックを行いません。
- 範囲文字列は `-` で分割した 2 要素がともに数値である必要があります。
  数値でない場合は何も変更せず、メッセージも送信しません。
- 数値判定は `Number()` を使うため、空文字列は `0` として扱われます。
  たとえば `RANDOM RATE 4000-` は `min=4000, max=0` として扱われます。

## ランダム選択のモード

`randomratemode` は `randomraterange` からサンプルレートを選ぶ方法を決めます。
モード切替コマンドはフラグを変更しないため、実際にランダム化するには
`randomrate[stream]` が `true` である必要があります（`wholeEmit` を除く）。

| モード | 選択方法 |
| --- | --- |
| `"random"`（既定） | 対数一様分布。`min * (max/min)^Math.random()`。桁・オクターブごとに均等 |
| `"uniform"` | 完全ランダム（線形一様）。`min + Math.random() * (max-min)`。範囲内を等確率で選ぶ |
| `"diatonic"` | `5512.5Hz` の整数倍から選ぶ。範囲内に倍数が無い場合はエラー |
| `"serial"` | `5512.5Hz` を基準に音階配列を作り、その中から選ぶ |

- `RANDOM RATE RANDOM` → `"uniform"`
- `RANDOM RATE LOG` → `"random"`

`"diatonic"` / `"serial"` は実装のみで、現在これらに切り替えるコマンドはありません。
未知のモード値の場合は `"random"`（対数一様）として扱われます。
モードは全ストリーム共通です。モード切替はその場で既存ストリームへ反映され、
新規ストリームも現在のモードを継承します（`pushStateStream` はモードを変更しません）。

## 再生時の適用

| ファイル | 動作 |
| --- | --- |
| `stream/execStream.ts` | `randomrate[source]` が `true` のとき、`randomratemode` に従って選んだ値で `sampleRate` を上書き |
| `stream/execStream.ts` の `paStreamEmit` | PA 送出時も同じ条件で `sampleRate` を上書き |
| `stream/chatReceive.ts` | `randomrate.CHAT` が `true` のとき、`randomratenote.CHAT` が `true` なら `11025 × 1〜10`、`false` なら `sampleRateRandomize("CHAT")` |
| `stream/wholeEmit.ts` | `randomrate` フラグに関係なく、`streamList` のストリームは `randomratemode` に従って `sampleRate` を選ぶ。`CHAT` 分岐は基本サンプルレートのまま |
| `stream/pushStateStream.ts` | キーが存在しない項目だけを初期化（`randomrate` を `false`、範囲を `4000`〜`132300`）。既存ストリームの設定は保持し、`randomratemode` は変更しない |

補足:

- `randomratenote` を参照しているのは `CHAT` だけです。
- `randomratenote.CHAT` が `true` の場合、`randomraterange` と `randomratemode` は使われません。
  選ばれる値は `11025, 22050, ..., 110250` の 10 通りです。
- `wholeEmit` では `glitch` が有効な場合、選択後に `sampleRate` が
  `glitchState.glitchSampleRate` で上書きされます。
- `wholeEmit` の `streamList` 分岐では `sampleRate` をランダム化する一方、
  `duration` は `sampleRateState.sampleRate[targetCmd]` を基準に計算します
  （`glitch` 時は選択後の `sampleRate` で再計算）。
- `pushStateStream` はキーが存在しない項目だけを初期化します。既存ストリームに対して
  呼ばれても `randomrate` / `randomraterange` / `sampleRate` / `glitch` / `target` などの
  設定は保持します。`randomratemode` は全ストリーム共通のため変更せず、
  新規ストリームは現在のモードを継承します。

## 判定順

`splitRandomRate()` は次の順に分岐します。

1. `stringArr.length === 2` → 全ストリームのフラグ反転
2. `length === 3` かつ `stringArr[2]` が `RANDOM` / `LOG` → モード切替
3. `length === 3` かつ `stringArr[2]` が `randomrate` のキー → 個別フラグ反転
4. `length === 3` かつ `stringArr[2]` に `-` を含む → 全ストリームの範囲設定
5. `length === 3` かつ `stringArr[2]` が `TRUE` / `FALSE` → 全ストリームのフラグ設定
6. `length === 4` かつ `stringArr[2]` が `randomrate` のキー → 個別の範囲設定、または `TRUE` / `FALSE` 設定
7. `length === 3` かつ `stringArr[2] === "NOTE"` → `randomratenote` の反転

`NOTE` は `randomrate` のキーではないため、3 の分岐を通過して 7 で処理されます。
個別ストリーム版で第 4 引数が範囲でも `TRUE` / `FALSE` でもない場合は無視されます。

## 制約・注意点

- `<index> RANDOM RATE ...` と `ALL RANDOM RATE ...` は `splitRandomRate()` を経由しないため、
  端末個別・一括指定はできません。
- `RANDOM RATE` の全ストリーム操作（フラグ反転・`TRUE` / `FALSE`・範囲指定）は `EMPTY` を含みます。
  `RANDOM RATE NOTE` は `EMPTY` のキーがないため対象外です。
- 全ストリームのフラグ反転・NOTE 反転の応答メッセージは `CHAT` の値だけを表示します。
- 応答は `stringEmit()` で全クライアントへ送信され、`timeout` は既定で `true` です。
- `RANDOM RATE ...` の処理後、`randomrate` オブジェクト全体が `console.log` に出力されます。
- `randomratekey` は状態に定義されていますが、現在参照しているコードはありません。

## 関連ファイル

- `packages/backend/src/cmd/splitSpace/splitRandomRate.ts` — コマンド処理
- `packages/backend/src/cmd/splitSpace/index.ts` — `RANDOM` 分岐から呼び出し
- `packages/backend/src/state/states/sampleRateState.ts` — 状態の定義と初期値
- `packages/backend/src/stream/sampleRateRandomize.ts` — モード別のサンプルレート選択
- `packages/backend/src/stream/execStream.ts` — 通常送出・PA 送出への適用
- `packages/backend/src/stream/chatReceive.ts` — CHAT への適用
- `packages/backend/src/stream/wholeEmit.ts` — WHOLE 送出への適用
- `packages/backend/src/stream/pushStateStream.ts` — ストリーム追加時の初期化

## テスト

- `packages/backend/test/cmd/splitSpace/splitRandomRate.test.ts` — モード切替コマンド
- `packages/backend/test/stream/sampleRateRandomize.test.ts` — 各モードの選択結果
- `packages/backend/test/stream/pushStateStream.test.ts` — 新規キーだけの初期化と既存設定の保持

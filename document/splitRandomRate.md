# RANDOM RATE（サンプルレートのランダマイズ）

> 最終更新: 2026-11-08
> 対象: `RANDOM RATE ...` コマンド、`sampleRateState` の `randomrate` / `randomraterange` / `randomratenote`。

## 概要

`RANDOM RATE` は、音声・映像を再生するときのサンプルレートをランダムに変化させる設定を操作するコマンドです。
`splitSpace` が `stringArr[0] === "RANDOM"` のときに `cmd/splitSpace/splitRandomRate.ts` の
`splitRandomRate()` を呼び出します。`stringArr[1]` が `RATE` のときだけ処理し、
それ以外の `RANDOM ...` では何もしません。

設定は `sampleRateState`（Redis の `state:sampleRateState` に永続化）に保持されます。
デフォルト値は次のとおりです。

| キー | CHAT | PLAYBACK | TIMELAPSE | EMPTY |
| --- | --- | --- | --- | --- |
| `randomrate` | `true` | `true` | `true` | `false` |
| `randomraterange` | 4000〜132300 | 4000〜132300 | 4000〜132300 | 4000〜132300 |
| `randomratenote` | `false` | `false` | `false` | （キーなし） |

## コマンド

`<STREAM>` には `randomrate` のキー（`CHAT` / `PLAYBACK` / `TIMELAPSE` / `EMPTY`）を指定します。

| 入力 | 動作 | 送信メッセージ |
| --- | --- | --- |
| `RANDOM RATE` | 全ストリームの `randomrate` フラグを反転 | `SAMPLERATE RANDOM: <CHAT の値>` |
| `RANDOM RATE <STREAM>` | 指定ストリームの `randomrate` フラグを反転 | `SAMPLERATE RANDOM(<STREAM>): <値>` |
| `RANDOM RATE <min>-<max>` | 全ストリームの `randomraterange` を `min`〜`max` に設定。`min` が 4000 未満、または `max` が 132300 超のときは変更せずエラー | 成功: `SAMPLERATE RANDOM RATE RANGE: <min>-<max>Hz` / 範囲外: `OUT RATE RANGE: 4000-132300` |
| `RANDOM RATE TRUE\|FALSE` | 全ストリームの `randomrate` フラグを指定値に設定 | `SAMPLERATE RANDOM: <true\|false>` |
| `RANDOM RATE <STREAM> <min>-<max>` | 指定ストリームの `randomraterange` を `min`〜`max` に設定（全ストリーム版と異なり範囲チェックなし） | `SAMPLERATE RANDOM RATE RANGE(<STREAM>): <min>-<max>Hz` |
| `RANDOM RATE <STREAM> TRUE\|FALSE` | 指定ストリームの `randomrate` フラグを指定値に設定 | `SAMPLERATE RANDOM(<STREAM>): <true\|false>` |
| `RANDOM RATE NOTE` | 全ストリームの `randomratenote` フラグを反転（`EMPTY` はキーがないため対象外） | `SAMPLERATE RANDOM(NOTE): <CHAT の値>` |

補足:

- `randomratenote` を参照しているのは現状 `CHAT` のみです。
- メッセージは `stringEmit()` で全クライアントへ送信します（`stringsFromServer`、`timeout` は既定で `true`）。
- 全ストリームの範囲指定は `min < max` の整合性を検証しません。
- 範囲文字列が `-` で分割した 2 要素にならない場合や、数値として扱えない場合は、
  全ストリーム版では何も変更せずメッセージも送信しません。
  個別ストリーム版でも、範囲でも `TRUE` / `FALSE` でもない第 4 引数は無視されます。
- 数値判定は `Number()` で行うため、空文字列は `0` として扱われます
  （例: `RANDOM RATE 4000-` は `min=4000, max=0` として成功扱い）。
- 第 2 引数が `randomrate` のキーでない場合、`-` を含めば範囲指定、`TRUE` / `FALSE` なら全体設定、
  `NOTE` なら note 反転として解釈されます。それ以外の未知の文字列は無視されます。
- `<index> RANDOM RATE ...` や `ALL RANDOM RATE ...` は `splitRandomRate()` を経由しないため、
  端末個別・一括指定には対応していません。
- コマンドの比較は大文字小文字を区別します（小文字では動作しません）。
- `stringArr[1] === "RATE"` の間は、処理後に `console.log` で `randomrate` の内容を出力します。

## 判定順

`splitRandomRate()` は次の順に分岐します。

1. `stringArr.length === 2` → 全ストリームのフラグ反転
2. `length === 3` かつ `stringArr[2]` が `randomrate` のキー → 個別フラグ反転
3. `length === 3` かつ `stringArr[2]` に `-` を含む → 全ストリームの範囲設定
4. `length === 3` かつ `stringArr[2]` が `TRUE` / `FALSE` → 全ストリームのフラグ設定
5. `length === 4` かつ `stringArr[2]` が `randomrate` のキー → 個別の範囲設定、または `TRUE` / `FALSE` 設定
6. `length === 3` かつ `stringArr[2] === "NOTE"` → `randomratenote` の反転

`NOTE` は `randomrate` のキーではないため、2 の分岐を通過して 6 で処理されます。

## 再生時の反映

- `stream/execStream.ts`: `randomrate[source]` が `true` のとき、
  `randomraterange[source]` の `min` 以上 `max` 未満の整数をランダムに選び、`sampleRate` を上書きします。
- `stream/chatReceive.ts`: `randomrate.CHAT` が `true` のとき、
  `randomratenote.CHAT` が `true` なら `11025 * 1〜10` のいずれか、
  `false` なら `sampleRateRandomize("CHAT")` の値を使います。
- `stream/wholeEmit.ts`: `randomrate` フラグに関係なく `randomraterange[targetCmd]` からランダムに選びます。
- `stream/pushStateStream.ts`: 新しいストリームを追加するとき、`randomrate` は `false`、
  `randomraterange` は 4000〜132300、`randomratemode` は `"random"` に初期化されます。

## 関連ファイル

- `packages/backend/src/cmd/splitSpace/splitRandomRate.ts` — コマンド処理
- `packages/backend/src/cmd/splitSpace/index.ts` — `RANDOM` 分岐から呼び出し
- `packages/backend/src/state/states/sampleRateState.ts` — 状態の定義とデフォルト値
- `packages/backend/src/stream/sampleRateRandomize.ts` — ランダムレートの計算

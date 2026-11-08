# シナリオ自動生成（generateScenario）実装ドキュメント

`log/` 配下に保存されたコマンドログ（`LogType[]`）を**重ね合わせ**、relative 形式のシナリオ JSON を生成するスクリプトの説明。

---

## 全体像

```
log/*.json  (LogType[] = { date, cmd }[]、複数セッション分)
     │
     ▼
scripts/generateScenario.ts          ← CLI（引数解釈・ファイル入出力）
     │ generateMergedScenario()
     ▼
src/scenario/generateScenario.ts     ← 純ロジック（重ね合わせ・代表選定）
     │
     ▼
scenario/scenario.json              ← relative 形式 { format, timetable }
     │
     │ scenarioItsuki が定期読込 / コマンド `SCENARIO` でも読込
     ▼
execScenario() → receiveEnter()      ← 既存のシナリオ実行系（Timer.md 参照）
```

既定の出力先は本番と同じ `scenario/scenario.json`（上書き）。別名にしたい場合は `--out` で指定する。

---

## ファイル

| ファイル | 役割 |
| --- | --- |
| `packages/backend/src/scenario/generateScenario.ts` | コアロジック。純関数のみで副作用なし |
| `packages/backend/scripts/generateScenario.ts` | CLI。log ディレクトリ読込 → 生成 → JSON 書出し |
| `packages/backend/test/scenario/generateScenario.test.ts` | 単体テスト（11 件） |

---

## 入力: コマンドログ `log/*.json`

- 実行中の全コマンドは `cmdLogging()` がメモリ上の `cmdLog` に `{ date, cmd }` として追記する。
- コマンド `LOG PUT` / `LOG FILE` / `LOG EXPORT` で `log/YYYYMMDDHHmmss.json` に配列として保存される（`putLogFile()`）。
- `date` 形式は `YYYY-MM-DD HH:MM:SS.mmm`。

```json
[
  { "date": "2026-10-12 12:09:02.218", "cmd": "START" },
  { "date": "2026-10-12 12:09:19.874", "cmd": "NO" },
  { "date": "2026-10-12 12:09:23.25", "cmd": "1 SIMULATE" }
]
```

同じ date 形式は `exchangeRelativeSchedule()`（LOG IMPORT 系）でも利用されている。

---

## 生成アルゴリズム（重ね合わせ）

`generateMergedScenario(logs, options)` の処理:

1. **除外フィルタ**
   - 先頭トークンが除外リスト（後述）に一致するエントリを落とす。
2. **相対化**
   - 各ログの先頭エントリの `date` を 0 とし、各エントリを相対 ms に変換する。
   - ログ間で実行開始時刻が違っても、開始時点が揃う。
3. **ビン分割と集計**
   - `bin = floor(relMs / binMs)`（既定 `binMs = 10,000`）で区間を切り、`bin → cmd → { 出現ログ ID 集合, 出現時刻リスト }` に集計する。
4. **代表コマンドの選定**（各ビンにつき 1 コマンド）
   優先順:
   1. 出現した**ログ数**が多い（= 複数セッションに共通する操作を優先）
   2. 同数なら**総出現回数**が多い
   3. さらに同数なら出現時刻の**中央値が早い**
   4. それも同数なら**辞書順**（決定的にするため）
5. **時刻の決定**
   - 代表コマンドの全ログ横断の出現時刻リストから**中央値**を取る（偶数個は中央 2 値の平均）。
   - ログ間での中間的なタイミングになる。
6. **キー整形**
   - `formatRelativeTime()` で `H:MM:SS[.mmm]` に変換する。

### 相対時刻キーの互換性

`execScenario()`（relative）はキーを `split(":")` し、`H*3600s + M*60s + Number(SS.mmm)s` として解釈する。ミリ秒は秒の小数として扱われる（`"00.250"` → 250ms）。

`formatRelativeTime()` は以下を出力する:

- ミリ秒 0 のときは `.mmm` を省略（例: `0:00:15`）
- ミリ秒は `getMilliseconds()` と同じ整数表記でパディングなし（例: `0:00:02.550`, `0:00:01.42`, `0:00:00.5`）

---

## 除外コマンド

`DEFAULT_EXCLUDE_CMDS = ["START", "SCENARIO", "REPLAY", "LOG"]`（**先頭トークン一致**）。

| コマンド | 除外理由 |
| --- | --- |
| `START` / `SCENARIO [name]` | `receiveEnter` が `loadScenario` + `execScenario` を呼ぶため、生成シナリオに含めると**シナリオ自身が再帰起動**する |
| `REPLAY` | `execScenario` の absolute 形式専用（relative では使われない） |
| `LOG *` | ログ保存・読込・削除など操作系。シナリオとして再生する意味がない |

`options.excludeCmds` を渡すとリストごと差し替えられる（テストで使用）。

---

## 出力形式

```json
{
  "format": "relative",
  "timetable": {
    "0:00:17.656": "NO",
    "0:00:26.935": "CLICK",
    "0:00:33.234": "440"
  }
}
```

- `scenario/scenario.json` に出力するため、`scenarioItsuki()`（25 分周期）と `START` / `SCENARIO` コマンドの両方からそのまま読まれる。
- `scenario/*.json` は `.gitignore` 対象。

---

## 使い方

```
cd packages/backend
pnpm exec tsx scripts/generateScenario.ts [--bin 10] [--log-dir <path>] [--out <path>]
```

| 引数 | 既定 | 内容 |
| --- | --- | --- |
| `--bin <秒>` | `10` | 重ね合わせの区間幅。小さいほどステップ数が増える |
| `--log-dir <path>` | `<repo>/log` | 入力ログのディレクトリ（`*.json` を全件・名前順で読む） |
| `--out <path>` | `<repo>/scenario/scenario.json` | 出力先 |

実行例:

```
[generateScenario] logs: 3 files (20261012090210.json, 20261012095347.json, 20261012122223.json)
[generateScenario] entries: 259 (used 253, excluded 6)
[generateScenario] excluded cmds: START, SCENARIO, REPLAY, LOG
[generateScenario] steps: 83
[generateScenario] wrote /Users/knd/chat/chat_dev/scenario/scenario.json
```

- 既定の出力先には既存の `scenario.json` があるため、**実行すると上書きされる**。退避したい場合は事前に `--out` で別名を指定するか、ファイルをコピーしておく。
- ログ 0 件・ディレクトリ不在・不正な `--bin` はエラーメッセージを出して終了する（このとき既存ファイルは変更しない）。
- 出力 JSON は整形（2 スペースインデント）+ 末尾改行。

---

## 生成物の適用フロー

1. 既定では `scenario/scenario.json` が直接上書きされる。
2. 実行中に生成した場合は `scenarioItsuki` が 25 分周期で読み直すため、次のループから反映される。即時反映したい場合は `POST /api/scenario`（実行中なら停止→再起動）か、コマンド `SCENARIO` を使う。
3. スケジュール済みステップの一括停止は `stopAllScenarioTimers()` が担うが、現状どこからも呼ばれていない（未配線）。`stopScenarioItsuki()` は周期実行自体の停止で、こちらも別物。

---

## テスト

```
pnpm -F backend exec vitest run test/scenario/generateScenario.test.ts
```

カバー内容:

- `formatRelativeTime` の整形（ミリ秒省略・整数表記・負値の丸め）
- 複数ログの重ね合わせと中央値時刻
- 代表選定の優先順（ログ数 → 回数 → 辞書順）
- 除外コマンド（`START` / `SCENARIO x` / `LOG PUT`）
- 空ログ・単一ログ
- `excludeCmds` の差し替え

---

## 制約・注意点

- **1 ビン 1 コマンド**: 同一区間に複数コマンドがあっても代表 1 つに間引かれる。`--bin` を小さくすると分解能が上がる代わりにステップ数（`setTimeout` 数）が増える。
- **後半は最長ログ依存**: 短いログしかない時間帯は、長いログにしか出現しないコマンドがそのまま残る（「共通操作」ではない）。
- **typo コマンドも残る**: ログ上の誤入力（`LCICK` 等）は実行時に無視されるだけで、生成物からは除去されない。
- **除外は先頭トークン一致**: `START` を先頭トークンに持つ未想定コマンドも除外される。
- **相対時刻**: 生成シナリオの時間は読み込み（実行）時点からの相対。絶対時刻での再生が必要なら absolute 形式への変換が別途必要。
- `dist/` には含まれない（`src/scenario/generateScenario.ts` は実行時コードから import されないため、`tsc` の依存グラフに乗らない）。

# VOICE 読み上げ

> 最終更新: 2026-11-08
> 対象: `VOICE` コマンド、`voiceFromServer`、`/api/voice`、`left` / `right` パスでの
> パン再生。

## 概要

`VOICE` は、コマンドやキーボード入力をクライアント端末に読み上げさせるモードです。
読み上げ対象は `cmdState.VOICE` に入っているクライアントです。
中央パスではブラウザの Web Speech API (`SpeechSynthesisUtterance`) を使います。
英語 (`en-*`) も中央パスでは `speechSynthesis` を使い、`pickVoice()` で
端末の標準的な英語音声（macOS なら `Samantha` など）を優先します。

`SpeechSynthesisUtterance` の音声出力は Web Audio のグラフを通らないため、
`left` / `right` パスの `masterPanner` ではパンを適用できません。
そこで `left` / `right` パスだけ、`/api/voice` が macOS の `say` で生成した WAV を
`AudioBufferSourceNode -> GainNode -> masterPanner` で再生します。

| パス | 読み上げ経路 | パン |
| --- | --- | --- |
| 通常パス（日本語・英語） | `speechSynthesis` | なし（中央） |
| `left` / `right` | `/api/voice` の WAV を Web Audio で再生 | 左 / 右 |
| `/api/voice` 不可・生成失敗 | `speechSynthesis` にフォールバック | なし（中央） |

---

## コマンドと状態

### コマンド

| 入力 | 動作 | 実装 |
| --- | --- | --- |
| `VOICE` | その端末の VOICE モードをトグル | `parameterChange/voiceChange.ts` |
| `VOICE JA` / `VOICE JP` | 読み上げ言語を `ja-JP` にする | `cmd/splitSpace/index.ts` |
| `VOICE EN` / `VOICE US` | 読み上げ言語を `en-US` にする | 同上 |
| `VOICE <text>` | 指定テキストを読み上げる（言語は現在の `voiceLang`） | 同上 |
| `<index> VOICE` | 指定 index の端末の VOICE モードをトグル | `cmd/splitSpace/numTarget.ts` |
| `<index> VOICE ON` / `OFF` | 指定 index の端末の VOICE モードを ON / OFF | 同上 |

補足:

- `VOICE` 単体は空白を含まないため `receiveEnter` → `execEnter` の経路で
  `voiceChange()` が呼ばれます。
- `VOICE <text>` は `splitSpace` の `VOICE` 分岐で `voiceEmit(text, source)` を呼びますが、
  送信元が `cmdState.VOICE` に入っていない場合は送信されません（読み上げモード ON が前提）。
- `VOICE ON` / `VOICE OFF` を単体で入力した場合は、現状は ON/OFF トグルではなく
  「ON」「OFF」というテキストの読み上げ要求として扱われます。指定端末の ON/OFF は
  `<index> VOICE ON|OFF` を使用してください。
- `ALL VOICE ...` は `splitSpace` の `ALL` 分岐に入りますが、`VOICE` 固有の一括処理は
  実装されていません。

`VOICE` モードの実体は `cmdState.VOICE: string[]`（クライアント ID の配列）です。
`voiceChange()` は対象クライアント ID を追加 / 削除し、`VOICE: true/false` を表示します。

### 読み上げ言語

`cmdState.voiceLang` が読み上げ言語です（既定 `en-US`）。
`VOICE JA` / `VOICE EN` で変更され、`voiceFromServer` の `lang` として送られます。

### 読み上げ対象の決定

バックエンドの `voiceEmit(text, target?)` が `cmdState.VOICE` を参照します。

- `target` がクライアント ID: その ID が `cmdState.VOICE` に含まれる場合だけ送信。
- `target` が `undefined` / `all` / `ALL` / `scenario`: `cmdState.VOICE` の全員に送信。
- `text` が空文字・空白のみ: 送信しない。
- `cmdState.VOICE` が空: 送信しない。

ペイロードは次の形です。

```ts
{
  type: "voiceFromServer",
  data: { text: string, lang: string }
}
```

> 2026-09-20 のコミットで `voiceEmit` の送信処理がコメントアウトされ、VOICE 読み上げは
> 一時的に無効でした。2026-11-08 に `voiceEmit(text, target?)` として復活させています。

---

## 全体フロー

```
[クライアント A で Enter]
        │
        ▼
receiveEnter / execEnter / splitSpace
        │  voiceEmit(text, A)
        ▼
cmdState.VOICE に A が含まれる？
        │ yes
        ▼
io.to(A).emit("voiceFromServer", { text, lang: cmdState.voiceLang })
        │
        ▼
フロントエンド voice(data)
        │
        ├─ left / right かつ masterPanner あり
        │     │
        │     ▼
        │  GET /api/voice?text=...&lang=...
        │     │
        │     ▼
        │  macOS say → WAV
        │     │
        │     ▼
        │  decodeAudioData
        │     │
        │     ▼
        │  AudioBufferSourceNode → GainNode → masterPanner → muteGain → destination
        │
        └─ 中央パン / 生成失敗
              │
              ▼
           speechSynthesis.speak(utterance)
```

---

## バックエンド

### `voiceEmit`

`packages/backend/src/socket/ioEmit.ts`

```ts
export const voiceEmit = (text: string, target?: string) => {
  if (text === undefined || text.trim() === "") return;
  if (cmdState.VOICE.length === 0) return;

  const broadcast =
    target === undefined ||
    target === "all" ||
    target === "ALL" ||
    target === "scenario";
  const targets = broadcast
    ? cmdState.VOICE
    : cmdState.VOICE.filter((id) => id === target);

  targets.forEach((id) => {
    ioState?.io?.to(id)?.emit("voiceFromServer", {
      text,
      lang: cmdState.voiceLang,
    });
  });
};
```

主な呼び出し元:

| ファイル | 用途 |
| --- | --- |
| `cmd/receiveEnter.ts` | 通常コマンド / 不明コマンド / STOP の読み上げ |
| `cmd/execEnter.ts` | `cmdList` のコマンド読み上げ |
| `cmd/execStop.ts` | `STOP` の読み上げ |
| `cmd/execStreamPreparation.ts` | `CHAT` / `RECORD` / ストリームの読み上げ |
| `cmd/splitSpace/index.ts` | スペース区切りコマンドの読み上げ |
| `schedule/scheduleSplitCmd.ts` | 予約実行コマンドの読み上げ |
| `stream/recordEmit.ts` | `RECORD` の読み上げ（VOICE モードの各クライアントへ） |

`voiceEmit` の第2引数はクライアント ID です。以前の `(text, lang, target?)` 形式では
呼び出し側が言語と ID を取り違えていたため、現在は `cmdState.voiceLang` を内部で使います。

### `GET /api/voice`

`packages/backend/src/app.ts`

| 項目 | 内容 |
| --- | --- |
| メソッド / パス | `GET /api/voice` |
| クエリ | `text`（必須、最大 1000 文字）、`lang`（省略時 `en-US`） |
| 成功時 | `200 OK` / `Content-Type: audio/wav` |
| キャッシュ | `Cache-Control: public, max-age=3600` |
| 400 | `text` が空 |
| 413 | `text` が 1000 文字超 |
| 501 | macOS 以外（`say` 非対応） |
| 502 | `say` の実行・WAV 生成失敗 |
| 500 | その他の例外 |

```http
GET /api/voice?text=STOP&lang=en-US
```

`/api/voice` は `/:name` のフォールバックより前に登録されています。
CORS はアプリ全体の `allowCrossDomain` により全許可です。

### `synthesizeVoice`

`packages/backend/src/voice/synthesizeVoice.ts`

1. `process.platform === "darwin"` 以外は `null` を返す。
2. テキストを trim し、空・1000 文字超は `null` を返す。
3. 同じ `lang + text` のキャッシュがあれば返す。
4. 同じキーの生成中リクエストがあれば、その Promise を共有する。
5. 一時ディレクトリ `os.tmpdir()/chat-voice-*` を作成し、テキストを UTF-8 ファイルへ書く。
6. `say` を実行する。

```bash
say -v Kyoko -f <text.txt> -o <voice.wav> \
  --file-format=WAVE --data-format=LEI16@22050
```

- `ja` で始まる言語 → `Kyoko`
- `en` で始まる言語 → `Samantha`
- 指定した声が見つからない場合は `-v` なしで再試行

7. WAV を読み込み、メモリキャッシュへ保存して返す。
8. `finally` で一時ディレクトリを削除する。

キャッシュは最大 50 件 / 20MiB です。テキストはシェルを介さず `execFile` の
引数と一時ファイルで渡すため、シェルインジェクションはありません。

> `say` は macOS 専用です。Linux などでは `/api/voice` が 501 を返し、
> フロントエンドは `speechSynthesis` にフォールバックします。

---

## フロントエンド

### `voice()`

`packages/frontend/src/voice.ts`

```ts
type VoiceData = { text: string; lang: string; volume?: number };

export const voice = async (data: VoiceData): Promise<void> => {
  // 中央パンは speechSynthesis で発話する。speechSynthesis の出力は Web Audio の
  // グラフ外なので、left/right パスのパン付き再生だけ /api/voice を使う。
  if (await playServerVoice(data)) return;
  try {
    speakWithSpeechSynthesis(data);
  } catch (error) {
    console.warn("speechSynthesis failed", error);
  }
};
```

#### テキストの整形

20 文字以上かつ半角スペースを含まないテキストは、すべての文字の間にスペースを
挿入します。`speechSynthesis` とサーバー TTS で読み方を揃えるため、両方で同じ
`formatSpeechText()` を使います。

例: `ABCDEFGHIJKLMNOPQRST` → `A B C D E F G H I J K L M N O P Q R S T`

#### サーバー音声再生（`playServerVoice`）

次のすべてを満たす場合だけ `/api/voice` を使います。

1. `contextState.audioContext` がある
2. `stereoPannerState.masterPanner` がある
3. `fetch` が使える
4. `serverVoiceUnavailable` が `false`
5. `stereoPannerState.masterPannerParam !== 0`（`left` / `right` パス）

中央パン (`masterPannerParam === 0`) は常に `speechSynthesis` を使うため、
`/api/voice` は呼びません。Linux など `/api/voice` が使えない環境では
`speechSynthesis` にフォールバックします（パンは適用されません）。

処理:

1. `text` と `lang` を `URLSearchParams` でエンコードして `GET /api/voice` を呼ぶ。
2. `404` / `501` の場合は `serverVoiceUnavailable = true` にして以後フォールバック。
3. `Content-Type` が `audio/` で始まることを確認。
4. `arrayBuffer()` → `decodeAudioData()`。
5. `AudioBufferSourceNode → GainNode → masterPanner` で再生。
6. `data.volume` があれば `GainNode.gain.value` に反映（未指定は 1）。

`masterPanner` に直接接続するため、`GAIN` UI の `MASTER` ゲインは VOICE 読み上げには
影響しません（従来の `speechSynthesis` と同じ扱いです）。

#### speechSynthesis（中央パス）

`speechSynthesis` / `SpeechSynthesisUtterance` が使える場合、次の優先順で voice を選びます。

1. 英語 (`en-*`) の場合、既知の標準的な女性音声（`Samantha`、`Google US English`、
   `Microsoft Aria` / `Jenny` / `Zira` など）のうち、`lang` と完全一致するもの
2. 英語の場合、同じく女性音声のうち `en-*` に一致するもの
3. `lang` と完全一致
4. `lang` の言語部分（`ja-JP` → `ja`）で前方一致
5. `en-US`

優先する voice 名は `packages/frontend/src/voice.ts` の `preferredEnglishVoices` に
定義しています。`onvoiceschanged` でも同じ選択を再適用します。
`speechSynthesis.getVoices()` は初回空のことがあるため、モジュール読み込み時にも
呼び出して voice 一覧を早めに読み込みます。

`speechSynthesis` の出力は Web Audio の `muteGain` を通らないため、MUTE 中は
新しい発話を開始せず、`onMuteChange` で再生中の発話を `cancel()` します。
left/right のサーバーTTSは `masterPanner → muteGain` を通るため、MUTE は
`muteGain` で適用されます。

#### `voiceFromServer` ハンドラ

`packages/frontend/src/socket.ts`

```ts
socketState.socket.on(
  "voiceFromServer",
  (data: { text: string; lang: string }) => {
    void voice(data);
  },
);
```

### 音声グラフ

```
VOICE（left/right・サーバーTTS）
  AudioBufferSourceNode → GainNode → masterPanner → muteGain → destination

VOICE（中央パス・speechSynthesis）
  SpeechSynthesisUtterance → OS の音声出力（Web Audio の外）

その他の Web Audio
  masterGain → masterPanner → destination
```

---

## パスによる挙動

`packages/frontend/src/webaudio/init/initAudio.ts` が URL パスを見て
`stereoPannerState.masterPannerParam` を設定します。

| URL パスに含まれる文字列 | `masterPannerParam` | パン |
| --- | --- | --- |
| `left` | `-1` | 左 |
| `right` | `+1` | 右 |
| それ以外 | `0` | 中央 |

`left` が `right` より先に判定されます。`masterPanner` は
`masterGain` の後段として `destination` に接続されます。

---

## テスト

| テスト | 内容 |
| --- | --- |
| `packages/backend/test/socket/ioEmit/voiceEmit.test.ts` | VOICE モードなしは送信しない / 対象クライアントだけに送る / `all`・`ALL`・`scenario` は全員 / 非 VOICE クライアントは送らない |
| `packages/backend/test/voice/synthesizeVoice.test.ts` | 空文字・1000 文字超は生成しない |
| `packages/frontend/test/voice/voice.test.ts` | 中央パンは speechSynthesis / パンありは `/api/voice` を Web Audio で再生 / 英語の女性音声優先 / MUTE 中は発話しない / 失敗時は speechSynthesis にフォールバック |

実行:

```bash
pnpm -F backend exec vitest run
pnpm -F frontend exec vitest run
```

---

## 既知の注意点

- **macOS 限定**: left/right のパン付き読み上げは、バックエンドが macOS の
  `say` を実行できる場合のみ動作します。Linux などでは `/api/voice` が 501 を返し、
  `speechSynthesis`（パンなし）になります。
- **声質**: 中央パスはブラウザ / OS の `speechSynthesis` 音声、left/right は
  macOS のシステム音声（`Kyoko` / `Samantha`）になります。left/right で声が
  インストールされていない場合は `say` の既定音声になります。
- **遅延**: left/right のサーバーTTS読み上げは `say` の生成と HTTP 取得の分だけ、
  中央パスより開始が遅れます。中央パスはローカル発話のため、この遅延はありません。
- **順序**: left/right で複数の読み上げを短時間に実行した場合、HTTP / デコードの
  完了順によっては前後する可能性があります（現状は読み上げキューを持っていません）。
  中央パスの `speechSynthesis` はブラウザ側でキューされます。
- **MUTE**: 中央パスの `speechSynthesis` は `muteGain` を通らないため、MUTE 中は
  新しい発話を開始せず、再生中の発話を `cancel()` します。left/right のサーバーTTSは
  `muteGain` でミュートされます。
- **認証・レート制限**: `/api/voice` は認証なしで、テキスト 1000 文字・キャッシュ 20MiB の
  上限だけがあります。公開範囲が広い環境ではレート制限を検討してください。
- **Vite dev**: `vite.config.ts` に `/api` の proxy がないため、Vite dev server 経由では
  left/right の `/api/voice` が 404 または `audio/` 以外の応答になり、`speechSynthesis` に
  フォールバックします。中央パスの読み上げには影響しません。パン付き読み上げを確認する
  場合は `pnpm -F frontend build` 後に backend から配信してください。
- **旧 Safari / Web Audio 非対応環境**: `fetch` や `AudioContext` が使えない場合は
  `speechSynthesis` にフォールバックします。`html/snowleopard.html` も同じです。
- **VOICE の復活**: `voiceEmit` は一時的に無効化されていました。現在は
  `cmdState.VOICE` によるフィルタ付きで復活しています。

---

## 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `packages/backend/src/app.ts` | `GET /api/voice` |
| `packages/backend/src/voice/synthesizeVoice.ts` | `say` による WAV 生成・キャッシュ |
| `packages/backend/src/socket/ioEmit.ts` | `voiceEmit` / `voiceFromServer` 送信 |
| `packages/backend/src/state/states/cmdState.ts` | `VOICE` / `voiceLang` |
| `packages/backend/src/parameterChange/voiceChange.ts` | VOICE モードのトグル |
| `packages/backend/src/cmd/splitSpace/index.ts` | `VOICE JA/EN/<text>` の解析 |
| `packages/backend/src/cmd/receiveEnter.ts` | コマンド入力から `voiceEmit` を呼ぶ |
| `packages/backend/src/cmd/execEnter.ts` | `cmdList` の読み上げ |
| `packages/backend/src/stream/recordEmit.ts` | `RECORD` の読み上げ |
| `packages/frontend/src/voice.ts` | 中央パスの speechSynthesis / left/right のサーバー音声再生 |
| `packages/frontend/src/socket.ts` | `voiceFromServer` ハンドラ |
| `packages/frontend/src/webaudio/init/initAudio.ts` | `left` / `right` のパン設定 |
| `packages/frontend/src/state/webAudio/stereoPannerState.ts` | `masterPanner` / `masterPannerParam` |

---

## 変更履歴

- **2026-11-08**: `voiceEmit` を復活。`left` / `right` 用の `/api/voice`（macOS `say`）と
  Web Audio パン再生、speechSynthesis フォールバック、テストを追加。
- **2026-11-08 (2)**: 英語音声を標準的な女性音声に統一。英語は中央パンでも
  `/api/voice`（`Samantha`）を優先し、ブラウザ既定音声が日本語になる環境を回避。
- **2026-11-08 (3)**: レイテンシー短縮のため、中央パンは英語を含めて `speechSynthesis` に
  戻し、`/api/voice` は left/right パスのみで使うよう変更。MUTE 時の発話停止も追加。
- **2026-09-20**: `voiceEmit` の送信処理がコメントアウトされ、VOICE 読み上げが無効化。

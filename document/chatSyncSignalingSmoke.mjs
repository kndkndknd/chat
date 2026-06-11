// chat_sync シグナリング契約のヘッドレス smoke test。
//
// /webrtc ブラウザ (SyncClient) が依存する chat_sync の挙動を、ブラウザ無しで検証する:
//   - itsuki- プレフィックスのピアは入室でき (営業時間ゲートをバイパス)
//   - itsuki 在席時は visitor が入室でき、役割が peer-joined(offerer)/peer-ready(answerer) に割り当たる
//   - offer / answer / ice-candidate が宛先へ 1:1 リレーされる
//   - itsuki-required: itsuki が居ない room では visitor が not-available で弾かれる
//
// 前提: ローカル chat_sync が ws://localhost:3000/ws で起動していること
//       (document/WebRTC-E2E.md「Path B」参照)。
// 実行: chat_sync backend の node_modules がある場所から
//       node <このファイル>           ※ 'ws' を解決できるディレクトリで実行する
//
// 環境変数:
//   CHAT_SYNC_WS   接続先 (既定 ws://localhost:3000/ws)
//   DEBUG_TOKEN    営業時間バイパス用トークン (chat_sync server.ts の DEBUG_TOKEN と一致)

import WebSocket from "ws";

const BASE = process.env.CHAT_SYNC_WS ?? "ws://localhost:3000/ws";
const DEBUG_TOKEN = process.env.DEBUG_TOKEN ?? "knd-dbg-7af93e2b6c5d";
const DEBUG = `?debug=${DEBUG_TOKEN}`;
const ROOM = "chat sync";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function peer(peerId, q = "") {
  const ws = new WebSocket(BASE + q);
  const inbox = [];
  const waiters = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    inbox.push(msg);
    const i = waiters.findIndex((w) => w.type === msg.type);
    if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
  });
  const open = new Promise((res) => ws.on("open", res));
  return {
    peerId, ws, inbox,
    async ready() { await open; },
    send(o) { ws.send(JSON.stringify(o)); },
    join(roomId = ROOM) { ws.send(JSON.stringify({ type: "join", roomId, peerId })); },
    expect(type, ms = 1500) {
      const found = this.inbox.find((m) => m.type === type);
      if (found) return Promise.resolve(found);
      return Promise.race([
        new Promise((resolve) => waiters.push({ type, resolve })),
        wait(ms).then(() => {
          throw new Error(`timeout waiting for '${type}' (got: ${this.inbox.map((m) => m.type).join(",") || "none"})`);
        }),
      ]);
    },
    close() { ws.close(); },
  };
}

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

try {
  // --- Case 1: itsuki 在席 -> visitor 入室可・役割分配・リレー ---
  const itsuki = peer("itsuki-test01"); // 本番は SyncClient の itsuki-xxxx 相当
  await itsuki.ready();
  itsuki.join();
  await itsuki.expect("joined");
  check("itsuki joins room (joined)", true);

  const visitor = peer("visitor01", DEBUG); // 営業時間外でも検証できるよう debug でバイパス
  await visitor.ready();
  visitor.join();
  const vJoined = await visitor.expect("joined");
  check("visitor allowed when itsuki present (joined)", vJoined.type === "joined");

  const pj = await itsuki.expect("peer-joined");
  check("itsuki receives peer-joined (offerer role)", pj.peerId === "visitor01", `peerId=${pj.peerId}`);
  const pr = await visitor.expect("peer-ready");
  check("visitor receives peer-ready (answerer role)", pr.peerId === "itsuki-test01", `peerId=${pr.peerId}`);

  itsuki.send({ type: "offer", sdp: { type: "offer", sdp: "v=0-FAKE" }, to: "visitor01", from: "itsuki-test01" });
  const offer = await visitor.expect("offer");
  check("offer relayed to visitor with from", offer.from === "itsuki-test01" && offer.sdp?.sdp === "v=0-FAKE");

  visitor.send({ type: "answer", sdp: { type: "answer", sdp: "v=0-FAKEANS" }, to: "itsuki-test01", from: "visitor01" });
  const ans = await itsuki.expect("answer");
  check("answer relayed back to itsuki", ans.from === "visitor01" && ans.sdp?.sdp === "v=0-FAKEANS");

  visitor.send({ type: "ice-candidate", candidate: { candidate: "cand-from-visitor" }, to: "itsuki-test01", from: "visitor01" });
  const ice = await itsuki.expect("ice-candidate");
  check("ice-candidate relayed visitor->itsuki", ice.candidate?.candidate === "cand-from-visitor");

  // --- Case 2: itsuki-required ゲート ---
  const lonelyVisitor = peer("visitor99", DEBUG);
  await lonelyVisitor.ready();
  lonelyVisitor.join("empty-room-no-itsuki");
  const gate = await lonelyVisitor.expect("not-available");
  check("itsuki-required: visitor rejected when no itsuki (not-available)", gate.type === "not-available");

  itsuki.close();
  visitor.close();
  lonelyVisitor.close();
} catch (e) {
  check("unexpected error", false, e.message);
}

await wait(200);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== ${results.length - failed}/${results.length} passed ===`);
process.exit(failed ? 1 : 0);

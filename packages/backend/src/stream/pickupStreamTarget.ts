import { streamState, clientState } from "../state";

const isActiveStreamClient = (id: string): boolean =>
  clientState.client[id]?.stream === true;

const activeStreamClients = (): string[] =>
  clientState.streamClient.filter(isActiveStreamClient);

const activeTargets = (stream: string): string[] =>
  (streamState.target[stream] ?? []).filter(isActiveStreamClient);

const pickRandom = (arr: string[]): string =>
  arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "";

export const pickupStreamTarget = (stream: string, from?: string): string => {
  let targetArr = activeTargets(stream);
  if (stream === "CHAT" && from !== undefined) {
    targetArr = targetArr.filter((id) => id !== from);
  }

  if (targetArr.length > 0) {
    if (targetArr.length === 1) return targetArr[0];
    return pickRandom(targetArr);
  }

  // 明示的な from が有効なら、対象が空になった場合はそれを優先する。
  if (from !== undefined && isActiveStreamClient(from)) {
    return from;
  }

  return pickRandom(activeStreamClients());
};

export const pickupPaStreamTarget = (): string =>
  pickRandom(clientState.paStreamClient.filter(isActiveStreamClient));

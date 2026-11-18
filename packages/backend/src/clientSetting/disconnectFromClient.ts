import {
  bpmState,
  clientState,
  cmdState,
  currentState,
  previousState,
  streamState,
} from "../state";

const withoutId = (list: string[], id: string): string[] =>
  list.filter((item) => item !== id);

/**
 * 切断したクライアント ID を、メモリ上の全参照から除去する。
 * bpmState / clientState は in-memory、target / loop / cmd / VOICE は
 * 永続化対象なので、filter 代入や delete で Redis 側も更新される。
 */
export const removeClientState = (id: string): void => {
  delete clientState.client[id];
  delete bpmState[id];
  if (clientState.arduinoClient) {
    delete clientState.arduinoClient[id];
  }

  clientState.cmdClient = withoutId(clientState.cmdClient, id);
  clientState.streamClient = withoutId(clientState.streamClient, id);
  clientState.paCmdClient = withoutId(clientState.paCmdClient, id);
  clientState.paStreamClient = withoutId(clientState.paStreamClient, id);
  clientState.sinewaveClient = withoutId(clientState.sinewaveClient, id);

  for (const stream of Object.keys(streamState.target)) {
    streamState.target[stream] = withoutId(
      streamState.target[stream] ?? [],
      id,
    );
  }
  for (const stream of Object.keys(streamState.loop)) {
    streamState.loop[stream] = withoutId(
      streamState.loop[stream] ?? [],
      id,
    );
  }
  for (const cmd of Object.keys(currentState.cmd)) {
    currentState.cmd[cmd] = withoutId(currentState.cmd[cmd], id);
  }
  delete currentState.sinewave[id];

  for (const cmd of Object.keys(previousState.cmd)) {
    previousState.cmd[cmd] = withoutId(previousState.cmd[cmd], id);
  }
  delete previousState.sinewave[id];

  cmdState.VOICE = withoutId(cmdState.VOICE, id);
};

/**
 * 起動時に、Redis から復元したクライアント依存 state から
 * 現在接続中の clientState.client に存在しない ID を除去する。
 */
export const sanitizeClientReferences = (): void => {
  const active = new Set(Object.keys(clientState.client));
  const keepActive = (list: string[]): string[] =>
    list.filter((id) => active.has(id));

  clientState.cmdClient = keepActive(clientState.cmdClient);
  clientState.streamClient = keepActive(clientState.streamClient);
  clientState.paCmdClient = keepActive(clientState.paCmdClient);
  clientState.paStreamClient = keepActive(clientState.paStreamClient);
  clientState.sinewaveClient = keepActive(clientState.sinewaveClient);

  for (const stream of Object.keys(streamState.target)) {
    streamState.target[stream] = keepActive(
      streamState.target[stream] ?? [],
    );
  }
  for (const stream of Object.keys(streamState.loop)) {
    streamState.loop[stream] = keepActive(
      streamState.loop[stream] ?? [],
    );
  }
  for (const cmd of Object.keys(currentState.cmd)) {
    currentState.cmd[cmd] = keepActive(currentState.cmd[cmd]);
  }
  for (const id of Object.keys(currentState.sinewave)) {
    if (!active.has(id)) delete currentState.sinewave[id];
  }

  for (const cmd of Object.keys(previousState.cmd)) {
    previousState.cmd[cmd] = keepActive(previousState.cmd[cmd]);
  }
  for (const id of Object.keys(previousState.sinewave)) {
    if (!active.has(id)) delete previousState.sinewave[id];
  }

  cmdState.VOICE = keepActive(cmdState.VOICE);
};

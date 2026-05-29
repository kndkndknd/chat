import { clientState } from "../state";
import { ioState } from "../state/states/ioState";

export const buildPayload = (id: string) => {
  const c = clientState.client[id];
  if (!c) return null;
  return {
    facedetection: c.facedetection,
    hanged: c.hanged,
  };
};

export const emitClientSettings = (id: string): void => {
  const payload = buildPayload(id);
  if (!payload) return;
  ioState.io?.to(id).emit("clientSettingsFromServer", payload);
};

export const broadcastClientSettings = (): void => {
  Object.keys(clientState.client).forEach((id) => emitClientSettings(id));
};

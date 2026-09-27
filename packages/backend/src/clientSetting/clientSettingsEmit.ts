import { clientState } from "../state";
import { clientSettingEmit } from "../socket/ioEmit";

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
  clientSettingEmit(payload, id);

};

export const broadcastClientSettings = (): void => {
  Object.keys(clientState.client).forEach((id) => emitClientSettings(id));
};

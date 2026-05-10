import { clientState } from "../state";
import { ioState } from "../state/states/ioState";
import { personDetectState } from "../state/states/personDetectState";

const PERSON_DETECT_TIMEOUT_MS = 15 * 60 * 1000;

const buildPayload = (id: string) => {
  const c = clientState.client[id];
  if (!c) return null;
  return {
    facedetection: c.facedetection && personDetectState.flag,
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

export const triggerLeftPersonDetect = (): void => {
  const wasFlag = personDetectState.flag;
  if (personDetectState.timeoutId) clearTimeout(personDetectState.timeoutId);
  personDetectState.flag = true;
  personDetectState.timeoutId = setTimeout(() => {
    personDetectState.flag = false;
    personDetectState.timeoutId = null;
    broadcastClientSettings();
  }, PERSON_DETECT_TIMEOUT_MS);
  if (!wasFlag) broadcastClientSettings();
};

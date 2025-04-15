import { arduinoStateType } from "../../../../../types";

export const arduinoState: arduinoStateType = {
  host: "pi5.local",
  port: 5050,
  connected: false,
  relay: "off",
};

export const m5State: arduinoStateType = {
  host: "m5stack.local",
  port: 80,
  connected: false,
  relay: "off",
};

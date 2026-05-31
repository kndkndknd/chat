import { m5StateType } from "../../../../types";

// 回転するほう
export const m5State: m5StateType = {
  rotation: {
    host: "192.168.42.142",
    port: 80,
    connected: false,
    relay: "off",
  },
  vibration: {
    host: "192.168.42.242",
    port: 80,
    connected: false,
    relay: "off",
  }
};


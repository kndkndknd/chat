// import { time } from "console";
import { m5State } from "./m5State";
// import axios from "axios";
// import { stat } from "fs";

// const requestHost = "http://" + arduinoState.host + arduinoState.port;
// let requestHost = `http://${m5State.host}:${m5State.port}`;
let RELAY_HOST = `http://${m5State.rotation.host}`;

type RelayResponse = {
  relay: boolean;
};

type RelayErrorResponse = {
  error: string;
};

/**
 * リレーをON/OFF制御する
 * @param value true でON、false でOFF
 * @returns 設定後のリレー状態
 */
export async function m5Switch(type: "rotation" | "vibration", value: boolean): Promise<boolean> {
  const res = await fetch(`${RELAY_HOST}/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "relay", value }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<RelayErrorResponse>;
    throw new Error(
      `Relay request failed: ${res.status} ${res.statusText}${err.error ? ` - ${err.error}` : ""}`
    );
  }

  const data = (await res.json()) as RelayResponse;
  m5State[type].relay = value ? "on" : "off";
  return data.relay;
}

/**
 * 現在のリレー状態を取得する
 */
export async function m5Test(type: "rotation" | "viberation"): Promise<boolean> {
  const res = await fetch(`http://${m5State[type].host}/relay`, { method: "GET" });

  if (!res.ok) {
    throw new Error(`Relay status request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as RelayResponse;
  return data.relay;
}


// export const m5Test = async () => {
//   const requestUrl = `${requestHost}/test`;
//   console.log(requestUrl);
//   /*
//   const response = await fetch(
//     `http://${arduinoState.host}:${arduinoState.port}/test`
//   );
//   */
//   try {
//     const response = await fetch(requestUrl);
//     console.log(response);
//     const data = await response.text();
//     if (data === "ok") {
//       console.log("Arduino connected");
//       m5State.connected = true;
//       return true;
//     } else {
//       console.log("Arduino not connected");
//       m5State.connected = false;
//       return false;
//     }
//   } catch (e) {
//     console.log("fetch error", e);
//     m5State.connected = false;
//     return false;
//   }
// };

// export const m5Switch = async (param?: "on" | "off") => {
//   console.log("m5 switchCtrl");
//   const relay = param ? param : m5State.relay === "on" ? "off" : "on";
//   // let relay: "on" | "off" = m5State.relay === "on" ? "off" : "on";
//   // const requestUrl = `${requestHost}/${relay}`;
//   const requestUrl = `${requestHost}/relay`;
//   // const body = { type: "relay", value: param === "on" ? true : false };
//   const body = { relay : param === "on" ? true : false };
//   console.log(requestUrl);
//   try {
//     const response = await fetch(requestUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(body),
//     });
//     const data = await response.text();
//     if (
//       (param === "on" && data === `{"relay":true}`) ||
//       (param === "off" && data === `{"relay":false}`)
//     ) {
//       console.log("m5Switch", data);
//       m5State.relay = param;
//       return true;
//     } else {
//       console.log("m5Switch error", data);
//       return false;
//     }
//   } catch (e) {
//     console.log("fetch error", e);
//     return false;
//   }
// };

export const m5SetIpAddress = async (ip: string, type: "rotation" | "vibration") => {
  m5State[type].host = ip;
  RELAY_HOST = `http://${m5State[type].host}`;
  console.log("m5SetIpAddress", m5State[type].host);
  // const result = await m5Test();
  // return result;
  return "done";
};

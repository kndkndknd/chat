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

/** M5STACK との通信タイムアウト(ms)。応答がない端末でハングし続けるのを防ぐ */
const M5_FETCH_TIMEOUT_MS = 5_000;

/**
 * タイムアウト付き fetch。指定時間で abort し、ネットワーク無応答による無限待機を防ぐ
 */
async function m5Fetch(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), M5_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * リレーをON/OFF制御する
 * @param value true でON、false でOFF
 * @returns 設定後のリレー状態。通信失敗時は例外を投げず false を返す
 */
export async function m5Switch(type: "rotation" | "vibration", value: boolean): Promise<boolean> {
  try {
    const res = await m5Fetch(`${RELAY_HOST}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "relay", value }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as Partial<RelayErrorResponse>;
      console.error(
        `[m5Switch] Relay request failed (${type}): ${res.status} ${res.statusText}${err.error ? ` - ${err.error}` : ""}`
      );
      m5State[type].connected = false;
      return false;
    }

    const data = (await res.json()) as RelayResponse;
    m5State[type].relay = value ? "on" : "off";
    m5State[type].connected = true;
    return data.relay;
  } catch (e) {
    // ネットワークエラー・タイムアウト・JSONパース失敗などをすべて捕捉し、
    // サーバプロセスを巻き込んで落とさないようにする
    console.error(
      `[m5Switch] communication error (${type}):`,
      e instanceof Error ? e.message : e
    );
    m5State[type].connected = false;
    return false;
  }
}

/**
 * 現在のリレー状態を取得する
 * @returns リレー状態。通信失敗時は例外を投げず false を返す
 */
export async function m5Test(type: "rotation" | "vibration" = "rotation"): Promise<boolean> {
  try {
    const res = await m5Fetch(`http://${m5State[type].host}/relay`, { method: "GET" });

    if (!res.ok) {
      console.error(
        `[m5Test] Relay status request failed (${type}): ${res.status} ${res.statusText}`
      );
      m5State[type].connected = false;
      return false;
    }

    const data = (await res.json()) as RelayResponse;
    m5State[type].connected = true;
    return data.relay;
  } catch (e) {
    console.error(
      `[m5Test] communication error (${type}):`,
      e instanceof Error ? e.message : e
    );
    m5State[type].connected = false;
    return false;
  }
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

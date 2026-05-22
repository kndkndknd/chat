import { time } from "console";
import { m5State } from "./m5State";
import axios from "axios";
import { stat } from "fs";

// const requestHost = "http://" + arduinoState.host + arduinoState.port;
let requestHost = `http://${m5State.host}:${m5State.port}`;

export const m5Test = async () => {
  const requestUrl = `${requestHost}/test`;
  console.log(requestUrl);
  /*
  const response = await fetch(
    `http://${arduinoState.host}:${arduinoState.port}/test`
  );
  */
  try {
    const response = await fetch(requestUrl);
    console.log(response);
    const data = await response.text();
    if (data === "ok") {
      console.log("Arduino connected");
      m5State.connected = true;
      return true;
    } else {
      console.log("Arduino not connected");
      m5State.connected = false;
      return false;
    }
  } catch (e) {
    console.log("fetch error", e);
    m5State.connected = false;
    return false;
  }
};

export const m5Switch = async (param?: "on" | "off") => {
  console.log("m5 switchCtrl");
  const relay = param ? param : m5State.relay === "on" ? "off" : "on";
  // let relay: "on" | "off" = m5State.relay === "on" ? "off" : "on";
  // const requestUrl = `${requestHost}/${relay}`;
  const requestUrl = `${requestHost}/relay`;
  const body = { type: "relay", value: param === "on" ? true : false };
  console.log(requestUrl);
  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.text();
    if (
      (param === "on" && data === `{"relay":true}`) ||
      (param === "off" && data === `{"relay":false}`)
    ) {
      console.log("m5Switch", data);
      m5State.relay = param;
      return true;
    } else {
      console.log("m5Switch error", data);
      return false;
    }
  } catch (e) {
    console.log("fetch error", e);
    return false;
  }
};

export const m5SetIpAddress = async (ip: string) => {
  m5State.host = ip;
  requestHost = `http://${m5State.host}:${m5State.port}`;
  console.log("m5SetIpAddress", m5State.host);
  // const result = await m5Test();
  // return result;
  return "done";
};

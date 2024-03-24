import { time } from "console";
import { states, basisBufferSize } from "../states";
import axios from "axios";

export const connectTest = async () => {
  const requestUrl = `http://${states.arduino.host}:${states.arduino.port}/test`;
  console.log(requestUrl);
  /*
  const response = await fetch(
    `http://${states.arduino.host}:${states.arduino.port}/test`
  );
  */
  try {
    const response = await fetch(requestUrl);
    console.log(response);
    const data = await response.json();
    if (data.success) {
      console.log("Arduino connected");
      return true;
    } else {
      console.log("Arduino not connected");
      return false;
    }
  } catch (e) {
    console.log("fetch error", e);
    return false;
  }
};

export const switchCtrl = async () => {
  console.log("switchCtrl");
  let relay: "on" | "off" = states.arduino.relay === "on" ? "off" : "on";
  const requestUrl = `http://${states.arduino.host}:${states.arduino.port}/${relay}`;
  console.log(requestUrl);
  try {
    const response = await fetch(requestUrl);
    const data = await response.json();
    states.arduino.relay = data.success ? relay : states.arduino.relay;
    console.log(data.success);
    return data.success;
  } catch (e) {
    console.log("fetch error", e);
    return false;
  }
};

export const switchCramp = async () => {
  const freq = 1000 / (20 * (states.stream.sampleRate.CHAT / 44100));
  const timeout = (1000 * basisBufferSize) / states.stream.sampleRate.CHAT;
  const params = { freq: freq, timeout: timeout };
  // const body = JSON.stringify({ freq: freq, timeout: timeout });
  // console.log(body);
  // // const method = "POST";
  // // const headers = {
  // //   Accept: "application/json",
  // //   "Content-Type": "application/json",
  // // };
  // const options = {
  //   method: "POST",
  //   body: body,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // };
  const url = `http://${states.arduino.host}:${states.arduino.port}/cramp`;
  // const response = await fetch(url, options);
  // return axios
  //   .post(url, { freq: freq, timeout: timeout })
  //   .then((response) => {
  //     console.log(response);
  //     return response.data.success;
  //   })
  //   .catch((error) => {
  //     console.log(error);
  //     return false;
  //   });

  try {
    const response = await axios.get(url, { params: params });
    console.log(response.data);
    return response.data.success;
  } catch (error) {
    console.error("error fetching data:", error);
    return false;
  }

  // const data = await response.json();
  // console.log(data);
  // return data.success;
};

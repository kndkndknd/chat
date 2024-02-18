import { states } from "../states.js";

export const connectTest = async () => {
  const requestUrl = `http://${states.arduino.host}:${states.arduino.port}/test`;
  console.log(requestUrl);
  /*
  const response = await fetch(
    `http://${states.arduino.host}:${states.arduino.port}/test`
  );
  */
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
};

export const switchCtrl = async () => {
  console.log("switchCtrl");
  let relay: "on" | "off" = states.arduino.relay === "on" ? "off" : "on";
  const requestUrl = `http://${states.arduino.host}:${states.arduino.port}/${relay}`;
  console.log(requestUrl);
  const response = await fetch(requestUrl);
  const data = await response.json();
  states.arduino.relay = data.success ? relay : states.arduino.relay;
  console.log(data.success);
  return data.success;
};

export const switchCramp = async () => {
  const response = await fetch(
    `http://${states.arduino.host}:${states.arduino.port}/cramp`
  );
  const data = await response.json();
  return data.success;
};

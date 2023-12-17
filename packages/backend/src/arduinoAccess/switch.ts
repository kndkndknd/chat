import { states } from "../states";

export const switchCtrl = async () => {
  let relay = states.arduino.relay === "on" ? "off" : "on";
  const response = await fetch(
    `http://${states.arduino.host}:${states.arduino.port}/${relay}`
  );
  const data = await response.json();
  return data.success;
};

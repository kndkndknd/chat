import { states } from "../states";

export const connectTest = async () => {
  const response = await fetch(
    `http://${states.arduino.host}:${states.arduino.port}/test`
  );
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

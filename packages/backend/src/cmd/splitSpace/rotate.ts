import { m5Test, m5Switch, m5SetIpAddress } from "../../arduinoAccess/m5Access";

export const rotate = async (cmd: string, io, ip?: string) => {
  if (cmd === "START") {
    io.emit("startRotationFromServer");
    return m5Switch("on");
  } else if (cmd === "STOP") {
    io.emit("stopRotationFromServer");
    return m5Switch("off");
    // arduinoへのGET
  } else if (cmd === "TEST") {
    return m5Test();
  } else if (ip !== undefined && (cmd === "IP" || cmd === "ADDRESS")) {
    return m5SetIpAddress(ip);
  }
};

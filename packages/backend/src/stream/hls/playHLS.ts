import SocketIO from "socket.io";
import { clientState, hlsState } from "../../states";

export const playHLS = (file: string, io: SocketIO.Server) => {
  const notPlayClient = Object.keys(clientState.client).filter((key) => {
    return !hlsState.includes(key);
  });
  const cmd: {
    cmd: string;
    property: string;
    value: number;
    flag: boolean;
    target?: string;
    overlay?: boolean;
    fade?: number;
    portament?: number;
    gain?: number;
    solo?: boolean;
  } = {
    cmd: "HLS",
    property: file,
    value: 0,
    flag: true,
  };

  if (notPlayClient.length > 0) {
    const target = notPlayClient[(Math.random() * notPlayClient.length) | 0];
    io.to(target).emit("cmdFromServer", cmd);
    hlsState.push(target);
  } else if (Object.keys(clientState.client).length > 0) {
    const target = Object.keys(clientState.client)[
      (Math.random() * Object.keys(clientState.client).length) | 0
    ];
    io.to(target).emit("cmdFromServer", cmd);
  }
};

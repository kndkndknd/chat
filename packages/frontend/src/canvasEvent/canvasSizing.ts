import { SocketFacade } from "../socket/SocketFacade";

export function canvasSizing(socket?: SocketFacade) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const width = String(windowWidth);
  const height = String(windowHeight);
  console.log(width);
  console.log(height);
  const cnvsElement = <HTMLCanvasElement>document.getElementById("cnvs");
  cnvsElement.setAttribute("height", height + "px");
  cnvsElement.setAttribute("width", width + "px");
  const bckcnvsElement = <HTMLCanvasElement>document.getElementById("bckcnvs");
  bckcnvsElement.setAttribute("height", height + "px");
  bckcnvsElement.setAttribute("width", width + "px");
  if (socket !== undefined) {
    socket.emit("connectFromClient", {
      clientMode: "client",
      urlPathName: window.location.pathname,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }
}

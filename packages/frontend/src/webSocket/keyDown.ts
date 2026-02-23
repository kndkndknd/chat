import { textPrint, erasePrint } from "../canvasEvent";

export const keyDown = (
  e: KeyboardEvent,
  stringsClient: string,
  clientId: string,
  ws: WebSocket,
  strCnvs = <HTMLCanvasElement>document.getElementById("cnvs"),
  stx = <CanvasRenderingContext2D>(
    (document.getElementById("cnvs") as HTMLCanvasElement).getContext("2d")
  ),
  start?,
) => {
  const character = e.key;

  if (character === "\\") {
    // bassFlag = !bassFlag;
    // stringsClient = "BASS";
    // bass(bassFlag, 0.4);
    // if (bassFlag) {
    //   textPrint(stringsClient, stx, strCnvs);
    // } else {
    //   erasePrint(stx, strCnvs);
    // }
  } else if (
    character === "Eisu" ||
    character == "Meta" ||
    character === "Shift" ||
    character === "Control" ||
    character === "Alt"
  ) {
    console.log(character + " pressed");
  } else {
    if (character === " ") {
    }
    if (/\w/.test(character) && character.length === 1) {
      stringsClient = stringsClient + character.toUpperCase();
      ws.send(
        JSON.stringify({
          type: "char",
          clientId: clientId,
          character: character.toUpperCase(),
        }),
      );
    } else {
      ws.send(
        JSON.stringify({
          type: "char",
          clientId: clientId,
          character: character,
        }),
      );
    }

    console.log(character);

    if (character === "Enter" && stringsClient != "VOICE") stringsClient = "";
    //  erasePrint('strings', stx, strCnvs)
    erasePrint(stx, strCnvs);
    textPrint(stringsClient);
    //  if(ctx) erasePrint('canvas', ctx, cnvs)
  }

  return stringsClient;
};

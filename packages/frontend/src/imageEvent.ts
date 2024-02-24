import { cnvs, ctx, videoElement } from "./globalVariable";
import * as emoji from "node-emoji";

//const videoElement = <HTMLVideoElement>document.getElementById('video');
const cinemaElement = <HTMLVideoElement>document.getElementById("cinema");
const bckcnvsElement = <HTMLCanvasElement>document.getElementById("bckcnvs");
const bckcnvsContext = bckcnvsElement.getContext("2d");
let emojiFlag = false;

export function textPrint(
  text: string,
  stx: CanvasRenderingContext2D,
  strCnvs: HTMLCanvasElement
) {
  stx.fillStyle = "white";
  stx.fillRect(0, 0, strCnvs.width, strCnvs.height);
  console.log("textPrint", text);
  console.log("emojiFlag:", emojiFlag);
  if (!emojiFlag) {
    print(text, stx, strCnvs);
  } else {
    print(emoji.random().emoji, stx, strCnvs);
  }
}

export function eraseText(
  stx: CanvasRenderingContext2D,
  strCnvs: HTMLCanvasElement
) {
  stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
}

export function clearTextPrint(
  text: string,
  stx: CanvasRenderingContext2D,
  strCnvs: HTMLCanvasElement
) {
  stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
  print(text, stx, strCnvs);
}

export function erasePrint(ctx, cnvs) {
  ctx.clearRect(0, 0, cnvs.width, cnvs.height);
  //  ctx.fillStyle = 'white';
  //  ctx.fillRect(0, 0, cnvs.width, cnvs.height);
}

export function canvasSizing() {
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
}

export function initVideo(videoElement) {
  videoElement.play();
  videoElement.volume = 0;
}

export function initVideoStream(stream, videoElement) {
  videoElement.srcObject = stream;
  const cnvsElement = <HTMLCanvasElement>document.createElement("canvas");
  const bufferContext = cnvsElement.getContext("2d");
  let render = () => {
    requestAnimationFrame(render);
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    if (width == 0 || height == 0) {
      return;
    }
    cnvsElement.width = width;
    cnvsElement.height = height;
    if (ctx) {
      bufferContext.drawImage(videoElement, 0, 0);
    }
  };
  render();
}

export function toBase64() {
  const canvasElement = <HTMLCanvasElement>document.createElement("canvas");
  let bufferContext = canvasElement.getContext("2d");
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  if (bufferContext) {
    bufferContext.drawImage(videoElement, 0, 0);
  }
  const returnURL = canvasElement.toDataURL("image/jpeg");
  //  const returnURL = canvasElement.toDataURL()
  //  console.log(returnURL)
  return returnURL;
}

export function renderStart() {
  console.log(videoElement);
  // const canvasElement = <HTMLCanvasElement> document.createElement('canvas')
  // const bufferContext = canvasElement.getContext('2d');
  let render = () => {
    requestAnimationFrame(render);
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    if (width == 0 || height == 0) {
      return;
    }
    cnvs.width = width;
    cnvs.height = height;
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0);
    }
  };
  render();
}

export function showImage(url: string, receive_ctx: CanvasRenderingContext2D) {
  //canvasSizing()
  console.log(url.slice(0, 50));
  const image = new Image();
  try {
    image.src = url;
    image.onload = () => {
      const aspect = image.width / image.height;
      let hght = window.innerHeight;
      let wdth = hght * aspect;
      if (aspect > window.innerWidth / window.innerHeight) {
        hght = wdth / aspect;
        wdth = window.innerWidth;
      }
      const x = window.innerWidth / 2 - wdth / 2;
      const y = 0;
      //console.log("width:" + String(wdth) + ",height:" + String(hght) + ", x:"+ x + ", y:"+ y)
      receive_ctx.drawImage(image, x, y, wdth, hght);
      //receive_ctx.drawImage(image, 0, 0);
    };
  } catch (error) {
    console.log("showImage error: ", error);
  }
}

const print = (
  text: string,
  target: CanvasRenderingContext2D,
  cnvs: HTMLCanvasElement
) => {
  console.log("print: ", text);
  let fontSize = 20;
  let zenkakuFlag = false;
  target.globalAlpha = 1;
  target.fillStyle = "black";
  //if(darkFlag) target.fillStyle = "white"

  let textArr = [text];
  let textLength = 0;
  Array.prototype.forEach.call(text, (s, i) => {
    let chr = text.charCodeAt(i);
    if (
      (chr >= 0x00 && chr < 0x81) ||
      chr === 0xf8f0 ||
      (chr >= 0xff61 && chr < 0xffa0) ||
      (chr >= 0xf8f1 && chr < 0xf8f4)
    ) {
      textLength += 1;
    } else {
      textLength += 2;
      zenkakuFlag = true;
    }
  });
  if (textLength > 20) {
    if (zenkakuFlag) {
      fontSize = Math.floor((cnvs.width * 4) / 3 / 24);
    } else {
      fontSize = Math.floor((cnvs.width * 4) / 3 / 18);
    }
    textArr = [""];
    let lineNo = 0;
    Array.prototype.forEach.call(text, (element, index) => {
      if (index % 16 > 0 || index === 0) {
        textArr[lineNo] += element;
      } else {
        textArr.push(element);
        lineNo += 1;
      }
    });
  } else if (textLength > 2) {
    fontSize = Math.floor((cnvs.width * 4) / 3 / textLength);
  } else {
    fontSize = Math.floor((cnvs.height * 5) / 4 / textLength);
  }
  target.font = "bold " + String(fontSize) + "px 'Arial'";
  target.textAlign = "center";
  target.textBaseline = "middle";
  target.strokeStyle = "white";
  if (textArr.length === 1) {
    target.strokeText(text, cnvs.width / 2, cnvs.height / 2);
    target.fillText(text, cnvs.width / 2, cnvs.height / 2);
  } else {
    textArr.forEach((element, index) => {
      target.strokeText(
        element,
        cnvs.width / 2,
        cnvs.height / 2 + fontSize * (index - Math.round(textArr.length / 2))
      );
      target.fillText(
        element,
        cnvs.width / 2,
        cnvs.height / 2 + fontSize * (index - Math.round(textArr.length / 2))
      );
    });
  }
  target.restore();
};

export function playbackCinema() {
  cinemaElement.play();
  console.log(cinemaElement.width);
  console.log(cinemaElement.offsetHeight);
  console.log(window.innerHeight);

  const aspect = cinemaElement.width / cinemaElement.height;
  let hght = window.innerHeight;
  let wdth = hght * aspect;
  if (aspect > window.innerWidth / window.innerHeight) {
    hght = wdth / aspect;
    wdth = window.innerWidth;
  }
  const x = window.innerWidth / 2 - wdth / 2;
  const y = 0;
  bckcnvsElement.setAttribute("height", window.innerHeight + "px");
  bckcnvsElement.setAttribute("width", window.innerWidth + "px");
  let render = () => {
    requestAnimationFrame(render);
    bckcnvsContext.drawImage(cinemaElement, 600, 200);
  };
  render();
}

export function stopCinema() {
  cinemaElement.pause();
  erasePrint(bckcnvsContext, bckcnvsElement);
}

export function emojiState(state: boolean) {
  emojiFlag = state;
}

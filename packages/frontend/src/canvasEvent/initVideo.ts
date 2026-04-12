import { canvasElement } from "./canvasElement";

export function initVideo() {
  console.log(canvasElement.video)
  canvasElement.video.play();
  canvasElement.video.volume = 0;
}

export function initVideoStream(stream, ctx = canvasElement.ctx) {
  canvasElement.video.srcObject = stream;
  const cnvsElement = <HTMLCanvasElement>document.createElement("canvas");
  const bufferContext = cnvsElement.getContext("2d");
  let render = () => {
    requestAnimationFrame(render);
    const width = canvasElement.video.videoWidth;
    const height = canvasElement.video.videoHeight;
    if (width == 0 || height == 0) {
      return;
    }
    cnvsElement.width = width;
    cnvsElement.height = height;
    if (ctx) {
      bufferContext.drawImage(canvasElement.video, 0, 0);
    }
  };
  render();
}

// export function renderStart(
//   videoElement = <HTMLVideoElement>document.getElementById("video"),
//   ctx = canvasElement.ctx,
//   cnvs = canvasElement.cnvs
// ) {
//   console.log(videoElement);
//   // const canvasElement = <HTMLCanvasElement> document.createElement('canvas')
//   // const bufferContext = canvasElement.getContext('2d');
//   let render = () => {
//     requestAnimationFrame(render);
//     const width = videoElement.videoWidth;
//     const height = videoElement.videoHeight;
//     if (width == 0 || height == 0) {
//       return;
//     }
//     cnvs.width = width;
//     cnvs.height = height;
//     if (ctx) {
//       ctx.drawImage(videoElement, 0, 0);
//     }
//   };
//   render();
// }

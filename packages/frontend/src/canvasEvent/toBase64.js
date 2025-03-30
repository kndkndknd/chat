import { canvasElement } from "./canvasElement";
export function toBase64() {
    const cnvsElement = document.createElement("canvas");
    // const cnvsElement = canvasElement.cnvs;
    // cnvsElement.style.display = "none";
    // const videoElement = <HTMLVideoElement>document.getElementById("video");
    let bufferContext = cnvsElement.getContext("2d");
    cnvsElement.width = canvasElement.video.videoWidth;
    cnvsElement.height = canvasElement.video.videoHeight;
    if (bufferContext) {
        bufferContext.drawImage(canvasElement.video, 0, 0);
    }
    const returnURL = cnvsElement.toDataURL("image/jpeg");
    //  const returnURL = canvasElement.toDataURL()
    //  console.log(returnURL)
    return returnURL;
}

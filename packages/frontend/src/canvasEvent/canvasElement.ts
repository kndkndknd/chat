export const canvasElement = {
  cnvs: <HTMLCanvasElement>document.getElementById("cnvs"),
  ctx: <CanvasRenderingContext2D>(
    (document.getElementById("cnvs") as HTMLCanvasElement).getContext("2d")
  ),
  video: <HTMLVideoElement>document.getElementById("video"),
};

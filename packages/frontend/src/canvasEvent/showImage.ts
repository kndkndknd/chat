import { canvasElement } from "./canvasElement";

export function showImage(
  url: string,
  position?: { top: number; left: number; height: number; width: number },
  receive_ctx: CanvasRenderingContext2D = canvasElement.ctx
) {
  //canvasSizing()
  // console.log(url.slice(0, 50));
  const image = new Image();
  try {
    image.src = url;
    image.onload = () => {
      const aspect = image.width / image.height;

      if (position === undefined) {
        const hght =
          aspect > window.innerWidth / window.innerHeight
            ? window.innerWidth / aspect
            : window.innerHeight;
        const wdth =
          aspect > window.innerWidth / window.innerHeight
            ? window.innerWidth
            : window.innerHeight * aspect;
        // let hght = window.innerHeight;
        // let wdth = hght * aspect;
        //   if (aspect > window.innerWidth / window.innerHeight) {
        //   hght = wdth / aspect;
        //   wdth = window.innerWidth;
        // }
        const x = window.innerWidth / 2 - wdth / 2;
        const y = window.innerHeight / 2 - hght / 2;
        receive_ctx.drawImage(image, x, y, wdth, hght);
      } else {
        receive_ctx.drawImage(
          image,
          position.left,
          position.top,
          position.width,
          position.height
        );
      }
    };
  } catch (error) {
    console.log("showImage error: ", error);
  }
}

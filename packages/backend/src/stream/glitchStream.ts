import sharp from "sharp";
import * as fs from "fs";

export const glitchStream = async (originalBase64: string) => {
  console.log(originalBase64.length);
  console.log("original", originalBase64.slice(0, 50));
  const originalBase64Arr = originalBase64.split("base64,");
  console.log(originalBase64Arr[0]);

  // return originalBase64Arr[0] + "base64," + originalBase64Arr[1];
  // リサイズ
  const buffer = Buffer.from(originalBase64Arr[1], "base64");
  const metadata = await sharp(buffer).metadata();
  let width = metadata.width;
  let height = metadata.height;
  // console.log("width:", width, " height:", height);
  if (width / height === 4 / 3) {
    width = 640;
    height = 480;
  } else if (width / height === 16 / 9) {
    width = 640;
    height = 360;
  }

  // writeOut(buffer, "original");
  const sharpResult = await sharp(buffer)
    .resize(width, height)
    .toBuffer()
    .then((resizedBuffer) => {
      // writeOut(resizedBuffer, "resized");
      let resizedBase64 = resizedBuffer.toString("base64");
      console.log(resizedBase64.length);
      console.log(resizedBase64.slice(0, 50));
      // let rtnChunk: string = "data:image/jpeg;base64,";
      // let baseImgString: string = resizedBase64.split(
      //   "data:image/png;base64,"
      // )[1];
      // let baseImgString: string = resizedBase64;
      let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let i = 0; i < 5; i++) {
        resizedBase64 = resizedBase64.replace(
          str[Math.floor(Math.random() * str.length)],
          str[Math.floor(Math.random() * str.length)]
        );
      }
      resizedBase64 = resizedBase64.replace(
        String(Math.floor(Math.random() + 10)),
        String(Math.floor(Math.random() + 10))
      );
      const glitchedBuffer = Buffer.from(resizedBase64, "base64");
      // writeOut(glitchedBuffer, "glitched");
      let returnBase64 =
        originalBase64.split("base64,")[0] + "base64," + resizedBase64;
      // return returnBase64.replace(
      //   String(Math.floor(Math.random() + 10)),
      //   String(Math.floor(Math.random() + 10))
      // );
      // const returnTest = originalBase64Arr[0] + "base64," + resizedBase64;
      // console.log("return", returnTest.slice(0, 50));
      return returnBase64;
    });
  return sharpResult;
};

// const writeOut = (data: Buffer, fileName: string) => {
//   fs.writeFileSync(
//     "./tmp/" + fileName + String(new Date().getTime()) + ".jpg",
//     data
//   );
// };

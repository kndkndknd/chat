export const glitchStream = (chunk) => {
  let rtnChunk = "data:image/jpeg;base64,";
  let baseImgString = chunk.split("data:image/png;base64,")[1];
  let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let i = 0; i < 5; i++) {
    baseImgString = baseImgString.replace(str[Math.floor(Math.random()*str.length)], str[Math.floor(Math.random()*str.length)]);
  }
  rtnChunk += baseImgString;
  return rtnChunk.replace(String(Math.floor(Math.random() + 10)), String(Math.floor(Math.random() + 10)));
}
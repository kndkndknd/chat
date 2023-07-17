export const glitchStream = (chunk) => {
  let rtnChunk = "data:image/jpeg;base64,";
  let baseImgString = chunk.split("data:image/jpeg;base64,")[1];
  let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  rtnChunk += baseImgString.replace(str[Math.floor(Math.random()*str.length)], str[Math.floor(Math.random()*str.length)]);   
  return rtnChunk.replace(String(Math.floor(Math.random() + 10)), String(Math.floor(Math.random() + 10)));
}
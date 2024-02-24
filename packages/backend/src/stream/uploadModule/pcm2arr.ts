const pcm = require("pcm");

import {
  streams,
  cmdList,
  streamList,
  parameterList,
  states,
  uploadParams,
  basisBufferSize,
} from "../../states";

export const pcm2arr = (url) => {
  let tmpBuff = new Float32Array(basisBufferSize);
  let rtnBuff = <Array<Float32Array>>[];
  var i = 0;
  pcm.getPcmData(
    url,
    { stereo: true, sampleRate: 44100 },
    function (sample, channel) {
      tmpBuff[i] = sample;
      i++;
      if (i === basisBufferSize) {
        rtnBuff.push(tmpBuff);
        tmpBuff = new Float32Array(basisBufferSize);
        i = 0;
      }
    },
    function (err, output) {
      if (err) {
        console.log("err");
        throw new Error(err);
      }
      console.log(
        "pcm.getPcmData(" +
          url +
          "), {stereo: true, sampleRate: 44100}, (sample, channel)=>{function}"
      );
    }
  );
  return rtnBuff;
};

// import { spawn } from "child_process";
import { execa } from "execa";
// https://github.com/jhurliman/node-pcmを自分のに合わせて作成

import { streams, basisBufferSize } from "../../states";

// export const getPcmData = (filePath, streamName, options): any => {
//   var outputStr = "";
//   var oddByte = null;
//   var channel = 0;
//   var gotData = false;

//   var channels = 2;
//   var sampleRate = 44100;
//   var ffmpegPath = "ffmpeg";
//   options = options || {};
//   if (typeof options.stereo !== "undefined") channels = options.stereo ? 2 : 1;
//   if (typeof options.sampleRate !== "undefined")
//     sampleRate = options.sampleRate;
//   if (typeof options.ffmpegPath !== "undefined")
//     ffmpegPath = options.ffmpegPath;

//   let tmpBuff = new Float32Array(basisBufferSize);
//   let buffIndex = 0;

//   // Extract signed 16-bit little endian PCM data with ffmpeg and pipe to
//   // stdout
//   /*
//   const ffmpegToPcm = await execa(ffmpegPath, [
//     "-i",
//     filename,
//     "-f",
//     "s16le",
//     "-ac",
//     channels,
//     "-acodec",
//     "pcm_s16le",
//     "-ar",
//     sampleRate,
//     "-y",
//     "pipe:1",
//   ]);
//   console.log(ffmpegToPcm.stdout);
//   */

//   console.log("ffmpeg start");
//   var ffmpeg = spawn(ffmpegPath, [
//     "-i",
//     filePath,
//     "-f",
//     "s16le",
//     "-ac",
//     channels,
//     "-acodec",
//     "pcm_s16le",
//     "-ar",
//     sampleRate,
//     "-y",
//     "pipe:1",
//   ]);

//   ffmpeg.stdout.on("data", function (data) {
//     gotData = true;

//     var value;
//     var i = 0;
//     var dataLen = data.length;

//     // If there is a leftover byte from the previous block, combine it with the
//     // first byte from this block
//     if (oddByte !== null) {
//       value = ((data.readInt8(i++, true) << 8) | oddByte) / 32767.0;
//       // sampleCallback(value, channel);
//       tmpBuff[buffIndex] = value;
//       buffIndex++;
//       if (buffIndex === basisBufferSize) {
//         // console.log("push", tmpBuff);
//         streams[streamName].audio.push(tmpBuff);
//         tmpBuff = new Float32Array(basisBufferSize);
//         buffIndex = 0;
//       }
//       channel = ++channel % 2;
//     }

//     // おそらくstreaoの場合に片チャンネル読むために1とばししてる
//     for (; i < dataLen; i += 2) {
//       // console.log(i);
//       value = data.readInt16LE(i, true) / 32767.0;
//       // sampleCallback(value, channel);
//       tmpBuff[buffIndex] = value;
//       buffIndex++;
//       if (buffIndex === basisBufferSize) {
//         // console.log("push", tmpBuff);
//         streams[streamName].audio.push(tmpBuff);
//         tmpBuff = new Float32Array(basisBufferSize);
//         buffIndex = 0;
//       }
//       channel = ++channel % 2;
//     }

//     oddByte = i < dataLen ? data.readUInt8(i, true) : null;
//   });

//   ffmpeg.stderr.on("data", function (data) {
//     // Text info from ffmpeg is output to stderr
//     outputStr += data.toString();
//     return false;
//   });

//   ffmpeg.stderr.on("end", function () {
//     console.log("ffmpeg end");
//     // if (gotData) {endCallback(null, outputStr);
//     // else endCallback(outputStr, null);
//     if (gotData) {
//       // success
//       console.log("success");
//       return true;
//     } else {
//       console.log("failed");
//       return false;
//     }
//   });
// };

export const awaitGetPcmData = async (filePath, streamName, options) => {
  // var outputStr = "";
  var oddByte = null;
  var channel = 0;
  var gotData = false;

  var channels = 2;
  var sampleRate = 44100;
  var ffmpegPath = "ffmpeg";
  var value;
  var i = 0;

  options = options || {};
  if (typeof options.stereo !== "undefined") channels = options.stereo ? 2 : 1;
  if (typeof options.sampleRate !== "undefined")
    sampleRate = options.sampleRate;
  if (typeof options.ffmpegPath !== "undefined")
    ffmpegPath = options.ffmpegPath;

  let tmpBuff = new Float32Array(basisBufferSize);
  let buffIndex = 0;
  let chunkIndex = 0;

  const ffmpegOption = [
    "-i",
    filePath,
    "-f",
    "s16le",
    "-ac",
    channels,
    "-acodec",
    "pcm_s16le",
    "-ar",
    sampleRate,
    "-y",
    "pipe:1",
  ];

  if (typeof options.ss !== "undefined") {
    ffmpegOption.push("-ss");
    ffmpegOption.push(options.ss);
  }
  if (typeof options.t !== "undefined") {
    ffmpegOption.push("-t");
    ffmpegOption.push(options.t);
  }
  console.log(ffmpegOption);

  // const { stdout } = await execa(ffmpegPath, [
  await execa(ffmpegPath, ffmpegOption).then((execaReturnData) => {
    const data = Buffer.from(execaReturnData.stdout);
    // console.log(data);
    var dataLen = data.length;
    console.log(data.length);

    // If there is a leftover byte from the previous block, combine it with the
    // first byte from this block
    /*
    if (oddByte !== null) {
      value = ((data.readInt8(buffIndex++) << 8) | oddByte) / 32767.0;
      // sampleCallback(value, channel);
      console.log(chunkIndex, value);
      tmpBuff[chunkIndex] = value;
      chunkIndex++;
      if (chunkIndex === basisBufferSize) {
        // console.log("push", tmpBuff);
        streams[streamName].audio.push(tmpBuff);
        tmpBuff = new Float32Array(basisBufferSize);
        chunkIndex = 0;
      }
      // channel = ++channel % 2;
    }
    */

    // おそらくstereoの場合に片チャンネル読むために1とばししてる
    // for (; i < dataLen; i += 2) {
    for (; buffIndex + 1 < dataLen; buffIndex++) {
      // if (i >= dataLen - 1) {
      //   console.log("buffer range end");
      //   return true;
      // }
      value = data.readInt16LE(buffIndex) / 32767.0;
      // console.log("test", i);
      // console.log("value", value, i, buffIndex);
      // sampleCallback(value, channel);
      if (value > 1 || value < -1) {
        console.log(value);
      }
      tmpBuff[chunkIndex] = value;
      chunkIndex++;
      if (chunkIndex === basisBufferSize) {
        // console.log("push", tmpBuff);
        streams[streamName].audio.push(tmpBuff);
        tmpBuff = new Float32Array(basisBufferSize);
        chunkIndex = 0;
      }
      // channel = ++channel % 2;
    }

    // oddByte = buffIndex < dataLen ? data.readUInt8(buffIndex) : null;
    // });
  });
  // console.log(stdout);
  return true;
};

/*awaitGetPcmData("/Users/knd/chat_upload/TEST.mp3", "TEST", {
  stereo: true,
  sampleRate: 22050,
}).then((result) => {
  console.log(result);
});
*/

import * as fs from "fs";
import { execa } from "execa";

import {
  streams,
  cmdList,
  streamList,
  parameterList,
  states,
  uploadParams,
  basisBufferSize,
} from "../../states.js";

import { awaitGetPcmData } from "./getPcmData.js";
import { pushStateStream } from "../pushStateStream.js";

// import SocketIO from "socket.io";
// import { cmdStateType } from "../..//types/global.js";

// const fs = require("fs");
// const pcm = require("pcm");
// const util = require("util");
// const exec = require("child_process").exec;
// var readDir = util.promisify(fs.readdir);
// var readFile = util.promisify(fs.readFile);
// var execPromise = util.promisify(exec);

export const uploadVideo = async (f: string, durationArr, mediaDirPath) => {
  let tmpBuff = new Float32Array(basisBufferSize);
  let rtnBuff = [];
  let i = 0;
  const fSplit = f.split(".");
  const fName = fSplit[0];

  let sndConvert = "";
  let imgConvert = "";
  // const ss = Math.floor(Math.random() * 100);

  try {
    await pushStateStream(fName, states);

    await durationArr.forEach(async (duration) => {
      const getPcmOption = {
        stereo: true,
        sampleRate: 22050,
        ss: duration.ss,
        t: duration.t,
      };
      const getPcmResult = await awaitGetPcmData(
        `${mediaDirPath}/${f}`,
        fName,
        getPcmOption
      );
      const ffmpegOption = [
        "-i",
        `${mediaDirPath}/${f}`,
        "-ss",
        duration.ss,
        "-t",
        duration.t,
        "-r",
        "5.4",
        "-f",
        "image2",
        `${mediaDirPath}/tmp/${fName}%06d.jpg`,
      ];
      console.log(ffmpegOption);
      const { stdout } = await execa("ffmpeg", ffmpegOption);

      // await execPromise(soundFFmpeg);
      // await execPromise(imageFFmpeg);
      // sndConvert =
      //   "ffmpeg -i " +
      //   mediaDirPath +
      //   "/" +
      //   f +
      //   // " -ss " +
      //   // String(ss) +
      //   // " -t 0:00:30" +
      //   " -vn -acodec aac " +
      //   uploadParams.mediaDir +
      //   fSplit[0] +
      //   ".aac";
      // imgConvert =
      //   "ffmpeg -i " +
      //   mediaDirPath +
      //   "/" +
      //   f +
      //   // " -ss " +
      //   // String(ss) +
      //   // " -t 0:00:30" +
      //   ' -r 5.4 -f image2 "' +
      //   mediaDirPath +
      //   "/" +
      //   fSplit[0] +
      //   '%06d.jpg"';
      // sndConvert = sndConvert + " -ss " + duration.ss + " -t " + duration.t;
      // imgConvert = imgConvert + " -ss " + duration.ss + " -t " + duration.t;
      // await execPromise(sndConvert);
      // await execPromise(imgConvert);

      // let j = 0

      // console.log(aacFilePath);
      // await pcm.getPcmData(
      //   // mediaDirPath + "/" + fSplit[0] + ".aac",
      //   aacFilePath,
      //   { stereo: true, sampleRate: 22050 },
      //   function (sample, channel) {
      //     tmpBuff[i] = sample;
      //     i++;
      //     if (i === basisBufferSize) {
      //       // rtnBuff.push(tmpBuff);
      //       //console.log(tmpBuff)
      //       console.log("push audio buff");
      //       streams[fSplit[0]].audio.push(tmpBuff);
      //       /*
      //   if(streams[streamName].length === 0) {
      //     streams[streamName].push({audio:tmpBuff, bufferSize: basisBufferSize})
      //     console.log(streams[streamName][streams[streamName].length-1].bufferSize)
      //   } else {
      //     // if(streams[streamName].length >= j+1 && streams[streamName][j].video !== undefined) {
      //     if(streams[streamName].length >= j+1) {
      //       streams[streamName][j].audio = tmpBuff
      //       streams[streamName][j].bufferSize = basisBufferSize
      //     console.log(streams[streamName][j].bufferSize)
      //     }
      //     j++
      //   }
      //   */
      //       tmpBuff = new Float32Array(basisBufferSize);
      //       i = 0;
      //     }
      //   },
      //   function (err, output) {
      //     if (err) {
      //       console.log("err");
      //       throw new Error(err);
      //     }
      //     // streams[streamName].push({audio:rtnBuff})
      //     console.log(
      //       "pcm.getPcmData(" +
      //         fSplit[0] +
      //         ".aac, { stereo: true, sampleRate: 44100 })"
      //     );
      //     //                console.log(streams[streamName].audio.length);
      //     // execPromise("rm " + uploadParams.mediaDir + fSplit[0] + ".aac");
      //     // execPromise(`rm ${aacFilePath}`);
      //   }
      // );
      const files = await fs.readdirSync(mediaDirPath + "/tmp");
      console.log(files);
      let jpgs = <Array<string>>[];
      await files.forEach(async (file) => {
        if (file.includes(fName) && file.includes(".jpg")) {
          await jpgs.push(file);
        }
      });
      // console.log(jpgs)
      // const jpgs = await readDir(uploadParams.mediaDir);
      await jpgs.forEach(async (element) => {
        const img = await fs.readFileSync(mediaDirPath + "/tmp/" + element);
        const base64str = await new Buffer(img).toString("base64");
        // console.log(base64str)
        streams[fSplit[0]].video.push(
          "data:image/jpeg;base64," + String(base64str)
        );
        // await execPromise("rm " + mediaDirPath + "/" + element);
        // await execPromise(`rm ${mediaDirPath}/tmp/${fName}.aac`);
        /*
    io.emit("stringsFromServer", {
      strings: "UPLOADED",
      timeout: true,
    });
    */
      });
    });

    console.log("video file uploaded");
    //コマンド、パラメータにUPLOAD対象を追加
    // streamList.push(streamName);
    // pushStateStream(fName, states);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// const pcm = require("pcm");
// const util = require("util");
// const exec = require("child_process").exec;
// var readDir = util.promisify(fs.readdir);
// var readFile = util.promisify(fs.readFile);
// var execPromise = util.promisify(exec);

import {
  streams,
  cmdList,
  streamList,
  parameterList,
  states,
  uploadParams,
  basisBufferSize,
} from "../../states";
// import SocketIO from "socket.io";
// import { cmdStateType } from "../..//types/global.js";

import { getFilePath } from "./getFilePath";
import { getDuration } from "./getDuration";
import { durationPattern } from "./durationPattern";
import { uploadVideo } from "./uploadVideo";
import { uploadAudio } from "./uploadAudio";

export const uploadStream = async (stringArr) => {
  //  let ss = "00:00:00"
  //  let t = "00:00:20"
  // const __filename = fileURLToPath(import.meta.url);
  // const __dirname = path.dirname(__filename);

  const mediaDirPath = path.join(
    __dirname,
    "../../../../../..",
    uploadParams.mediaDir
  );

  const f = <string>await getFilePath(stringArr[1], mediaDirPath);
  if (f === "") {
    console.log("failed: can not get filepath");
    return;
  }

  if (!(f.split(".")[0] in streams)) {
    streams[f.split(".")[0]] = {
      audio: [],
      video: [],
      bufferSize: basisBufferSize,
    };
  }

  switch (f.split(".")[1].toLowerCase()) {
    case "mov":
    case "mp4":
    case "m4v":
    case "webm":
      const duration = <number>await getDuration(mediaDirPath, f);
      const durationArr = durationPattern(duration, stringArr);
      const videoUploadResult = await uploadVideo(f, durationArr, mediaDirPath);
      if (videoUploadResult) {
        return `${f.split(".")[0]} UPLOADED`;
      } else {
        return `FAILED: ${f.split(".")[0]} NOT UPLOADED`;
      }
    case "aac":
    case "m4a":
    case "mp3":
    case "wav":
    case "aif":
    case "aiff":
      console.log("call audioUpload");
      const audioUploadResult = await uploadAudio(f, mediaDirPath);
      if (audioUploadResult) {
        await console.log("audioUploadResult", audioUploadResult);
        console.log(
          `${f.split(".")[0]} length: `,
          streams[f.split(".")[0]].audio.length
        );
        return await `${f.split(".")[0]} UPLOADED`;
      } else {
        console.log("audioUploadResult", audioUploadResult);
        return await `FAILED: ${f.split(".")[0]} NOT UPLOADED`;
      }
    default:
      console.log("not media file");
      return `${f.split(".")[0]} IS NOT MEDIA`;
  }
  // switch (stringArr.length) {
  //   case 4:
  //     if (stringArr[3].includes(":")) {
  //       let timeArr = stringArr[3].split(":");
  //       if (timeArr.length === 3) {
  //         uploadParams.t = stringArr[3];
  //       } else if (timeArr.length === 2) {
  //         uploadParams.t = "00:" + stringArr[3];
  //       }
  //     }
  //   case 3:
  //     if (stringArr[2].includes(":")) {
  //       let timeArr = stringArr[2].split(":");
  //       if (timeArr.length === 3) {
  //         uploadParams.ss = stringArr[2];
  //       } else if (timeArr.length === 2) {
  //         uploadParams.ss = "00:" + stringArr[2];
  //       }
  //     } else if (stringArr[2] === "FULL") {
  //       uploadParams.t = String(duration);
  //       uploadParams.ss = "0:00:00";
  //     }
  //     break;
  //   case 2:
  //     if(duration < 20) {
  //       uploadParams.t = String(duration)
  //     }
  //     break;
  // }
  //fileImport(fname,libDir,statusImport,ss,t);
  // try {
  //   /*
  //   const files = await readDir(uploadParams.mediaDir);
  //   // mediaDir内を順番にファイル名スキャン
  //   for (let i = 0; i <= files.length; i++) {
  //     let f = files[i];
  //     //ドット区切りがあり、ドット区切りの手前がstringArr[1]と同じ場合
  //     if (f != undefined && f.split(".")[0] === stringArr[1]) {
  //       console.log(f);
  //   */

  //       // const streamName = stringArr[1];
  //       const streamName = stringArr[1]
  //       let fSplit = f.split(".");
  //       if (!(streamName in streams)) {
  //         streams[streamName] = {
  //           audio: [],
  //           video: [],
  //           bufferSize: basisBufferSize,
  //         };
  //       }
  //       let tmpBuff = new Float32Array(basisBufferSize);
  //       let rtnBuff = [];
  //       let i = 0;
  //       switch (fSplit[1].toLowerCase()) {
  //         case "mov":
  //         case "mp4":
  //         case "m4v":
  //         case "webm":
  //           let sndConvert = "";
  //           let imgConvert = "";
  //           const ss = Math.floor(Math.random() * 100);
  //           sndConvert =
  //             "ffmpeg -i " +
  //             uploadParams.mediaDir +
  //             f +
  //             // " -ss " +
  //             // String(ss) +
  //             // " -t 0:00:30" +
  //             " -vn -acodec aac " +
  //             uploadParams.mediaDir +
  //             fSplit[0] +
  //             ".aac";
  //           imgConvert =
  //             "ffmpeg -i " +
  //             uploadParams.mediaDir +
  //             f +
  //             // " -ss " +
  //             // String(ss) +
  //             // " -t 0:00:30" +
  //             ' -r 5.4 -f image2 "' +
  //             uploadParams.mediaDir +
  //             fSplit[0] +
  //             '%06d.jpg"';
  //           if (uploadParams.ss !== "FULL" && uploadParams.t !== "FULL") {
  //             sndConvert =
  //               sndConvert +
  //               " -ss " +
  //               uploadParams.ss +
  //               " -t " +
  //               uploadParams.t;
  //             imgConvert =
  //               imgConvert +
  //               " -ss " +
  //               uploadParams.ss +
  //               " -t " +
  //               uploadParams.t;
  //           }
  //           await execPromise(sndConvert);
  //           await execPromise(imgConvert);

  //           // let j = 0
  //           await pcm.getPcmData(
  //             uploadParams.mediaDir + streamName + ".aac",
  //             { stereo: true, sampleRate: 22050 },
  //             function (sample, channel) {
  //               tmpBuff[i] = sample;
  //               i++;
  //               if (i === basisBufferSize) {
  //                 // rtnBuff.push(tmpBuff);
  //                 //console.log(tmpBuff)
  //                 console.log("push audio buff");
  //                 streams[streamName].audio.push(tmpBuff);
  //                 /*
  //                 if(streams[streamName].length === 0) {
  //                   streams[streamName].push({audio:tmpBuff, bufferSize: basisBufferSize})
  //                   console.log(streams[streamName][streams[streamName].length-1].bufferSize)
  //                 } else {
  //                   // if(streams[streamName].length >= j+1 && streams[streamName][j].video !== undefined) {
  //                   if(streams[streamName].length >= j+1) {
  //                     streams[streamName][j].audio = tmpBuff
  //                     streams[streamName][j].bufferSize = basisBufferSize
  //                   console.log(streams[streamName][j].bufferSize)
  //                   }
  //                   j++
  //                 }
  //                 */
  //                 tmpBuff = new Float32Array(basisBufferSize);
  //                 i = 0;
  //               }
  //             },
  //             function (err, output) {
  //               if (err) {
  //                 console.log("err");
  //                 throw new Error(err);
  //               }
  //               // streams[streamName].push({audio:rtnBuff})
  //               console.log(
  //                 "pcm.getPcmData(" +
  //                   streamName +
  //                   ".aac, { stereo: true, sampleRate: 44100 })"
  //               );
  //               //                console.log(streams[streamName].audio.length);
  //               execPromise(
  //                 "rm " + uploadParams.mediaDir + streamName + ".aac"
  //               );
  //             }
  //           );
  //           const files = await readDir(uploadParams.mediaDir);
  //           let jpgs = [];
  //           await files.forEach(async (file) => {
  //             if (file.includes(fSplit[0]) && file.includes(".jpg")) {
  //               await jpgs.push(file);
  //             }
  //           });
  //           // console.log(jpgs)
  //           // const jpgs = await readDir(uploadParams.mediaDir);
  //           jpgs.forEach(async (element) => {
  //             const img = await readFile(uploadParams.mediaDir + element);
  //             const base64str = await new Buffer(img).toString("base64");
  //             // console.log(base64str)
  //             streams[streamName].video.push(
  //               "data:image/jpeg;base64," + String(base64str)
  //             );
  //             await execPromise("rm " + uploadParams.mediaDir + element);
  //             io.emit("stringsFromServer", {
  //               strings: "UPLOADED",
  //               timeout: true,
  //             });
  //           });
  //           /*
  //           if(streams[streamName].length === 0) {
  //             jpgs.forEach(async (element) => {
  //               const img = await readFile(uploadParams.mediaDir + element)
  //               const base64str = await new Buffer(img).toString('base64')
  //               // console.log(base64str)
  //               streams[streamName].push('data:image/jpeg;base64,' + String(base64str))
  //               await execPromise('rm ' + uploadParams.mediaDir + element)
  //               io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})

  //             })
  //           } else {
  //             await streams[streamName].forEach(async (element, index) => {
  // //              if(jpgs[j] != undefined && jpgs[j].includes(fSplit[0]) && jpgs[j].includes(".jpg")){
  //               console.log(process.env.HOME + uploadParams.mediaDir + jpgs[index])
  //               const img = await readFile(uploadParams.mediaDir + jpgs[index])
  //               const base64str = await new Buffer(img).toString('base64')
  //               // console.log(base64str)
  //               element.video = 'data:image/jpeg;base64,' + String(base64str)
  //               await execPromise('rm ' + uploadParams.mediaDir + jpgs[index])
  //               io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
  //             });

  //           }
  //           */
  //           console.log("video file");
  //           //コマンド、パラメータにUPLOAD対象を追加
  //           // streamList.push(streamName);
  //           pushStateStream(streamName, states);
  //           break;
  //         case "aac":
  //         case "m4a":
  //         case "mp3":
  //         case "wav":
  //         case "aif":
  //         case "aiff":
  //           await pcm.getPcmData(
  //             uploadParams.mediaDir + f,
  //             { stereo: true, sampleRate: 22050 },
  //             function (sample, channel) {
  //               tmpBuff[i] = sample;
  //               i++;
  //               if (i === basisBufferSize) {
  //                 streams[streamName].audio.push(tmpBuff);
  //                 tmpBuff = new Float32Array(basisBufferSize);
  //                 i = 0;
  //               }
  //             },
  //             function (err, output) {
  //               if (err) {
  //                 console.log("err");
  //                 throw new Error(err);
  //               }
  //               console.log(
  //                 "pcm.getPcmData(" +
  //                   f +
  //                   ", { stereo: true, sampleRate: 44100 })"
  //               );
  //               io.emit("stringsFromServer", {
  //                 strings: "UPLOADED",
  //                 timeout: true,
  //               });
  //             }
  //           );
  //           // streamList.push(streamName);
  //           pushStateStream(streamName, states);
  //           break;
  //         default:
  //           console.log("not media file");
  //           io.emit("stringsFromServer", {
  //             strings: "NO MEDIA FILE",
  //             timeout: true,
  //           });
  //       }
  //     // }
  //   }
  //   // console.log(files);
  // } catch (e) {
  //   console.error(e);
  // }
};

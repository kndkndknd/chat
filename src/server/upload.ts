import { streams, cmdList, streamList, parameterList, states, uploadParams, basisBufferSize } from './states'
import SocketIO from 'socket.io'

const pcm = require('pcm');
const fs = require('fs');
const util = require('util');
const exec = require('child_process').exec;
var readDir = util.promisify(fs.readdir);
var readFile = util.promisify(fs.readFile);
var execPromise = util.promisify(exec);

export const pcm2arr = (url) => {
  let tmpBuff = new Float32Array(basisBufferSize);
  let rtnBuff = [];
  var i = 0;
  pcm.getPcmData(url, { stereo: true, sampleRate: 44100 },
    function(sample, channel) {
      tmpBuff[i] = sample;
      i++;
      if(i === basisBufferSize){
        rtnBuff.push(tmpBuff);
        tmpBuff = new Float32Array(basisBufferSize);
        i = 0;
      }
    },
    function(err, output) {
      if (err) {
        console.log("err");
        throw new Error(err);
      }
      console.log('pcm.getPcmData(' + url + '), {stereo: true, sampleRate: 44100}, (sample, channel)=>{function}');
    }
  );
  return rtnBuff;
}

export const uploadStream = async (stringArr, io) => {
//  let ss = "00:00:00"
//  let t = "00:00:20"
  switch(stringArr.length) {
    case 4:
      if(stringArr[3].includes(":")) {
        let timeArr = stringArr[3].split(":")
        if(timeArr.length === 3){
          uploadParams.t = stringArr[3]
        } else if(timeArr.length === 2) {
          uploadParams.t = "00:" + stringArr[3]
        }
      }
    case 3:
      if(stringArr[2].includes(":")) {
        let timeArr = stringArr[2].split(":")
        if(timeArr.length === 3){
          uploadParams.ss = stringArr[2]
        } else if(timeArr.length === 2) {
          uploadParams.ss = "00:" + stringArr[2]
        }
      } else if(stringArr[2] === "FULL") {
        uploadParams.t = "FULL"
        uploadParams.ss = "FULL"
      }
      break;
    case 2:
      break;
  }
  //fileImport(fname,libDir,statusImport,ss,t);
  try {
    const files = await readDir(uploadParams.mediaDir);
    // mediaDir内を順番にファイル名スキャン
    for(let i = 0;i <= files.length; i++){
      let f = files[i]
      //ドット区切りがあり、ドット区切りの手前がstringArr[1]と同じ場合
      if(f != undefined && f.split(".")[0] === stringArr[1]) {
        const streamName = stringArr[1]
        let fSplit = f.split(".");
        if(!(streamName in streams)) {
          streams[streamName] = []
        }
        let tmpBuff = new Float32Array(basisBufferSize);
        let rtnBuff = [];
        let i = 0;
        switch(fSplit[1]) {
          case "mov":
          case "MOV":
          case "mp4":
          case "MP4":
            let sndConvert = ""
            let imgConvert = ""
            sndConvert = 'ffmpeg -i ' + uploadParams.mediaDir + f + ' -vn -acodec aac ' + uploadParams.mediaDir + fSplit[0] + '.aac';
            imgConvert = 'ffmpeg -i ' + uploadParams.mediaDir + f + ' -r 5.4 -f image2 "' + uploadParams.mediaDir + fSplit[0] + '%06d.jpg"';
            if(uploadParams.ss !== "FULL" && uploadParams.t !== "FULL") {
              sndConvert = sndConvert + ' -ss ' + uploadParams.ss + ' -t ' + uploadParams.t;
              imgConvert = imgConvert + ' -ss ' + uploadParams.ss + ' -t ' + uploadParams.t;
            }
            await execPromise(sndConvert)
            await execPromise(imgConvert)
            await pcm.getPcmData(uploadParams.mediaDir + streamName + ".aac", { stereo: true, sampleRate: 22050 },
              function(sample, channel) {
                tmpBuff[i] = sample;
                i++;
                if(i === basisBufferSize){
                  // rtnBuff.push(tmpBuff);
                  streams[streamName].push({audio:tmpBuff, bufferSize: basisBufferSize})
                  tmpBuff = new Float32Array(basisBufferSize);
                  i = 0;
                }
              },
              function(err, output) {
                if (err) {
                  console.log("err");
                  throw new Error(err);
                }
                // streams[streamName].push({audio:rtnBuff})
                console.log('pcm.getPcmData(' + streamName + '.aac, { stereo: true, sampleRate: 44100 })')
//                console.log(streams[streamName].audio.length);
                execPromise("rm " + uploadParams.mediaDir + streamName + ".aac")
              }
            )
            const files = await readDir(uploadParams.mediaDir);
            let jpgs = []
            await files.forEach(async file => {
              if(file.includes(fSplit[0]) && file.includes('.jpg')){
                await jpgs.push(file)
              }
            });
            // const jpgs = await readDir(uploadParams.mediaDir);
            console.log(streams[streamName].length)
            await streams[streamName].forEach(async (element, index) => {
              console.log("debug ohinasama "+ jpgs[index])
              //j番目のファイルがjpgだった場合
//              if(jpgs[j] != undefined && jpgs[j].includes(fSplit[0]) && jpgs[j].includes(".jpg")){
              console.log(process.env.HOME + uploadParams.mediaDir + jpgs[index])
              const img = await readFile(uploadParams.mediaDir + jpgs[index])
              const base64str = await new Buffer(img).toString('base64')  
              element.video = 'data:image/jpeg;base64,' + String(base64str)
              await execPromise('rm ' + uploadParams.mediaDir + jpgs[index])
              io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
              // オーディオ側のバッファ数よりjが小さければ1進める


            });
            /*
            for(let a=0;a<streams[streamName].length;a++){
              //j番目のファイルがjpgだった場合
              if(jpgs[j] != undefined && jpgs[j].includes(fSplit[0]) && jpgs[j].includes(".jpg")){
                console.log(process.env.HOME + uploadParams.mediaDir + jpgs[j])
                const img = await readFile(uploadParams.mediaDir + jpgs[j])
                const base64str = await new Buffer(img).toString('base64')  
                streams[streamName][a].video = 'data:image/jpeg;base64,' + String(base64str)
                await execPromise('rm ' + uploadParams.mediaDir + jpgs[j])
                io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
              }
              // オーディオ側のバッファ数よりjが小さければ1進める
              if(j+1 < streams[streamName].length) j++
            }
*/
/*
            //            for(let j=0;j<jpgs.length;j++) {
//              let jpg = jpgs[j]
//              console.log(jpgs[i])
              if(jpgs[j] != undefined && jpgs[j].includes(fSplit[0]) && jpgs[j].includes(".jpg")){
                console.log(process.env.HOME + uploadParams.mediaDir + jpgs[j])
                // let img = await readFile(uploadParams.mediaDir + jpgs[j])
                // let base64str = await new Buffer(img).toString('base64')
//                console.log(base64str)
//                console.log(streams[streamName].length)
//                console.log(`${typeof(base64str)} ${Object.prototype.toString.call(base64str)}`);
                if(streamArrNo < streams[streamName].length) {
                  // console.log(jpgs[j])
                  const img = await readFile(uploadParams.mediaDir + jpgs[j])
                  const base64str = await new Buffer(img).toString('base64')  
                  // console.log(base64str)
                  streams[streamName][streamArrNo].video = 'data:image/jpeg;base64,' + String(base64str)
                  // console.log('data:image/jpeg;base64,' + String(base64str))
                  streamArrNo++
                }
                await execPromise('rm ' + uploadParams.mediaDir + jpgs[j])
                io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
*/

                /*                io.emit('textFromServer',{
                  "text": "UPLOADED",
                  "alert": false,
                  "timeout": true
                })
                */
//              }
//            }
//            statusImport(fSplit[0])
            console.log("video file")
            //コマンド、パラメータにUPLOAD対象を追加
            streamList.push(streamName)
            states.current.stream[streamName] = false
            states.previous.stream[streamName] = false
            states.stream.sampleRate[streamName] = 44100
            states.stream.glitch[streamName] = false
            states.stream.grid[streamName] = false
            states.stream.random[streamName] = false

            break;
          case "aac":
          case "AAC":
          case "m4a":
          case "mp3":
          case "MP3":
          case "wav":
          case "WAV":
          case "aif":
          case "aiff":
          case "AIF":
          case "AIFF":
            await pcm.getPcmData(uploadParams.mediaDir + f, { stereo: true, sampleRate: 22050 },
              function(sample, channel) {
                tmpBuff[i] = sample;
                i++;
                if(i === basisBufferSize){
                  console.log(tmpBuff)
                  //rtnBuff.push(tmpBuff);
                  streams[streamName].push({audio:tmpBuff, bufferSize: basisBufferSize})
                  tmpBuff = new Float32Array(basisBufferSize);
                  i = 0;
                }
              },
              function(err, output) {
                if (err) {
                  console.log("err");
                  throw new Error(err);
                }
                //movBuff[f].audio = rtnBuff
//                streams[streamName].audio = rtnBuff
                // console.log(rtnBuff)
                //streams[streamName].push({audio:rtnBuff})
                console.log('pcm.getPcmData(' + f+ ', { stereo: true, sampleRate: 44100 })')
                io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
/*
                io.emit('textFromServer',{
                  "text": "UPLOADED",
                  "alert": false,
                  "timeout": true
                })
                */
              }
            )
            console.log("audio file")
            streamList.push(streamName)
            states.current.stream[streamName] = false
            states.current.stream[streamName] = false
            states.previous.stream[streamName] = false
            states.stream.sampleRate[streamName] = 44100
            states.stream.glitch[streamName] = false
            states.stream.grid[streamName] = false
            states.stream.random[streamName] = false
//            statusImport(fSplit[0])
            break;
          default:
            console.log("not media file")
            io.emit('stringsFromServer',{strings: "NO MEDIA FILE", timeout: true})
            break;
        }
      }
    }
    console.log(files);
  } catch(e) {
    console.error(e);
  }
}
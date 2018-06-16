exports.instructionInterval = function instructionInterval(io, instructionArr, instructionDuration){
  io.emit("instructionFromServer", {
    "text": instructionArr[Math.floor(Math.random() * instructionArr.length)],
    "duration": instructionDuration[Math.floor(Math.random() * instructionDuration.length)]
  });
  /*
  console.log("instruction");
  //coding later
  io.emit('instructionFromServer', intervalValue);
  */
}
exports.chunkEmit = function chunkEmit(io, audiovisualChunk){
  if(audiovisualChunk.length > 0) {
    io.emit('chunkFromServer', audiovisualChunk.shift());
  }
}

exports.glitchStream = function glitchImage(data){
  //console.log(data);
  let rtnJson = data;
  //let rtnJson = {};
  //rtnJson["audio"] = [];
  //rtnJson["video"] = "data:image/jpeg;base64,";
  //let rtnAudio = {};
  if("video" in data && (typeof data.video === 'string' || data.video instanceof String) && data.video.startsWith("data:image/jpeg;base64,")){
  //if("video" in data && ~data.video.indexOf("data:image/jpeg;base64,")){
    let rtnVideo = "data:image/jpeg;base64,";
    let baseImgString = data["video"].split("data:image/jpeg;base64,")[1];
    //let str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    //console.log("body; " + String(baseString.length));
    //console.log(baseString);
    //rtnJson["video"] += baseImgString.replace(str[Math.floor(Math.random()*str.length)], str[Math.floor(Math.random()*str.length)]);
    rtnVideo += baseImgString.replace(str[Math.floor(Math.random()*str.length)], str[Math.floor(Math.random()*str.length)]);
     
    rtnJson["video"] = rtnVideo.replace(String(Math.floor(Math.random() + 10)), String(Math.floor(Math.random() + 10)));
    //data["audio"].forEach((value,index,arr)=>{
    /*
    for(let key in data["audio"]){
      if(data["audio"][key] > 0){
        rtnAudio[key] = data["audio"][key];
      } else {
        //rtnAudio[key] = 0;
        rtnAudio[key] = data["audio"][key] * -1;
      }
    }
    //});
    rtnJson["audio"] = rtnAudio;*/
    //console.log(rtnJson);
    //console.log(data.audio[String(1)]);
    /*
    if(data.audio != undefined){
      rtnJson.audio = new Float32Array(8192);
      //console.log(rtnJson.audio);
      //console.log(data.audio.length)

      for(let i=0;i<data.audio.length;i++){
        //console.log(data.audio[i]);
        rtnJson.audio[String(i)] = Math.round(data.audio[String(i)] * 10) /10;
        //rtnJson.audio[i] = Math.random() * data.audio[i];
      }
    }
    console.log(rtnJson.audio);*/
    rtnJson["glitch"] = true;
  } else {
    rtnJson.video = data.video
    rtnJson["glitch"] = false;
  }
  return rtnJson;
}

exports.pickupTarget = function pickupTarget(room, list, target, order, sourceId){
  let idArr = []
  for(let key in list){
    for(let id in room){
      if(String(id) === key && list[key].STREAMS[target][order] ){
        //console.log(key)
        idArr.push(id);
      }
    }
  }
  //console.log(idArr)
  if(idArr.length === 2) { //need test
    idArr.splice(idArr.indexOf(String(sourceId)), 1)
    /*
    idArr.some(function(value, i){
      if (String(v) ==String(sourceId)) idArr.splice(i,1);    
    });
    */
  }
//  console.log(idArr)
  return idArr;
}

exports.pickCmdTarget = (idHsh, cmd) => {
  let targetArr = {"id":[],"No":[],"cmd":[],"timestamp":[],"noneId":[],"targetId":"none","duplicate":"none"}
  for(let strId in idHsh) {
    //console.log(strId)
    //console.log(idHsh[strId].cmd)
    targetArr.id.push(strId)
    targetArr.No.push(idHsh[strId].No)
    targetArr.cmd.push(idHsh[strId].cmd.cmd)
    targetArr.timestamp.push(Number(idHsh[strId].cmd.timestamp))
    if(idHsh[strId].cmd.cmd === "none") targetArr.noneId.push(strId)
    if(idHsh[strId].cmd.cmd === cmd.cmd || idHsh[strId].cmd.cmd === cmd.property) targetArr.duplicate = strId
  }
  if(targetArr.duplicate != "none"){
    targetArr.targetId = targetArr.duplicate
  } else if(targetArr.noneId.length > 0){
    targetArr.targetId = targetArr.noneId[Math.floor(Math.random() * targetArr.noneId.length)]
  } else {
    //console.log(targetArr.timestamp)
    targetArr.targetId = targetArr.id[targetArr.timestamp.indexOf(Math.min.apply(null, targetArr.timestamp))]
  }
  return targetArr.targetId
}

exports.roomEmit = function roomEmit(io, name, data, target){
  for(let key in target){
    if(key in io.sockets.adapter.rooms && target[key]){
      io.to(key).emit(name,data);
    } else if(key === "all" && target[key]){
      io.emit(name,data);
    }
  }
  io.to("ctrl").emit(name,data);
}

exports.randomIdEmit = function randomIdEmit(io,ids, target, name, data){
  let idList = [];
  for(let room in ids){
    if(target[room] && room != "ctrl"){
      for(let key in ids[room]){
        idList.push(key);
      }
    }
  }
  io.to(idList[Math.floor(Math.random() * idList.length)]).emit(name, data);
}

exports.shutterReq = function shutterReq(io, data){
  io.to("all").emit('cmdFromServer', {
    "cmd": "SHUTTER",
    "property": data
  });
}

exports.movImport = function movImport(filename, filetype, libDir){
  console.log("import begin");
  const fs = require('fs');
  const pcm = require ('pcm');
  const exec = require('child_process').exec;
  let sndConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -vn -acodec copy ' + process.env.HOME + libDir + filename + '.aac';
  console.log(sndConvert);
  let rtnHsh = {"video": [],"audio":[]};
  exec(sndConvert,(error, stderr, stdout) =>{
    if(stdout){
      console.log('stdout: ' + stdout);
      rtnHsh["audio"] = audioConvert(filename, filetype, libDir);
      rtnHsh["video"] = imgConvert(filename, filetype, libDir);
      return rtnHsh;
    }
    if(stderr){
      console.log('stderr: ' + stderr);
    }
    if (error !== null) {
      console.log('Exec error: ' + error);
    } else {
      console.log("test");
    }
  });

  const audioConvert = (filename, filetype, libDir) =>{
    let tmpBuff = new Float32Array(8192);
    let rtnBuff = [];
    let url = process.env.HOME + libDir + filename + '.aac';
    let i = 0;
    pcm.getPcmData(url, { stereo: true, sampleRate: 44100 },
      function(sample, channel) {
        tmpBuff[i] = sample;
        i++;
        if(i === 8192){
          rtnBuff.push(tmpBuff);
          //recordedBuff.push(tmpBuff);
          tmpBuff = new Float32Array(8192);
          i = 0;
        }
      },
      function(err, output) {
        if (err) {
          console.log("err");
          throw new Error(err);
        }
        //console.log(recordedBuff.length);
        console.log('wav loaded from ' + url);
      }
    );
    return rtnBuff;
  }

  const imgConvert = (filename, filetype, libDir) =>{
    let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -r 5 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
  exec(imgConvert,(err,stderr,stdout)=>{
    let rtnArr = [];
    if(stdout){
      console.log('stdout: ' + stdout);
      fs.readdir(process.env.HOME + libDir, function(err, files){
          if (err) throw err;
          //console.log(files);
          files.map((f) =>{
            if( ~f.indexOf(".jpg")){
              console.log(process.env.HOME + libDir + f)
            fs.readFile(process.env.HOME + libDir + f, 'base64', (err,data) =>{
              if(err) throw err;
              rtnArr.push('data:image/webp;base64,' + data);
            });
            //          imageConvert(process.env.HOME + libDir + f, data["file"]);
            }
          })
      });
      return rtnArr;
    }
    if(stderr){
      console.log('exec stderror: '+ stderr);
    }
    if(err !== null){
      console.log('exec error: '+ err);
    }
  });
  }
} 
/*
exports.timeTableRead = function timeTableRead(unparsed){
  let timeTable = {}
  timeTable["unparsed"] = unparsed
  timeTable["parsed"] = {}
  for(let time in timeTable["unparsed"]) {
    timeTable["parsed"][Date.parse(time.replace(" ","T") + ":00+09:00") - Date.now()] = timeTable["unparsed"][time];
  };

  for(let time in timeTable["parsed"]){
    if(time > 0 && timeTable.parsed[time] != "server start"){
      setTimeout(()=>{
        console.log(timeTable["unparsed"][time]);
        console.log(timeTable["parsed"][time]);
        let room = Object.keys(timeTable["parsed"][time])[0];
        strings = timeTable.parsed[time][room]
        enterFromClient(32, {"id": "timeTable"});
      },time);
    }
  }
  return timeTable;
}*/

exports.pcm2arr = (lib, url) =>{
  let tmpBuff = new Float32Array(8192);
  let rtnBuff = [];
  var i = 0;
  lib.getPcmData(url, { stereo: true, sampleRate: 44100 },
    function(sample, channel) {
      tmpBuff[i] = sample;
      i++;
      if(i === 8192){
        rtnBuff.push(tmpBuff);
        //recordedBuff.push(tmpBuff);
        tmpBuff = new Float32Array(8192);
        i = 0;
      }
    },
    function(err, output) {
      if (err) {
        console.log("err");
        throw new Error(err);
      }
      console.log('wav loaded from ' + url);
    }
  );
  return rtnBuff;
}

exports.getInternetArr = (request, requestOption) => {
  let rtnHsh = {"audio":[],"video":[]}
  request.get(requestOption, function (error, response, body) {
    //console.log(response)
    if (!error && response.statusCode == 200) {
      body.audio.forEach((value) =>{
        rtnHsh.audio = body.audio
        rtnHsh.video = body.video
        //Array.prototype.push.apply(audioBuff.INTERNET, body.audio);
        //Array.prototype.push.apply(videoBuff.INTERNET, body.video);
      })
    } else if(response != undefined) {
      console.log('internet connect error: '+ response.statusCode);
    } else {
      console.log('internet connect error');
    }
  })
  return rtnHsh
}

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
  //console.log('chunkEmit')
  if(audiovisualChunk.length > 0) {
    io.emit('chunkFromServer', audiovisualChunk.shift());
  }
}

exports.pickupTarget = function pickupTarget(room, list, target, order){
  let idArr = [];
  for(let key in list){
    for(let id in room){
      if(String(id) === key){
        //console.log(list[key]);
        if(list[key]["STREAMS"][target][order]){
          idArr.push(id);
        }
      }
    }
  }
  return idArr;
}

exports.roomEmit = function roomEmit(io, name, data, target){
  for(let key in target){
    if(key in io.sockets.adapter.rooms){
      //console.log(key);
      io.to(key).emit(name,data);
    } else if(key === "all"){
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
  io.to("client").emit('cmdFromServer', {
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

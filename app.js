//expressの呼び出し

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const favicon = require('serve-favicon');
const dateUtils = require('date-utils');

const routes = require('./routes/index');
const users = require('./routes/users');

const five = require('johnny-five');
const pcm = require('pcm');
const exec = require('child_process').exec;


//const DashButton = require("dash-button");
//const request = require('request');
const exportComponent = require('./exportFunction.js');
const keycodeMap = require ('./lib/keyCode.json');
let statusList = require ('./lib/status.json');
//const videoBuff = require ('./lib/image.json');
const board = new five.Board();
let boardSwitch = false;
board.on('ready', () => {
  console.log("relay connected, NC open");
  let initRelay = new five.Led(13);
  initRelay.on();
});


//getUserMediaのためのHTTPS化
const https = require('https');

//https鍵読み込み
const options = {
  key: fs.readFileSync(process.env.HTTPSKEY_PATH + 'privkey.pem'),
  cert: fs.readFileSync(process.env.HTTPSKEY_PATH + 'cert.pem')
}


const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'lib/favicon.ico')));

//app.use('/', routes);
let cli_no = 0;
/* GET home page. */
app.get('/', function(req, res, next) {
  res.render('client', {
    title: 'knd',
    no: cli_no});
  cli_no = cli_no + 1;
});
app.get('/okappachan', function(req, res, next) {
  res.render('client', {
    title: 'okappachan',
    no: cli_no});
  cli_no = cli_no + 1;
});
app.get('/pocke', function(req, res, next) {
  res.render('client', {
    title: "pocke",
    no: cli_no});
  cli_no = cli_no + 1;
});

app.get('/ctrl', function(req, res, next) {
  res.render('ctrl', {
    title: 'ctrl',
    status: statusList,
    no: cli_no
   });
  cli_no = cli_no + 1;
});
app.get('/img', function(req, res, next) {
  res.render('img', {
    title: 'img',
   });
  cli_no = cli_no + 1;
});


// catch 404 and forward to error handler
/*
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});
*/
// error handlers

// development error handler
// will print stacktrace
/*
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}
*/
// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exportComponent = app;

let port = 8888;
let server = https.createServer(options,app).listen(port);
let io = require('socket.io').listen(server);

console.log("server start");

// 用途要確認
let startTime;
let toDay;
let thisYear;
let thisMonth;
let thisDate;
let scheduler;


const pcm2arr = (url) => {
  let tmpBuff = new Float32Array(8192);
  let rtnBuff = [];
  var i = 0;
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

//exports.sndImp = function wavImport(url, pcm, fname, bufferSize, io,trackNo) {
const audioBuff = {
  "DRUM": pcm2arr("./public/files/drum.wav"),
  "SILENCE": pcm2arr("./public/files/silence.wav"),
  "PLAYBACK": []
};
const videoBuff = {"PLAYBACK": []};
//const recBuffer = {"audio":[],"video":[]};
//const sampleRateList = {};
//const modList= [0.5, 0.5, 1, 18];
//const chordList = [1, 4/3, 9/4, 15/8, 17/8, 7/3, 11/3];

const instructionArr = ["HANG", "WALK", "QUIET", "MOVE", "STACK"];
const cmdList = ["FEEDBACK","WHITENOISE","SINEWAVE","RECORD","PLAYBACK","LOOKBACK","LOOPBACK","CHAT","VIDEOCHAT","CLICK","NOISE","FEED","PLAY","REC","DRUM","SILENCE","LOOK","LOOP","FILTER","MOD","MODULATION","CHORD","STOP"];

const instructionDuration = [10000, 30000, 60000];
let strings = "";
//let prevCmd = "";


// for connection check
const intervalValue = 30000; // 1min
//const chunkInterval = 2000; // change later
setInterval(function() {
//  io.emit("connectionChkFromServer");
  for(let key in statusList["connected"]){
    if(io["sockets"]["adapter"]["rooms"][key] != undefined){
      statusList["connected"][key] = io["sockets"]["adapter"]["rooms"][key]["sockets"];
    }
  }
  console.log(statusList["connected"]);
  io.to("ctrl").emit("statusFromServer",statusList);
}, intervalValue);


// for pool audio visual chunk
let audiovisualChunk = [];

let okappa_id = 0;
let pocke_id = 0;

io.sockets.on('connection',(socket)=>{
  socket.on("connectFromClient", (data) => {
    socket.join(data);
    console.log(io.sockets.adapter.rooms);
    // console.log("test");
    statusList["connected"][data][socket.id] = true;
    io.to("ctrl").emit("statusFromServer", statusList);
    io.emit('streamStatusFromServer', statusList["cmd"]["streamFlag"]);
  });
  /*
  socket.on("connectionChkFromClientt", (data) =>{
    //たぶん下記だとNGだが、
    statusList["connected"][data].map((val)=>{
      if(val === socket.id){

      }
    });
  });*/
  /*
  socket.on('infoReqFromClient',() =>{
    let connectedList = Object.keys(io["sockets"]["connected"]);
    let clientNumber = connectedList.indexOf(socket["id"]);
    console.log(connectedList);
    console.log(socket["id"] + " connected " + socket["handshake"]["headers"]["host"] + " as " + String(clientNumber));
    socket.emit('infoFromServer',{
      "address" : socket["handshake"]["headers"]["host"],
      "number" : clientNumber
    });
  });
  */
  socket.on('chunkFromClient', (data)=>{
    chunkFromClient(data);
  });


  socket.on('charFromClient', (keyCode) =>{
    charFromClient(keyCode);
  });

  socket.on('wavReqFromClient',(data)=>{
    wavReqFromClient(data);
  })
  /*
  socket.on('reqChunkFromClient', (data)=>{
//    forin(io["sockets"]["connected"]){
//    }
    if(audiovisualChunk.length > 0) {
      let tmpBuff = audiovisualChunk.shift();
//      console.log(tmpBuff);
      if(data === "all"){
        tmpBuff["mode"] = "all";
        console.log('chunkEmit all');
        exportComponent.roomEmit(io, 'chunkFromServer', tmpBuff, statusList["cmd"]["target"]);
//        io.emit('chunkFromServer', tmpBuff);
      } else if(data ==="single"){
        tmpBuff["mode"] = "single";
        console.log('chunkEmit single');
        socket.emit('chunkFromServer', tmpBuff);
      } else if(data ==="loop_all"){
        tmpBuff["mode"] = "loop";
        exportComponent.roomEmit(io, 'chunkFromServer', tmpBuff, statusList["cmd"]["target"]);
//        io.emit('chunkFromServer', tmpBuff);
        audiovisualChunk.push(tmpBuff);
        console.log('chunkEmit loop all');
      } else if(data === "loop_single"){
        tmpBuff["mode"] = "loop";
        socket.emit('chunkFromServer', tmpBuff);
        console.log('chunkEmit loop single');
        audiovisualChunk.push(tmpBuff);
      }
    } else {
      io.emit("cmdFromServer", {"cmd": "STOP"});
    }
  });
*/
  socket.on("uploadReqFromClient", (data) =>{
    let dataArr = data.split(".");
     uploadReqFromClient({
    //  movImport({
      "type": dataArr[1],
      "file": dataArr[0]
    });
  });

  //from ctrl.js
  socket.on("targetCtrlFromClient", (data) =>{
    console.log(data);
    statusList["cmd"][data["type"]] = data["data"];
    if(data["type"] === "mute"){
      for(let key in data["data"]){
        io.to(key).emit('cmdFromServer', {
          "cmd": "MUTE",
          "property": data["data"][key]
        });
      }
/*      io.to("pocke").emit('cmdFromServer', {
        "cmd": "MUTE",
        "property": data["data"]["pocke"]
      });*/
    }
    console.log(statusList["cmd"]["target"]);
    socket.emit('statusFromServer',statusList);
  });

  socket.on('standAlonefromClient', (data) =>{
    if(data){
      socket.leave("all");
      socket.join("standalone");
    } else {
      socket.leave("standalone");
      socket.join("all");
    }
  });

  socket.on("disconnect", (socket) =>{
//    disconnect();
    console.log("disconnect: " + socket.id);
    if(statusList["connected"]["okappachan"][socket.id]){
      delete statusList["connected"]["okappachan"][socket.id];
      socket.leave("okappachan");
    } else if(statusList["connected"]["pocke"][socket.id]){
      delete statusList["connected"]["pocke"][socket.id];
      socket.leave("pocke");
    }
    console.log(statusList["connected"]);
    //statusList["connected"]から抜く
    io.to("ctrl").emit("statusFromServer", statusList);
  });
});



const disconnect = (socket) =>{

}

const charFromClient = (keyCode) =>{
  let character = keycodeMap[String(keyCode)];
  //      strings = exportComponent.char2Cmd(io, strings, character, cmdList, keyCode);
  if(character === "enter") {
//    if(cmdList.indexOf(strings) > -1) {
    console.log(strings);
    let cmd = cmdSelect(strings);
    if(cmd) {
      exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"]);
      for(let key in statusList["cmd"]["stream"]){
        if(cmd["cmd"] === key){
          // console.log("stream");
          statusList["cmd"]["streamFlag"][statusList["cmd"]["stream"][key]] = true;
          setTimeout(() =>{
            wavReqFromClient(cmd["cmd"]);
          },800);
        }
      }
      //if(cmd["cmd"] === "CHAT" || cmd["cmd"] === "DRUM" || cmd["cmd"] === "PLAYBACK" || cmd["cmd"] === "TIMELAPSE" || cmd["cmd"] === "SILENCE"){
      //}
    }
    if (isNaN(Number(strings)) === false && strings != "") {
      let json = sineWave(strings);
      exportComponent.roomEmit(io, 'cmdFromServer', json, statusList["cmd"]["target"]);
    } else if( ~strings.indexOf("_") ) {
      let strArr = strings.split("_");
      console.log(strArr);
      let rtnRate = "";
      if(isNaN(Number(strArr[0])) === false && strArr[0] != ""){
        let json = false;
        let cmd = cmdSelect(strArr[1]);
        let Id = targetNoSelect(Number(strArr[0]));
        if(cmd){
          json = cmd;
        } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
          json = sineWave(strArr[1]);
        }
//        if(json && (cmd != "CHAT" || cmd != "DRUM" || cmd != "PLAYBACK" || cmd != "TIMELAPSE" || cmd != "SILENCE")){
        if(json){
          let flag = true;
          for(let key in statusList["cmd"]["stream"]){
            if(cmd === key){
              flag = false;
            }
          }
          if(flag){
            io.to(Id).emit("cmdFromServer", json);
            io.emit("statusViewFromServer");
          }
        }
      } else if(strArr[0] === "VOL" || strArr[0] === "VOLUME"){
        console.log("VOLUME " + strArr[1]);
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "VOLUME",
          "property": strArr[1]
        }, statusList["cmd"]["target"]);
      } else if((strArr[0] === "UP" || strArr[0] === "DOWN") && isNaN(Number(strArr[1])) === false && strArr[1] != "") {
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "SINEWAVE_" + strArr[0],
          "property": Number(strArr[1])
        }, statusList["cmd"]["target"]);
      } else if((strArr[0] === "PORTAMENT" || strArr[0] === "PORT") && isNaN(Number(strArr[1])) === false && strArr[1] != ""){
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "PORTAMENT",
          "property": Number(strArr[1])
        }, statusList["cmd"]["target"]);
      } else if(strArr[1] === "OFF" || strArr[1] === "STOP"){
        console.log("off");
        for(let key in statusList["cmd"]["stream"]){
          if(key === strArr[0]){
            statusList["cmd"]["streamFlag"][statusList["cmd"]["stream"][key]] = false;
            // console.log(statusList["cmd"]["streamFlag"]);
          }
        }
      }
      if(strArr[1] === "RATE" && statusList["sampleRate"][strArr[0]] != undefined){
        switch(statusList["sampleRate"][strArr[0]]){
          case "22050":
          rtnRate = "44100";
          break;
          case "44100":
          rtnRate = "88200";
          break;
          case "88200":
          rtnRate = "11025";
          break;
          default:
          rtnRate = "22050";
          break;
        }
        statusList["sampleRate"][strArr[0]] = rtnRate;
        exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate(" + strArr[0]+"):"+rtnRate + "Hz", statusList["cmd"]["target"]);
//        io.to("ctrl").emit('statusFromServer', statusList);
      }
    } else if(strings === "RATE" || strings === "SAMPLERATE") {
//    }
//    if(strings === "RATE" || strings === "SAMPLERATE") {
      let rtnRate;
      let aveRate =0;
      let keys = 0;
      for (let key in statusList["sampleRate"]){
        aveRate = aveRate + Number(statusList["sampleRate"][key]);
        keys = keys + 1;
      }
      aveRate = aveRate / keys;
      if(aveRate >= 22050 && aveRate < 44100){
        rtnRate = "44100";
      } else if(aveRate >= 44100 && aveRate < 88200){
        rtnRate = "88200";
      } else if(aveRate >= 88200){
        rtnRate = "11025";
      } else {
        rtnRate = "22050";
      }
      for (let key in statusList["sampleRate"]){
        statusList["sampleRate"][key] = rtnRate;
      }
      exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate: " + rtnRate + "Hz", statusList["cmd"]["target"]);
//      io.to("ctrl").emit('statusFromServer', statusList);
    } else if(strings === "SWITCH"){
      if(board.isReady){
        let relay = new five.Led(13);
        if(boardSwitch) {
          boardSwitch = false;
          relay.on();
          console.log("switch off")
          io.emit("cmdFromServer", {"cmd" : "SWITCH OFF"});
          statusList["cmd"]["now"]["SWITCH"] = false;
        } else {
          boardSwitch = true;
          relay.off();
          console.log("stitch on");
          io.emit("cmdFromServer", {"cmd" : "SWITCH ON"});
          statusList["cmd"]["now"]["SWITCH"] = true;
        }
      } else {
        console.log("arduino not ready");
        io.emit('instructionFromServer', {
          "text": "ARDUINO ERROR",
          "duration": 1500
        })
        statusList["cmd"]["now"]["SWITCH"] = "can't use";
      }
    } else if(strings === "STOP"){
      stopFromServer();
    }
    statusList["cmd"]["prevCmd"] = strings;
    let dt = new Date();
    statusList["cmd"]["prevTime"] = dt.toFormat("HH24:MI:SS");
//      prevCmd = strings;
    strings = "";
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(character === "backspace" || character === "left_arrow" || character === "shift" || character === "ctrl" || character === "tab") {
     //left OR shift OR ctrl OR tab OR esc
//      io.emit("stringsFromServer", "")
    exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
    //socket.broadcast.emit("stringsFromServer", "");
    strings =  "";
  } else if(character === "escape"){
    stopFromServer();
  } else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 32 || keyCode === 189 || keyCode === 226){ //alphabet or number
    //add strings;
    strings =  strings + character;
    exportComponent.roomEmit(io, 'stringsFromServer', strings, statusList["cmd"]["target"]);
    if(strings === "B") {
      strings = "";
    }
  } else if(character === "up_arrow"){
    strings = statusList["cmd"]["prevCmd"];
    exportComponent.roomEmit(io, 'stringsFromServer', strings, statusList["cmd"]["target"]);
//      io.emit("stringsFromServer", strings);
  }
}

const wavReqFromClient = (data) => {
  console.log(statusList["cmd"]["streamFlag"]);
//  let targetId = exportComponent.randomTarget(statusList["connected"],statusList["cmd"]["target"]);
  let json = {
    "target": data,
    "sampleRate": Number(statusList["sampleRate"][data])
  };
  if(data === "PLAYBACK" && statusList["cmd"]["streamFlag"]["PLAYBACK"]){
    json["audio"] = audioBuff[data].shift();
    json["video"] = videoBuff[data].shift();
    audioBuff[data].push(json["audio"]);
    videoBuff[data].push(json["video"]);
  } else if(data === "TIMELAPSE" && statusList["cmd"]["streamFlag"]["TIMELAPSE"]){
    if(audiovisualChunk.length > 0) {
      let tmpBuff = audiovisualChunk.shift();
      audiovisualChunk.push(tmpBuff);
      json["audio"] = tmpBuff["audio"];
      json["video"] = tmpBuff["video"];
    }
  } else if(data === "CHAT" && statusList["cmd"]["streamFlag"][data]){
          json["audio"] = "";
          json["video"] = "";
  } else if((data === "DRUM" || data === "SILENCE") && statusList["cmd"]["streamFlag"][data]){
    json["audio"] = audioBuff[data][Math.floor(Math.random() * audioBuff[data].length)];
    json["video"] = "";
  } else if(statusList["cmd"]["streamFlag"][data]){
      json["audio"] = audioBuff[data].shift();
      json["video"] = videoBuff[data].shift();
      audioBuff[data].push(json["audio"]);
      videoBuff[data].push(json["video"]);
  }
  if(json["audio"] != undefined){
    exportComponent.randomIdEmit(io,statusList["connected"],statusList["cmd"]["target"],'chatFromServer',json);
  }
  /*  io.to(targetId).emit('chatFromServer', {
      "audio": audio,
      "video": video,
      "target": data,
      "sampleRate": Number(statusList["sampleRate"][data])
    });*/
//    io.to("ctrl").emit('chatFromServer', json);
}

const chunkFromClient = (data) => {
  //  console.log(data["target"]);
  if(data["target"] === "CHAT" && statusList["cmd"]["streamFlag"][data["target"]]){
    let json = {
      "audio": data["audio"],
      "video": data["video"],
      "target": data["target"],
      "sampleRate": Number(statusList["sampleRate"][data["target"]])
    };
    exportComponent.randomIdEmit(io,statusList["connected"],statusList["cmd"]["target"],'chatFromServer',json);
//    io.to(targetId).emit('chatFromServer',json);
//    io.to("ctrl").emit('chatFromServer',json);
  } else if(data["target"] === "PLAYBACK"){
    audioBuff["PLAYBACK"].push(data["audio"]);
    videoBuff["PLAYBACK"].push(data["video"]);
//      recBuffer["audio"].push(data["audio"]);
//      recBuffer["video"].push(data["video"]);
  } else if(data["target"] === "timelapse" || data["target"] === "TIMELAPSE"){
    audiovisualChunk.push({"audio": data["audio"], "video": data["video"]});
    console.log("chunk length: " + String(audiovisualChunk.length));
  }
} //もともと小文字だったので表示されないとしたらそのせい（TIMELAPSE）

const stopFromServer = () => {
  exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "STOP"}, statusList["cmd"]["target"]);
  for(let key in statusList["cmd"]["now"]){
    statusList["cmd"]["now"][key] = false;
  }
  for(let key in statusList["cmd"]["streamFlag"]){
    statusList["cmd"]["streamFlag"][key] = false;
  }
  console.log(statusList["cmd"]["now"]);
  io.to("ctrl").emit('statusFromServer', statusList);
  strings = "";
}

const cmdSelect = (strings) => {
  let cmd = false;
  for(let key in statusList["cmd"]["list"]){
    if(strings === key){
      cmd = {"cmd": statusList["cmd"]["list"][key]};
      console.log("do cmd " + cmd["cmd"]);
      if(statusList["cmd"]["now"][cmd["cmd"]]){
        statusList["cmd"]["now"][cmd["cmd"]] = false;
      } else {
        statusList["cmd"]["now"][cmd["cmd"]] = true;
      }
    }
  }
  return cmd;
}

const sineWave = (strings) => {
  console.log("sinewave " + strings + "Hz");
  let json = {"cmd": "SINEWAVE", "property": Number(strings)};
  if(strings === statusList["cmd"]["now"]["SINEWAVE"]){
    statusList["cmd"]["now"]["SINEWAVE"] = false;
  } else {
    statusList["cmd"]["now"]["SINEWAVE"] = strings;
  }
  return json;
}

const targetNoSelect = (i) =>{
  let j = 0;
  let rtnId = false
  for(let key in io.sockets.adapter.nsp.sockets){
    if(i === j){
      rtnId = key;
    }
    j = j + 1;
  }
  return rtnId;
}

let bikiNo = 0;

const uploadReqFromClient = (data) => {
  if(data["type"] === "mp4" || data["type"] === "mov"){
    let downloadMov = '/bin/bash ' + process.env.HOME + '/sh/db_uploader.sh download ' + dbDir + data["file"] + '.' + data["type"] + ' ' + process.env.HOME + libDir + data["file"] + '.' + data["type"];
    exec(downloadMov, (error, stdout, stderr) => {
      if(stdout){
        console.log('stdout: ' + stdout);
        movImport(data);
      }
      if(stderr){
        console.log('stderr: ' + stderr);
        movImport(data);
      }
      if (error !== null) {
        console.log('Exec error: ' + error);
      }
    });
  } else {
    console.log("対象外です");
  }
}

const movImport = (data) =>{
  let sndConvert = 'ffmpeg -i ' + process.env.HOME + libDir + data["file"] + '.' + data["type"] + ' -vn -acodec copy -t 10 ' + process.env.HOME + libDir + data["file"] + '.aac';
  let arr = [];
  videoBuff[data["file"]] = arr;
  console.log(sndConvert);
//  console.log(imgConvert);
  exec(sndConvert,(error,stdout,stderr) =>{ //引数の順序おかしい？stdoutとstderrが逆になってるような。。。
    if(stdout){
      console.log('stdout: ' + stdout);
      statusList["cmd"]["list"][data["file"]] = data["file"];
      statusList["cmd"]["stream"][data["file"]] = data["file"];
      statusList["cmd"]["streamFlag"][data["file"]] = false;
      audioConvert(data);
    }
    if(stderr){
      console.log('stderr: ' + stderr);
      statusList["cmd"]["list"][data["file"]] = data["file"];
      statusList["cmd"]["stream"][data["file"]] = data["file"];
      statusList["cmd"]["streamFlag"][data["file"]] = false;
      io.emit('streamStatusFromServer', statusList["cmd"]["streamFlag"]);
      audioConvert(data);
    }
    if (error !== null) {
      console.log('Exec error: ' + error);
      // audioConvert(data);
      // statusList["cmd"]["list"][data["file"]] = data["file"];
      // statusList["cmd"]["stream"][data["file"]] = data["file"];
    }
  });
  /*
  exec(imgConvert,(error,stdout,stderr) =>{
    if(stdout){
      console.log('stdout: ' + stdout);
    }
    if(stderr){
      console.log('stderr: ' + stderr);
    }
    if (error !== null) {
      console.log('Exec error: ' + error);
    }
  });
  */
//  setTimeout(() =>{
//  },5000)
}
const audioConvert = (data) =>{
//  console.log(statusList);
  audioBuff[data["file"]] = pcm2arr(process.env.HOME + libDir + data["file"] + '.aac');
  videoBuff[data["file"]] = [];
/*  setTimeout(() => {
    console.log(audioBuff["test"])},10000);
*/
  //できれば文字を大文字変換する機能を具備したい
  let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + data["file"] + '.' + data["type"] + '-t 10 -r 2 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
  // 'ffmpeg -itsoffset -1 -i ' + process.env.HOME + libDir + 'BIKI_0.mov' + ' -y -ss ' + 0 + ' -f image2 -an ' + process.env.HOME + libDir +  'BIKI_0_' + String(0) + '.jpg'; //静止画エンコード反映要
  console.log(imgConvert);
  exec(imgConvert,(err,stdout,stderr)=>{
    if(stdout){
      console.log('stdout: ' + stdout);
      for(let i=1;i<20;i++){
        let fileName = ('000000' + String(i)).slice(-6);
        imageConvert(process.env.HOME + libDir + fileName + '.jpg', data["file"]);
      }
      setTimeout(()=>{
        console.log(ata["file"] + " maybe import done");
        exec('rm ' + process.env.HOME + libDir + '*');
      },10000)
    }
    if(stderr){
      console.log('stderr: ' + stderr);
      for(let i=1;i<20;i++){
        let fileName = ('000000' + String(i)).slice(-6);
        imageConvert(process.env.HOME + libDir + fileName + '.jpg', data["file"]);
      }
      setTimeout(()=>{
        console.log(data["file"] + " maybe import done");
        exec('rm ' + process.env.HOME + libDir + '*');
      },10000)
    }
    if(err !== null){
      console.log('exec error: '+ err);
    }
  });

  /*
  for(let j;j<6;j++){
    let imgConvert = 'ffmpeg -itsoffset -1 -i ' + process.env.HOME + libDir + 'BIKI_0.mov' + ' -y -ss ' + j + ' -f image2 -an ' + process.env.HOME + libDir +  'BIKI_0_' + String(j) + '.jpg'; //静止画エンコード反映要
    console.log(imgConvert);
    exec(imgConvert,(err,stdout,stderr)=>{
      if(stdout){
        console.log('stdout: ' + stdout);
        arr.push(imageConvert('./lib/' + outputImg + String(i) + '.jpg'));
        console.log("img");
      }
      if(stderr){
        console.log('stderr: ' + stderr);
        arr.push(imageConvert('./lib/' + outputImg + String(i) + '.jpg'));
        console.log("img");
      }
      if(err !== null){
        console.log('exec error: '+ err);
      }
    });
  }
  bikiNo = bikiNo + 1;
  */
}


const imageConvert = (file, buff) =>{
//  let rtn;
  fs.readFile(file, 'base64', (err,data) =>{
    if(err) throw err;
    videoBuff[buff].push('data:image/webp;base64,' + data);
  });
}

const homeDir = '/home/knd/'
const libDir = '/node_web/lib/db/'
// const dbDir = '/20170624/'
const dbDir = '/20170624/'


// uploadReqFromClient({
/*
movImport({
  "type": "mov",
  "file": "TEST"
});
*/

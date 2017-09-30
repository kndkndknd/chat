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

//const five = require('johnny-five');
const pcm = require('pcm');

<<<<<<< Updated upstream

//const DashButton = require("dash-button");
//const request = require('request');
=======
const five = require('johnny-five');
const board = new five.Board();
let boardSwitch = false;
board.on('ready', () => {
  console.log("relay connected, NC open");
  let relay = new five.Led(13);
  relay.on();
  setTimeout(()=>{
    relay.off();
    },500);
});

>>>>>>> Stashed changes
const exportComponent = require('./exportFunction.js');
const keycodeMap = require ('./lib/keyCode.json');
let statusList = require ('./lib/status.json');
//const videoBuff = require ('./lib/image.json');
/*const board = new five.Board();
let boardSwitch = false;

board.on('ready', () => {
  console.log("relay connected, NC open");
  let initRelay = new five.Led(13);
  initRelay.on();
});
*/
//getUserMediaのためのHTTPS化
const https = require('https');
// HTTPと同時に立てるテスト
const http = require('http');

//https鍵読み込み
/*
const ssl_server_key = './server_key/server_key.pem',
    ssl_server_crt = './server_key/server_crt.pem',
    fs = require('fs');
const options = {
  key: fs.readFileSync(ssl_server_key),
  cert: fs.readFileSync(ssl_server_crt)
};*/
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
// let cli_no = 0;
/* GET home page. */

app.get('/', function(req, res, next) {
<<<<<<< Updated upstream
  res.render('client', {
    title: 'knd',
    no:cli_no,
    prop: 'all'
  });
});
app.get('/okappachan', function(req, res, next) {
  res.render('client', {
    title: 'okappachan',
    no: cli_no,
    prop: 'all'});
  cli_no = cli_no + 1;
});
app.get('/pocke', function(req, res, next) {
  res.render('client', {
    title: "pocke",
    no: cli_no,
    prop: 'all'});
  cli_no = cli_no + 1;
});
=======
  res.render('client', {title: 'knd'});
});
>>>>>>> Stashed changes

app.get('/ctrl', function(req, res, next) {
  res.render('ctrl', {
    title: 'ctrl',
<<<<<<< Updated upstream
    status: statusList,
    no: cli_no,
    prop: 'all'
=======
    status: statusList
>>>>>>> Stashed changes
   });
});
<<<<<<< Updated upstream
app.get('/img', function(req, res, next) {
  res.render('img', {
    title: 'img',
   });
  cli_no = cli_no + 1;
=======
app.get('/info', function(req, res, next) {
  console.log(req);
  res.render('info', {
    title: 'info'
  });
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
console.log("server start");

// 用途要確認
let startTime;
let toDay;
let thisYear;
let thisMonth;
let thisDate;
let scheduler;

=======
let httpPort = 8000;
let httpServer = http.createServer(app).listen(httpPort);

//console.log("server start in " + os.networkInterfaces().en0[1]["address"] + ":" + String(port));
>>>>>>> Stashed changes

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
      if (err)
        throw new Error(err);
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

const homeDir = '/home/knd/'
const libDir = '20170624/lib/'
const dbDir = '/20170624/'

const instructionArr = ["HANG", "WALK", "QUIET", "MOVE", "STACK"];
const cmdList = ["FEEDBACK","WHITENOISE","SINEWAVE","RECORD","PLAYBACK","LOOKBACK","LOOPBACK","CHAT","VIDEOCHAT","CLICK","NOISE","FEED","PLAY","REC","DRUM","SILENCE","LOOK","LOOP","FILTER","MOD","MODULATION","CHORD","STOP"];

const instructionDuration = [10000, 30000, 60000];
let strings = "";
<<<<<<< Updated upstream
//let prevCmd = "";

=======
const homeDir = '/Users/knd/'
//const libDir = '/gits/prototype/20170929/lib/db/'
const libDir = '/Downloads/';
// const dbDir = '/20170624/'
//const dbDir = '/20170624/'
let timelapseFlag = false;
>>>>>>> Stashed changes

// for connection check
const intervalValue = 10000; // 1min
//const chunkInterval = 2000; // change later
setInterval(function() {
//  io.emit("connectionChkFromServer");
  for(let key in statusList["connected"]){
    if(io["sockets"]["adapter"]["rooms"][key] != undefined){
      statusList["connected"][key] = io["sockets"]["adapter"]["rooms"][key]["sockets"];
    }
  }
<<<<<<< Updated upstream
  console.log(statusList["connected"]);
=======
  console.log("now connected: ");
  console.log(statusList["clients"]);
>>>>>>> Stashed changes
  io.to("ctrl").emit("statusFromServer",statusList);
  if(timelapseFlag) {
    exportComponent.shutterReq(io, "oneshot");
    /*
    if(Math.random() > 0.8) {
      let arr = [];
      for(let key in statusList["instruction"]){
        arr.push(key);
      }
      let instruction = arr[Math.floor(Math.random() * arr.length)];
      console.log("instruction: " + instruction);
      io.to("client").emit("instructionFromServer", {
        "text": instruction,
        "duration": Math.round(Math.random() * 100) * 600
      });
    }
    */
  }
}, intervalValue);

<<<<<<< Updated upstream

// for pool audio visual chunk
let audiovisualChunk = [];

let okappa_id = 0;
let pocke_id = 0;

=======
/*
app.post('/esp8266', function(req, res){
  console.log("post receive");
  console.log(req.body);
  for(let key in req.body){
    let targetid;
    let targetRoom;
    if(key === "surface"){
      targetRoom = "川面";
      for(let id in statusList["clients"]){
        if(statusList["clients"][id]["No"] === 0) targetid = id;
      }
    } else if(key === "bottom"){
      targetRoom = "川底";
      for(let id in statusList["clients"]){
        if(statusList["clients"][id]["No"] === 1) targetid = id;
      }
    }
    for(let id in io.sockets.adapter.rooms){
      if(String(id) === targetid) targetid = id;
    }
    io.to(targetid).emit('cmdFromServer', {
      "cmd": "MUNOU",
      "property": {
        "speed": Number(req.body[key])/20,
        "room": targetRoom
      }
    });
  }
});
*/
let cliNo = 0;
>>>>>>> Stashed changes
io.sockets.on('connection',(socket)=>{
  socket.on("connectFromClient", (data) => {
    socket.join(data);
<<<<<<< Updated upstream
    console.log(io.sockets.adapter.rooms);
    statusList["connected"][data][socket.id] = true;
    io.to("ctrl").emit("statusFromServer", statusList);
=======
    if(data != "ctrl"){
      socket.join("default");
    }
    if(statusList["connected"][data] === undefined){
      statusList["connected"][data] = {sockId: true};
    } else {
      statusList["connected"][data][sockId] = true;
    }
    if(data != "ctrl"){
      let pcname = "unknown";
      for(let key in statusList["pc"]){
        if(statusList["pc"][key] === socket["handshake"]["headers"]["user-agent"]){
          pcname = key
        }
      }
      if(pcname === "unknown"){
        console.log(socket["handshake"]["headers"]["user-agent"]);
      }
      //console.log(Object.keys(statusList["clients"]));
      if(Object.keys(statusList["clients"])[0] === 'dummy' && Object.keys(statusList["clients"].length === 1 )){
        delete statusList["clients"]["dummy"];
      }
        statusList["clients"][sockId] = {
          "room":data,
          "No": cliNo,
          "type": pcname,
          "STREAMS": {
            "SECBEFORE": {"TO": true, "ACK": true, "arr": 0, "LATENCY": "0", "RATE":"44100"},
            "RECORD": {"FROM": true, "arr": 0}
          }  
        };
        for(let key in statusList["cmd"]["streamFlag"]){
          switch(key){
            case "CHAT":
              statusList["clients"][sockId]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": "0", "RATE":"44100"};
              break;
            //case "RECORD":
             // statusList["clients"][sockId]["STREAMS"][key] = {"FROM": true, "arr": 0, "LATENCY": "0", "RATE":"44100"};
              //break;
            default:
              statusList["clients"][sockId]["STREAMS"][key] = {"TO": true, "arr": 0, "LATENCY": "0", "RATE":"44100"};
          }
        }
      cliNo ++;
    }
    io.to("ctrl").emit("statusFromServer", statusList);
    io.emit('streamStatusFromServer', statusList["streamStatus"]["streamFlag"]);
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
//    console.log("chunk");
    chunkFromClient(data);
=======
    chunkFromClient(data, String(socket.id));
  });

  socket.on('AckFromClient', (data)=>{
    statusList["clients"][String(socket.id)]["STREAMS"][data]["ACK"] = true;
    if(statusList["streamStatus"]["emitMode"] === "BROADCAST" && data === "CHAT"){
      let ackAll = true;
      for(let key in statusList["clients"]){
        if(statusList["clients"][key]["STREAMS"]["CHAT"]["ACK"] === false){
          ackAll = false;
        }
      }
      if(ackAll){
        streamReq(data, String(socket.id));
      }
    } else {
      streamReq(data, String(socket.id));
    }
>>>>>>> Stashed changes
  });


  socket.on('charFromClient', (keyCode) =>{
    charFromClient(keyCode,socket);
  });

  socket.on('wavReqFromClient',(data)=>{
<<<<<<< Updated upstream
//    console.log("what the fuck");
    wavReqFromClient(data);
=======
    // wavReqFromClient(data);
    streamReq(data, String(socket.id));
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    uploadReqFromClient();
  });
=======
    let dataArr = data.split(".");
    //let hsh = exportComponent.movImport(dataArr[0],dataArr[1],libDir);
    //fileImport(dataArr[0],dataArr[1],libDir,statusImport);
    videoImport(dataArr[0],dataArr[1],libDir,statusImport);
  }); 
>>>>>>> Stashed changes

  //from ctrl.js
  socket.on("targetCtrl_from_client", (data) =>{
//    console.log(data["target"]);
    statusList["cmd"]["target"] = data;
    console.log(statusList["cmd"]["target"]);
    socket.emit('statusFromServer',statusList);
  });

<<<<<<< Updated upstream
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

const uploadReqFromClient = (data) => {
  if(data["type"] === "mov"){
    exec('/bin/bash ' + homeDir + 'dbdownloader download ' + dbDir + data["file"] + ' ' + homeDir + libDir + data["file"],(error, stdout, stderr) => {
      if(stdout){
        console.log('stdout: ' + stdout);
=======
  socket.on('cmdFromCtrl', (data) =>{
    switch(data["cmd"]){
      case "FROM":
      case "TO":
        // console.log(data["property"]);
        if("clients" in statusList && data["property"]["target"] in statusList["clients"] && data["property"]["stream"] in statusList["clients"][data["property"]["target"]]["STREAMS"]){
          statusList["clients"][data["property"]["target"]]["STREAMS"][data["property"]["stream"]][data["cmd"]] = data["property"]["val"];
        }
        // console.log(statusList["clients"]);
        break;
      case "gain":
        //console.log(data["property"]);
        if("gain" in statusList && data["property"]["target"] in statusList["gain"]){
          statusList["gain"][data["property"]["target"]] = String(data["property"]["val"]);
        }
        // console.log(statusList["gain"]);
        io.to("client").emit("cmdFromServer", {
          "cmd": "GAIN",
          "property": data["property"]
        });
        break;
      case "sampleRate":
        //console.log(data["property"]);
        if("sampleRate" in statusList && data["property"]["target"] in statusList["sampleRate"]){
          statusList["sampleRate"][data["property"]["target"]] = String(data["property"]["val"]);
          for(let key in statusList["clients"]){
            statusList["clients"][key]["STREAMS"][data["property"]["target"]]["RATE"] = String(data["property"]["val"]);
          }
          /*
          if(data["property"]["target"] === "CHAT"){
            for(let key in statusList["clients"]){
              statusList["clients"][key]["CHATRATE"] = Number(data["property"]["val"]);
            }
          }*/
        }
        exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate: " + String(data["property"]["val"]) + "Hz", statusList["cmd"]["target"]);
        break;
      case "shutter":
        //console.log("shutter "+ data["property"]);
        exportComponent.shutterReq(io, data["property"]);
        break;
      case "RATE":
      case "LATENCY":
        //console.log(data["property"]["target"] + ":" + data["property"]["streamType"] + data["cmd"] + " change");
        statusList["clients"][data["property"]["target"]]["STREAMS"][data["property"]["streamType"]][data["cmd"]] = String(data["property"]["val"]);
        break;
    }
    //io.to("ctrl").emit("statusFromServer", statusList);
  })
  socket.on("disconnect", () =>{
//    disconnect();
    console.log(socket.id);
    let sockId = String(socket.id);
    console.log("disconnect: " + sockId);
    for(let key in statusList["connected"]){
      if(statusList["connected"][key][sockId]){
        delete statusList["connected"][key][sockId];
        socket.leave(key);
>>>>>>> Stashed changes
      }
      if(stderr){
        console.log('stderr: ' + stderr);
      }
<<<<<<< Updated upstream
      if (error !== null) {
        console.log('Exec error: ' + error);
      }
    });

/*      exec 'ffmpeg -i -vn -acodec copy ' + homeDir + libDir + data["file"] + ' ' + homeDir + libDir + data["sndfile"];
    //pcmで音声処理
    for(let i=0;i++;i<data["length"]){
      exec 'ffmpeg -i '; //秒ごとに抽出

    }*/
  }
}

const disconnect = (socket) =>{

}
=======
      delete statusList["clients"][sockId];
    }
    cliNo = 0;
    for(let key in statusList["clients"]){
      statusList["clients"][key]["No"] = cliNo;
      cliNo++;
    }
    io.to("ctrl").emit("statusFromServer",statusList);
  });

});
>>>>>>> Stashed changes


const charFromClient = (keyCode, socket) =>{
  let character = keycodeMap[String(keyCode)];
  //      strings = exportComponent.char2Cmd(io, strings, character, cmdList, keyCode);
  if(character === "enter") {
<<<<<<< Updated upstream
//    if(cmdList.indexOf(strings) > -1) {
    let cmd = cmdSelect(strings);
    if(cmd) {
      exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"]);
      if(cmd["cmd"] === "CHAT" || cmd["cmd"] === "DRUM" || cmd["cmd"] === "PLAYBACK" || cmd["cmd"] === "TIMELAPSE" || cmd["cmd"] === "SILENCE"){
        setTimeout(() =>{
          wavReqFromClient(cmd["cmd"]);
        },800);
=======
    exportComponent.roomEmit(io,'textFromServer', strings, statusList["cmd"]["target"]);
    let cmd = cmdSelect(strings);
    if(cmd) {
      console.log("cmd: " + cmd["cmd"]);
      if(cmd["cmd"] === "RECORD"){
        let idArr = [];
        idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], cmd["cmd"], "FROM");
        // console.log(idArr);
        for(let i=0;i<idArr.length;i++){
          io.to(idArr[i]).emit('cmdFromServer', cmd);
        }
      } else {
        exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"]);
      }
      for(let key in statusList["cmd"]["stream"]){
        if(cmd["cmd"] === key){
          console.log("stream start");
          statusList["streamStatus"]["streamFlag"][statusList["cmd"]["stream"][key]] = true;
          setTimeout(() =>{
            streamReq(cmd["cmd"], String(socket.id));
            // wavReqFromClient(cmd["cmd"]);
          },500);
        }
>>>>>>> Stashed changes
      }
    }
    if (isNaN(Number(strings)) === false && strings != "") {
      let json = sineWave(strings);
      exportComponent.roomEmit(io, 'cmdFromServer', json, statusList["cmd"]["target"]);
    } else if( ~strings.indexOf("_") ) {
      let strArr = strings.split("_");
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
        if(json && (cmd != "CHAT" || cmd != "DRUM" || cmd != "PLAYBACK" || cmd != "TIMELAPSE" || cmd != "SILENCE")){
          io.to(Id).emit("cmdFromServer", json);
          io.emit("statusViewFromServer");
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
<<<<<<< Updated upstream
      }
      exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate: " + rtnRate + "Hz", statusList["cmd"]["target"]);
//      io.to("ctrl").emit('statusFromServer', statusList);
=======
        for(let clientID in statusList["clients"]){
            statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
        }
      }
      exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate: " + rtnRate + "Hz", statusList["cmd"]["target"]);
//      io.to("ctrl").emit('statusFromServer', statusList);
    } else if(strings === "PREV"){
      // console.log(statusList["cmd"]["past"]);
      exportComponent.roomEmit(io, 'cmdFromServer', {
        "cmd":"PREV",
        "property": statusList["cmd"]["past"]
      },statusList["cmd"]["target"]);
      for(let key1 in statusList["cmd"]["past"]){
        if(statusList["cmd"]["past"][key1] === false){
          statusList["cmd"]["now"][key1] = false;
        } else if(statusList["cmd"]["past"][key1] === true){
          statusList["cmd"]["now"][key1] = true;
        } else {
          statusList["cmd"]["now"][key1] = String(statusList["cmd"]["past"][key1]);
        }
        for(let key2 in statusList["cmd"]["stream"]){
          if(statusList["cmd"]["past"][key1] && key1 === key2){
            // console.log(key1);
            statusList["streamStatus"]["streamFlag"][statusList["cmd"]["stream"][key2]] = true;
            setTimeout(() =>{
              // console.log("chat start");
              // wavReqFromClient(key1);
              streamReq(key1, String(socket.id));
            },500);
          }
        }
      }
    } else if(strings === "RANDOM" || strings === "BROADCAST"){
      if(statusList["streamStatus"]["emitMode"] === strings){
        statusList["streamStatus"]["emitMode"] = "NORMAL";
      } else {
        statusList["streamStatus"]["emitMode"] = strings;
      }
      console.log("emitMode: " + strings);
>>>>>>> Stashed changes
    } else if(strings === "SWITCH"){
      if(board.isReady){
        let relay = new five.Led(13);
        if(boardSwitch) {
          boardSwitch = false;
<<<<<<< Updated upstream
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
=======
          relay.off();
          console.log("switch off")
          io.emit("cmdFromServer", {"cmd" : "SWITCH OFF"});
          statusList["cmd"]["now"]["SWITCH"] = false;
        } else {
          boardSwitch = true;
          relay.on();
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
/*
    for(let key in statusList["arduino"]["client"]){
        let urlStrings = "http://" + statusList["arduino"]["network"] + statusList["arduino"]["client"][key]["host"];
        if(statusList["arduino"]["client"][key]["flag"]){
          urlStrings = urlStrings + "/off/";
          statusList["arduino"]["client"][key]["flag"] = false;
        } else {
          urlStrings = urlStrings + "/on/";
          statusList["arduino"]["client"][key]["flag"] = true;
        }
        console.log(urlStrings);
        
        request(urlStrings, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            console.log(response);
          } else {
            console.log('error: '+ response);
          }
        })
      }*/
>>>>>>> Stashed changes
    } else if(strings === "STOP"){
      stopFromServer();
    } else if(strings === "START"){
      timelapseFlag = true;
    } else if(strings === "CTRL" || strings === "CONTROL"){
      socket.emit('cmdFromServer', {
        "cmd": "CTRL",
        "property": statusList
      });
      /*
      exportComponent.roomEmit(io, 'cmdFromServer', {
        "cmd":"CTRL",
        "property": statusList
      },statusList["cmd"]["target"]);*/
    }
    statusList["cmd"]["prevCmd"] = strings;
    let dt = new Date();
    statusList["cmd"]["prevTime"] = dt.toFormat("HH24:MI:SS");
//      prevCmd = strings;
    strings = "";
    //console.log(statusList);
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(character === "backspace" || character === "left_arrow" || character === "shift" || character === "ctrl" || character === "tab") {
     //left OR shift OR ctrl OR tab OR esc
//      io.emit("stringsFromServer", "")
    exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
    //socket.broadcast.emit("stringsFromServer", "");
    strings =  "";
  } else if(character === "escape"){
    stopFromServer();
<<<<<<< Updated upstream
  } else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 32 || keyCode === 189 || keyCode === 226){ //alphabet or number
    //add strings;
=======
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode === 18 || keyCode === 34){
    exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "BASS"}, statusList["cmd"]["target"]);
    if(statusList["cmd"]["now"]["BASS"]){
      statusList["cmd"]["now"]["BASS"] = false;
    } else {
      statusList["cmd"]["now"]["BASS"] = true;
    }
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 32 || keyCode === 189 || keyCode === 226 || keyCode === 220){ //alphabet or number
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
const wavReqFromClient = (data) => {
//  let targetId = exportComponent.randomTarget(statusList["connected"],statusList["cmd"]["target"]);
  let json = {
    "target": data,
    "sampleRate": Number(statusList["sampleRate"][data])
  };
  if(data === "PLAYBACK"){
    json["audio"] = audioBuff[data].shift();
    json["video"] = videoBuff[data].shift();
    audioBuff[data].push(json["audio"]);
    videoBuff[data].push(json["video"]);
  } else if(data === "TIMELAPSE"){
    if(audiovisualChunk.length > 0) {
      let tmpBuff = audiovisualChunk.shift();
      audiovisualChunk.push(tmpBuff);
      json["audio"] = tmpBuff["audio"];
      json["video"] = tmpBuff["video"];
    }
  } else if(data === "CHAT"){
    //      json["audio"] = "";
    //      json["video"] = "";
  } else {
      json["audio"] = audioBuff[data][Math.floor(Math.random() * audioBuff[data].length)];
      json["video"] = "";
=======
const joinUnderBar = (strings) => {
  let strArr = strings.split("_");
  // console.log(strArr);
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
    if(json && Id){
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
  } else if(strArr[0] === "UPLOAD") {
    let fname = "";
      for(let i=0;i<strArr.length;i++){
        fname = fname + strArr[i] + "_";
    }
    fname = fname.substr(7);
    fname = fname.substr(0, fname.length-1);
    console.log(fname);
    //mp4にも対応したい
    fileImport(fname,libDir,statusImport);
  } else if(strArr[0] === "LATENCY" && strArr[1] in statusList["cmd"]["streamFlag"]) {
      let latencyVal = 0;
      if(strArr.length > 2){
        if(isNaN(Number(strArr[2])) === false && strArr[2] != "") latencyVal = String(Number(strArr[2]) * 1000);
      } else {
        for(let id in statusList["clients"]){
          console.log(statusList["clients"][id]["STREAMS"]);
          if(latencyVal < Number(statusList["clients"][id]["STREAMS"][strArr[1]]["LATENCY"])) latencyVal = Number(statusList["clients"][id]["STREAMS"][strArr[1]]["LATENCY"]);
        }
        if(latencyVal + 500 > 10000) {
          latencyVal = 0;
        } else {
          latencyVal = latencyVal + 500;
        }
        latencyVal = String(latencyVal);
      }
      for(let key in statusList["clients"]){
        statusList["clients"][key]["STREAMS"][strArr[1]]["LATENCY"] = latencyVal;
      }
  } else if(strArr[1] === "OFF" || strArr[1] === "STOP"){
    console.log("off");
    for(let key in statusList["cmd"]["stream"]){
      if(key === strArr[0]){
        statusList["streamStatus"]["streamFlag"][statusList["cmd"]["stream"][key]] = false;
        statusList["cmd"]["now"][key] = false;
        statusList["streamStatus"]["streamFlag"][key] = false;
        // console.log(statusList["streamStatus"]["streamFlag"]);
      }
    }
  } else if(strArr[1] === "RATE" && statusList["sampleRate"][strArr[0]] != undefined){
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
    //if(strArr[0] === "CHAT"){
      for(let clientID in statusList["clients"]){
        statusList["clients"][clientID]["STREAMS"]["CHAT"]["RATE"] = rtnRate;
      }
    //}
    exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate(" + strArr[0]+"):"+rtnRate + "Hz", statusList["cmd"]["target"]);
>>>>>>> Stashed changes
  }
  exportComponent.randomIdEmit(io,statusList["connected"],statusList["cmd"]["target"],'chatFromServer',json);
  /*  io.to(targetId).emit('chatFromServer', {
      "audio": audio,
      "video": video,
      "target": data,
      "sampleRate": Number(statusList["sampleRate"][data])
    });*/
//    io.to("ctrl").emit('chatFromServer', json);
}

<<<<<<< Updated upstream
const chunkFromClient = (data) => {
  if(data["target"] === "CHAT"){
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
  } else if(data["target"] === "timelapse"){
    audiovisualChunk.push({"audio": data["audio"], "video": data["video"]});
    console.log("chunk length: " + String(audiovisualChunk.length));
=======
const streamReq = (data, sockID) => {
  //console.log("Stream Request in " + data)
  if(statusList["streamStatus"]["streamFlag"][data]){
    setTimeout(()=>{
      let idArr = [];
      switch(data){
        case "CHAT":
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], data, "FROM");
          if(idArr.length > 0){
            io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('streamReqFromServer', "CHAT");
          }
        break;
        default: //PLAYBACK,TIMELAPSE,DRUM,SILENCEも含む
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], data, "TO");
   //       console.log(idArr);
          if(idArr.length > 0){
            let json = {
              "target": data,
              //"sampleRate": Number(statusList["sampleRate"][data]),
              "video": ""
            };
            let targetID = idArr[Math.floor(Math.random() * idArr.length)];
            json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][data]["RATE"]);
            if(statusList["streamStatus"]["emitMode"] === "RANDOM"){
              json["audio"] = audioBuff[data][Math.floor(Math.random() * audioBuff[data].length)];
              if(data in videoBuff && videoBuff[data].length > 0) json["video"] = videoBuff[data][Math.floor(Math.random() * videoBuff[data].length)];
              //io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('chunkFromServer', json);
              io.to(targetID).emit('chunkFromServer', json);
            } else if(statusList["streamStatus"]["emitMode"] === "BROADCAST"){
              let idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], data, "TO")
              for(let i=0;i<idArr.lentgh;i++){
                json["audio"] = audioBuff[statusList["clients"][String(idArr[i])][data]["arr"]];
                if(data in videoBuff && videoBuff[data].length > 0) json["video"] = videoBuff[statusList["clients"][String(idArr[i])][data]["arr"]];
                io.to(idArr[i]).emit('chunkFromServer',json);
                if(statusList["clients"][String(idArr[i])][data]["arr"] < audioBuff[data].length){
                  statusList["clients"][String(idArr[i])][data]["arr"]++;
                } else {
                  statusList["clients"][String(idArr[i])][data]["arr"] = 0;
                }
              }
            } else {
              json["audio"] = audioBuff[data].shift();
              audioBuff[data].push(json["audio"]);
              if(data in videoBuff && videoBuff[data].length > 0){
                json["video"] = videoBuff[data].shift();
                videoBuff[data].push(json["video"]);
              }
              io.to(targetID).emit('chunkFromServer', json);
            }
          } else {
            json["audio"] = "";
            json["video"] = "";
            //json["sampleRate"] = 44100;
            //console.log(json);
            io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('chunkFromServer', json);
          }
        break;
      }
    },Number(statusList["clients"][sockID]["STREAMS"][data]["LATENCY"] * Math.random()));
  }
}

const chunkFromClient = (data, sourceId) => {
  if(data["target"]){
    audioBuff[data["target"]].push(data["audio"]);
    videoBuff[data["target"]].push(data["video"]);
    //console.log(data["target"] + " length: " + String(audioBuff[data["target"]].length));
    //console.log(statusList["clients"][sourceId]);
    let sampleRate = String(statusList["clients"][sourceId]["STREAMS"]["CHAT"]["RATE"]);
    if(data["target"] === "CHAT" && statusList["streamStatus"]["streamFlag"][data["target"]]){
      let idArr = []
      idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], data["target"], "TO")
      if(idArr.length > 0){
        let clientRate = false;
        for(let i=0;i<idArr.length;i++){
          if(statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["RATE"] != Number(statusList["sampleRate"][data["target"]])){
            clienttRate = true;
          }
        }
        let json = {
          "target": data["target"],
          //"sampleRate": Number(statusList["sampleRate"][data["target"]])
          "sampleRate": sampleRate
        };
        if(statusList["streamStatus"]["emitMode"] != "BROADCAST"){
          json["audio"] = audioBuff[data["target"]].shift();
          json["video"] = videoBuff[data["target"]].shift();
          let targetID = idArr[Math.floor(Math.random() * idArr.length)];
          if(clientRate){
            json["sampleRate"] = statusList["clients"][targetID]["STREAMS"]["CHAT"]["RATE"];
          }

          io.to(targetID).emit('chunkFromServer', json);
          statusList["clients"][String(targetID)]["STREAMS"]["CHAT"]["ACK"] = false;
        } else {
          let minItem;
          //console.log(idArr.length);
          for(let i=0;i<idArr.length;i++){
            //console.log('debug');
            let arrVal = 0;
            if(statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"] < audioBuff[data["target"]].length){
              arrVal = statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"];
              statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"]++;
            } else {
              statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"] = 0;
            }
            json["audio"] = audioBuff[data["target"]][arrVal];
            json["video"] = videoBuff[data["target"]][arrVal];
            io.to(idArr[i]).emit('chunkFromServer',json);
            statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["ACK"] = false;
            if(minItem === undefined || minVal > audioBuff[statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"]]){
              minItem = audioBuff[statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"]];
            }
          }
          if(minItem != undefined && minItem > 0){
            for(let i=0; i<idArr.length;i++){
              statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"] = statusList["clients"][String(idArr[i])]["STREAMS"][data["target"]]["arr"] - minItem;
            }
            //audioBuff,videoBuffを先頭からminItem分の要素削除
            audioBuff[data["target"]].splice(0,minItem);
            videoBuff[data["target"]].splice(0,minItem);
          }
        }
      } else {
        statusList["streamStatus"]["waitCHAT"] = true;
      }
    }
>>>>>>> Stashed changes
  }
}

const stopFromServer = () => {
  exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "STOP"}, statusList["cmd"]["target"]);
  for(let key in statusList["cmd"]["now"]){
    statusList["cmd"]["now"][key] = false;
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
  console.log(statusList["clients"]);
}

const targetNoSelect = (i) =>{
  let j = 0;
  let rtnId = false;
  for(let key in io.sockets.adapter.nsp.sockets){
    for(let clientId in statusList["clients"]){
      if(statusList["clients"][clientId]["No"] === i && String(key) === clientId){
        rtnId = key;
      }
    }
  }
  return rtnId;
}
<<<<<<< Updated upstream
=======

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
  let sndConvert = 'ffmpeg -i ' + process.env.HOME + libDir + data["file"] + '.' + data["type"] + ' -vn -acodec copy ' + process.env.HOME + libDir + data["file"] + '.aac';
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
/*
const audioConvert = (data) =>{
//  console.log(statusList);
  audioBuff[data["file"]] = pcm2arr(process.env.HOME + libDir + data["file"] + '.aac');
  videoBuff[data["file"]] = [];
  //できれば文字を大文字変換する機能を具備したい
  let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + data["file"] + '.' + data["type"] + ' -r 5 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
  // 'ffmpeg -itsoffset -1 -i ' + process.env.HOME + libDir + 'BIKI_0.mov' + ' -y -ss ' + 0 + ' -f image2 -an ' + process.env.HOME + libDir +  'BIKI_0_' + String(0) + '.jpg'; //静止画エンコード反映要
  console.log(imgConvert);
  exec(imgConvert,(err,stdout,stderr)=>{
    if(stdout){
      console.log('stdout: ' + stdout);
      fs.readdir(process.env.HOME + libDir, function(err, files){
          if (err) throw err;
          var fileList = [];
          files.filter(function(file){
              return fs.statSync(file).isFile() && /.*\.jpg$/.test(file); //絞り込み
          }).forEach(function (file) {
              fileList.push(file);
          });
          console.log(fileList);
          fileList.map((f) =>{
            imageConvert(process.env.HOME + f, data["file"]);
          })
      });
      setTimeout(()=>{
        console.log(ata["file"] + " maybe import done");
        exec('rm ' + process.env.HOME + libDir + '*.jpg');
        exec('rm ' + process.env.HOME + libDir + '*.aac');
      },10000)
    }
    if(stderr){

      console.log('stderr: ' + stderr);
      console.log(process.env.HOME + libDir);
      fs.readdir(process.env.HOME + libDir, function(err, files){
          if (err) throw err;
          console.log(files);
          files.map((f) =>{
            if( ~f.indexOf(".jpg")){
              console.log(process.env.HOME + libDir + f)
              imageConvert(process.env.HOME + libDir + f, data["file"]);
            }
          })
      });
      setTimeout(()=>{
        console.log(data["file"] + " maybe import done");
        exec('rm ' + process.env.HOME + libDir + '*.jpg');
        exec('rm ' + process.env.HOME + libDir + '*.aac');
      },10000);
    }
    if(err !== null){
      console.log('exec error: '+ err);
    }
  });

}


const imageConvert = (file, buff) =>{
//  let rtn;
  fs.readFile(file, 'base64', (err,data) =>{
    if(err) throw err;
    videoBuff[buff].push('data:image/webp;base64,' + data);
  });
}
*/

const fileImport = (filename, libDir, callback) =>{
  fs.readdir(process.env.HOME + libDir, function(err, files){
    if (err) throw err;
    //console.log(files);
    files.map((f) =>{
      if( ~f.indexOf(filename)){
        audioBuff[filename] = [];
        videoBuff[filename] = [];
        console.log(f);
        //console.log(process.env.HOME + libDir + f)
        let fnameArr = f.split(".");
        switch(fnameArr[1]) {
          case "mov":
          case "MOV":
          case "mp4":
          case "MP4":
            videoImport(fnameArr[0],fnameArr[1],libDir);
            break;
          case "aac":
          case "AAC":
          case "m4a":
          case "wav":
          case "WAV":
          case "aif":
          case "aiff":
          case "AIF":
          case "AIFF":
            audioConvert(fnameArr[0], fnameArr[1], libDir, false);
            break;
        }
        callback(filename);
      }
    })
  });

}

const videoImport = (filename, filetype, libDir) =>{
  //let hsh = exportComponent.movImport(filename, filetype, libDir);
  console.log("import begin");
  let sndConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -vn -acodec copy ' + process.env.HOME + libDir + filename + '.aac';
  console.log(sndConvert);
  //let rtnHsh = {"video": [],"audio":[]};
  exec(sndConvert,(error, stderr, stdout) =>{
    if(stdout){
      console.log('stdout: ' + stdout);
//      audioBuff[filename] = audioConvert(filename, filetype, libDir);
//      videoBuff[filename] = imgConvert(filename, filetype, libDir);
      audioConvert(filename, "aac", libDir, true);
      imgConvert(filename, filetype, libDir);
      //return rtnHsh;
    }
    if(stderr){
      console.log('stderr: ' + stderr);
    }
    if (error !== null) {
      console.log('Exec error: ' + error);
    }
  });
}
const imgConvert = (filename, filetype, libDir) =>{
  let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -r 5 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
  console.log(imgConvert);
  exec(imgConvert,(err,stderr,stdout)=>{
    //let rtnArr = [];
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
//              rtnArr.push('data:image/webp;base64,' + data);
              videoBuff[filename].push('data:image/webp;base64,' + data);
              let rmExec = 'rm ' + process.env.HOME + libDir + f;
              console.log(videoBuff[filename].length);
              console.log(rmExec);
              exec(rmExec,(err,stderr,stdout)=>{
                if(err) console.log(err);
                if(stderr) console.log(stderr);
                if(stdout) console.log(stdout);
              });
            });
            //          imageConvert(process.env.HOME + libDir + f, data["file"]);
            }
          })
//        return rtnArr;
      });
    }
    if(stderr){
      console.log('exec stderror: '+ stderr);
    }
    if(err !== null){
      console.log('exec error: '+ err);
    }
  });
}

const audioConvert = (filename, filetype, libDir, deleteFlag) =>{
  let tmpBuff = new Float32Array(8192);
  let rtnBuff = [];
  let url = process.env.HOME + libDir + filename + '.' + filetype;
  let i = 0;
  let rmExec = 'rm ' + process.env.HOME + libDir + filename + '.' + filetype;
  console.log(url);
  console.log(rmExec);
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
      console.log(rtnBuff.length);
      audioBuff[filename] = rtnBuff;
      console.log('wav loaded from ' + url);
      if(deleteFlag) exec(rmExec);
    }
  );
}

const statusImport = (filename) =>{
  //console.log("test");
  //audioBuff[filename] = hsh["audio"];
  //videoBuff[filename] = hsh["video"];
  statusList["cmd"]["list"][filename] = filename;
  statusList["cmd"]["stream"][filename] = filename;
  statusList["cmd"]["streamFlag"][filename] = false;
  statusList["sampleRate"][filename] = "44100";
  for(let key in statusList["clients"]){
    statusList["clients"][key]["STREAMS"][filename] = {"TO": true, "arr": 0};
  }
  io.emit('streamStatusFromServer', statusList["cmd"]["streamFlag"]);
  console.log(statusList);
  //console.log(testHsh["audio"].length);
}

>>>>>>> Stashed changes

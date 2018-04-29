//expressの呼び出し

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const favicon = require('serve-favicon');
const dateUtils = require('date-utils');

const pcm = require('pcm');
const exec = require('child_process').exec;
const os = require('os');
const request = require('request');

const exportComponent = require('./exportFunction.js');
const keycodeMap = require ('./lib/keyCode.json');
let statusList = require ('./lib/status.json');
let dt = new Date();
const logFilePath = "./log" + dt.toFormat("YYYYMMDDHH24MMSS") + ".json"

//getUserMediaのためのHTTPS化
const https = require('https');
const http = require('http');

//https鍵読み込み
const options = {
  key: fs.readFileSync(process.env.HTTPSKEY_PATH + 'privkey.pem'),
  cert: fs.readFileSync(process.env.HTTPSKEY_PATH + 'cert.pem')
//  key: fs.readFileSync('./httpsKeys/' + 'privkey.pem'),
//  cert: fs.readFileSync('./httpsKeys/' + 'cert.pem')
}

//const MongoClient = require('mongodb').MongoClient;
//const mdUrl = "mongodb://160.16.92.160:27017/nodejs";
//const mdUrl = "mongodb://localhost:27017/nodejs";

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'lib/favicon.ico')));
/*
app.get('/', function(req, res, next) {
  res.render('info', {
    title: 'knd',
    flag: true
  });
});
*/
app.get('/', function(req, res, next) {
  res.render('client', {
    title: 'client'
   });
});

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

//let port = 3000
let port = 8888;
let server = https.createServer(options,app).listen(port);
let io = require('socket.io').listen(server);

let httpPort = 8000;
let httpServer = http.createServer(app).listen(httpPort);

if("en0" in os.networkInterfaces()){
  console.log("server start in " + os.networkInterfaces().en0[0]["address"] + ":" + String(port));
  console.log("server start in " + os.networkInterfaces().en0[1]["address"] + ":" + String(port));
} else {
  //for(let key in os.networkInterfaces()){
    //console.log("server start in " + os.networkInterfaces()[key][0]["address"] + ":" + String(port))
    //console.log("server start in " + os.networkInterfaces()[key][1]["address"] + ":" + String(port))
  //}
  console.log("server start")
}

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
      console.log('wav loaded from ' + url);
    }
  );
  return rtnBuff;
}

const audioBuff = {
  //"DRUM": pcm2arr("./public/files/DRUM.wav"),
  "KICK": pcm2arr("./public/files/KICK.wav"),
  "SNARE": pcm2arr("./public/files/SNARE.wav"),
  "HAT": pcm2arr("./public/files/HAT.wav"),
  "SILENCE": pcm2arr("./public/files/SILENCE.wav"),
  "PLAYBACK": [],
  "TIMELAPSE": [],
  "CHAT": []
};
const videoBuff = {"PLAYBACK": [], "TIMELAPSE": [], "CHAT":[]};

let strings = "";
const homeDir = '/Users/knd/'
const libDir = '/Downloads/';
let timelapseFlag = false;
let doremiHsh = {
  "keyFrequency": 440,
  "DO": 1/(Math.pow(2,(3/4))),
  "RE": 1/(Math.pow(2,(7/12))),
  "MI": 1/(Math.pow(2,(5/12))),
  "FA": 1/(Math.pow(2,(1/3))),
  "SO": 1/(Math.pow(2,(1/6))),
  "LA": 1,
  "TI": Math.pow(2,(1/6))
} //later

const intervalValue = 30000; // 1min
setInterval(function() {
  for(let key in statusList["connected"]){
    if(io["sockets"]["adapter"]["rooms"][key] != undefined){
      statusList["connected"][key] = io["sockets"]["adapter"]["rooms"][key]["sockets"];
    }
  }
  console.log("now connected: ");
  console.log(statusList["clients"]);
  io.to("ctrl").emit("statusFromServer",statusList);
  if(timelapseFlag) {
    exportComponent.shutterReq(io, "oneshot");
  }
}, intervalValue);

let cliNo = 0;
io.sockets.on('connection',(socket)=>{
  socket.on("connectFromClient", (data) => {
    let sockID = String(socket.id);
//    console.log(socket.handshake.headers.host);
    console.log("connect: " + sockID);
    console.log(data);
    socket.join(data);
    socket.join("all");
    if(data != "ctrl"){
      socket.join("default");
    }
    if(statusList["connected"][data] === undefined){
      statusList["connected"][data] = {sockID: true};
    } else {
      statusList["connected"][data][sockID] = true;
    }
    if(data != "ctrl"){
      let pcname = "unknown";
      for(let key in statusList["pc"]){
        if( socket["handshake"]["headers"]["user-agent"].indexOf(statusList["pc"][key]) > -1){
          pcname = key
        }
      }
      console.log(socket["handshake"]["address"]);
      //console.log(socket["handshake"]["headers"]["user-agent"]);
      //console.log(Object.keys(statusList["clients"]));
      if(Object.keys(statusList["clients"])[0] === 'dummy' && Object.keys(statusList["clients"].length === 1 )){
        delete statusList["clients"]["dummy"];
        fs.appendFile(logFilePath, '{\n  "' + dt.toFormat("YYYY/MM/DD HH24:MI:SS") + '": {"' + String(socket.id) + '":"connect"}', (err) => {
          if(err) throw err;
        });
      } else {
        recordCmd(logFilePath, '"' + String(socket.id) + '": "connect"')
      }
      let ipAddress = "localhost";
      if(String(socket.handshake.address) != "::1"){
        ipAddress = String(socket.handshake.address.replace("::ffff:",""))
      }
      statusList["clients"][sockID] = {
        "room":data,
        "No": cliNo,
        "type": pcname,
        "ipAddress": ipAddress,
        //"ipAddress": socket.handshake.headers.host.split(":")[0],
        "STREAMS": {
          "SECBEFORE": {"TO": true, "ACK": true, "arr": 0, "LATENCY": "0", "RATE":"44100"},
          "RECORD": {"FROM": true, "arr": 0}
        },
        "rhythm":{
          "bpm": 60
        }
      };
      switch(cliNo){
        case 0:
          statusList.clients[sockID].rhythm["score"] = [1,1,1,1]
          statusList.clients[sockID].rhythm["timbre"] = 440
          break;
        case 1:
          statusList.clients[sockID].rhythm["score"] = [0,1,0,1]
          statusList.clients[sockID].rhythm["timbre"] = 880
          break;
        case 2:
          statusList.clients[sockID].rhythm["score"] = [1,0,0,0]
          statusList.clients[sockID].rhythm["timbre"] = 110
          break;
        case 3:
          statusList.clients[sockID].rhythm["score"] = [0,0,1,0]
          statusList.clients[sockID].rhythm["timbre"] = 220
          break;
        case 4:
          statusList.clients[sockID].rhythm["score"] = [1,0,0,1,0,0]
          statusList.clients[sockID].rhythm["timbre"] = 660
          break;
        default:
          statusList.clients[sockID].rhythm["score"] = [1,1,1,1]
          statusList.clients[sockID].rhythm["timbre"] = 440
          break;
      }
      statusList.clients[sockID].rhythm["interval"] = (60000 * 4)/(statusList.clients[sockID].rhythm.bpm * statusList.clients[sockID].rhythm.score.length)
      for(let key in statusList.streamStatus.streamFlag){
        switch(key){
          case "CHAT":
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": 0, "RATE":"44100"};
            break;
          case "KICK":
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": statusList.clients[sockID].rhythm.interval / 8, "RATE":"44100"};
            break
          case "SNARE":
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": statusList.clients[sockID].rhythm.interval / 8, "RATE":"44100"};
            break
          case "HAT":
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": statusList.clients[sockID].rhythm.interval / 8, "RATE":"44100"};
            break
          //case "RECORD":
           // statusList["clients"][sockID]["STREAMS"][key] = {"FROM": true, "arr": 0, "LATENCY": "0", "RATE":"44100"};
            //break;
          default:
            statusList["clients"][sockID]["STREAMS"][key] = {"TO": true, "arr": 0, "LATENCY": 0, "RATE":"44100"};
        }
      }
      // server connect test
      request("http://" + statusList.clients[sockID].ipAddress + ":7777", function (error, response, body) {
        if (!error && response.statusCode == 200) {
          statusList.clients[sockID]["server"] = true
          console.log(response.statusCode)
        } else {
          statusList.clients[sockID]["server"] = false
          //console.log(response.statusCode)
        }
      })
      cliNo++;
    }
    console.log(statusList["clients"]);
    io.to("ctrl").emit("statusFromServer", statusList);
    io.emit('streamListFromServer', statusList["streamStatus"]["streamCmd"]);
    socket.emit('connectFromServer', statusList.clients[sockID]);
    //recordCmd(logFilePath, "connect | " + sockID)
    /*debug
    io.emit("cmdFromServer", {
      "cmd": "INSTRUCTION",
      "property": {
        "text": 'input "text"',
        "duration": 60000
      }
    });*/
  });

  socket.on("routingFromCtrl", (data) =>{
    console.log(data);
  });

  socket.on('chunkFromClient', (data)=>{
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
      //console.log("debug");
      //console.log(socket.id);
      streamReq(data, String(socket.id));
    }
  });


  socket.on('charFromClient', (keyCode) =>{
    charFromClient(keyCode,socket);
  });

  socket.on('wavReqFromClient',(data)=>{
    // wavReqFromClient(data);
    streamReq(data, String(socket.id));
  })

  socket.on("uploadReqFromClient", (data) =>{
    let dataArr = data.split(".");
    //let hsh = exportComponent.movImport(dataArr[0],dataArr[1],libDir);
    //fileImport(dataArr[0],dataArr[1],libDir,statusImport);
    videoImport(dataArr[0],dataArr[1],libDir,statusImport);
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

  socket.on('cmdFromCtrl', (data) =>{
    console.log("ctrlCmd: " + data["cmd"]);
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
        //console.log(statusList["gain"]);
        io.to("all").emit("cmdFromServer", {
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
      case "GLITCH":
        console.log("test")
        statusList.streamStatus.glitch[data.property.stream] = data.property.val
        console.log(statusList.streamStatus.glitch)
        break;
      case "FADE":
        console.log(data.property)
        statusList.cmd.FADE[data.property.target] = String(data.property.val)
        exportComponent.roomEmit(io, 'cmdFromServer',{
          "cmd": "FADE",
          "property": {
            "type" : data.property.target,
            "status": statusList.cmd.FADE
          }
        }, statusList["cmd"]["target"]);
        console.log(statusList.cmd.FADE)
        break
      case "PORTAMENT":
        statusList.cmd.PORTAMENT = Number(data.property.val)
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "PORTAMENT",
          "property": statusList.cmd.PORTAMENT
        }, statusList["cmd"]["target"]);
        console.log(statusList.cmd.PORTAMENT)
        break
    }
    //io.to("ctrl").emit("statusFromServer", statusList);
  })
  socket.on("disconnect", () =>{
//    disconnect();
    console.log(socket.id);
    recordCmd(logFilePath,'"' + String(socket.id) + '":"disconnect"')
    let sockID = String(socket.id);
    console.log("disconnect: " + sockID);
    for(let key in statusList["connected"]){
      if(statusList["connected"][key][sockID]){
        delete statusList["connected"][key][sockID];
        socket.leave(key);
      }
    }
    if('clients' in statusList && sockID in statusList["clients"]){
      for(let key in statusList["clients"][sockID]){
        if(statusList["clients"][sockID][key]){
          socket.leave(key);
        }
      }
      delete statusList["clients"][sockID];
    }
    cliNo = 0;
    if(Object.keys(statusList.clients).length > 0){
      for(let key in statusList["clients"]){
        statusList["clients"][key]["No"] = cliNo;
        cliNo++;
      }
    } else {
      fs.appendFile(logFilePath, '\n}\n', (err) => {
        if(err) throw err;
      });
    }
    io.emit("statusFromServer",statusList);
  });

});

//let droneRoute = {};
const droneRoute = () =>{
//console.log("mode DRONE");
  let idArr = Object.keys(statusList.clients);
  let rtnRoute = {};
  for(let i=0;i<idArr.length;i++){
    if(i+1<idArr.length){
      rtnRoute[idArr[i]] = idArr[i+1];
    } else {
      rtnRoute[idArr[i]] = idArr[0];
    }
  }
  if(idArr.length === 1) rtnRoute[idArr[0]] = idArr[0];
//  console.log(droneRoute);
//  io.emit('cmdFromServer',{"cmd": "DRONECHAT"});
//  setTimeout(()=>{
//    streamReq("droneChat");
//  },500);
  return rtnRoute
}

const cmdFromServer = (cmdStrings, alertFlag) =>{
//const enterFromClient = (keyCode, socket) =>{
 //console.log(socket)
    //recordCmd(logFilePath, '"connect" : "' + sockID + '"')
    //recordCmd(logFilePath, "connect | " + sockID + ", " + statusList.clients[sockID].ipAddress)
  switch(cmdStrings){
    case "START":
      timelapseFlag = true;
      //exportComponent.roomEmit(io,'textFromServer', cmdStrings, statusList["cmd"]["target"]);
      io.emit('textFromServer',{
        text: cmdStrings,
        alert: false
      })
      break;
    case "STOP":
      stopFromServer();
      //exportComponent.roomEmit(io,'textFromServer', cmdStrings, statusList["cmd"]["target"]);
      io.emit('textFromServer',{
        text: cmdStrings,
        alert: false
      })
      break;
    case "NO":
    case "NUMBER":
      for(let key in statusList.clients){
        for(let id in io.sockets.adapter.rooms){
          if(key === String(id)){
            io.to(id).emit('cmdFromServer',{
              "cmd": "NUMBER",
              "property": String(statusList.clients[key].No)
            })
          }
        }
      }
      break;
    case "RATE":
    case "SAMPLERATE":
      let rtnRate;
      let aveRate =0;
      let keys = 0;
      for (let key in statusList["sampleRate"]){
        aveRate = aveRate + Number(statusList["sampleRate"][key]);
        keys = keys + 1;
      }
      aveRate = aveRate / keys;
      if(aveRate >= 22050 && aveRate < 33075){
        rtnRate = "33075";
      } else if(aveRate >= 33075 && aveRate < 44100){
        rtnRate = "44100";
      } else if(aveRate >= 44100 && aveRate < 55125){
        rtnRate = "55125";
      } else if(aveRate >= 55125 && aveRate < 66150){
        rtnRate = "66150";
      } else if(aveRate >= 66150 && aveRate < 77175){
        rtnRate = "77175";
      } else if(aveRate >= 77175 && aveRate < 88200){
        rtnRate = "88200";
      } else if(aveRate >= 88200){
        rtnRate = "11025";
      } else {
        rtnRate = "22050";
      }
      for (let key in statusList["sampleRate"]){
        console.log(key)
        statusList["sampleRate"][key] = rtnRate;
        for(let clientID in statusList["clients"]){
          console.log(statusList.clients[clientID].STREAMS[key])
          statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
        }
      }
      //exportComponent.roomEmit(io, 'textFromServer', "SAMPLE RATE: " + rtnRate + "Hz", statusList["cmd"]["target"]);
      io.emit('textFromServer',{
        text: "SAMPLE RATE: " + rtnRate + "Hz",
        alert: false
      })
      break;
    case "DO":
    case "RE":
    case "MI":
    case "FA":
    case "SO":
    case "LA":
    case "TI":
      let note = doremiHsh.keyFrequency * doremiHsh[cmdStrings]
      let json = sineWave(note)
      io.emit("cmdFromServer",json)
      break;
    case "GRID":
      console.log(statusList.streamStatus.grid)
      if(!statusList.streamStatus.grid){
        io.emit("textFromServer", {
          "text": "GRID",
          "alert": false
        })
        for(let id in statusList.clients){
          for(let strms in statusList.clients[id].STREAMS){
            if(strms != "KICK" && strms != "SNARE" && strms != "HAT") statusList.clients[id].STREAMS[strms].LATENCY = statusList.clients[id].rhythm.interval / 32
            console.log(statusList.clients[id].STREAMS[strms])
          }
        }
      } else {
        io.emit("textFromServer", {
          "text": "NOT GRID",
          "alert": false
        })
        for(let id in statusList.clients){
          for(let strms in statusList.clients[id].STREAMS){
            if(strms != "KICK" && strms != "SNARE" && strms != "HAT") statusList.clients[id].STREAMS[strms].LATENCY = 0
            console.log(statusList.clients[id].STREAMS[strms])
          }
        }
      }
      statusList.streamStatus.grid = !statusList.streamStatus.grid
      break
    case "PREV":
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
        for(let key2 in statusList["streamStatus"]["streamCmd"]){
          if(statusList["cmd"]["past"][key1] && key1 === key2){
            // console.log(key1);
            statusList["streamStatus"]["streamFlag"][statusList["streamStatus"]["streamCmd"][key2]] = true;
            setTimeout(() =>{
              console.log(key1);
              // wavReqFromClient(key1);
              let idArr = Object.keys(statusList.clients)
              streamReq(key1, idArr[Math.floor(Math.random() * idArr.length)])
              //streamReq(key1, String(socket.id));
            },500);
          }
        }
      }
      //exportComponent.roomEmit(io,'textFromServer', "PREVIOUS, statusList["cmd"]["target"]);
      break;
    case "RANDOM":
    case "BROADCAST":
      if(statusList["streamStatus"]["emitMode"] === cmdStrings){
        statusList["streamStatus"]["emitMode"] = "NORMAL";
        //exportComponent.roomEmit(io,'textFromServer', "NOT RANDOM", statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: "NOT RANDOM",
          alert: false
        })
      } else {
        statusList["streamStatus"]["emitMode"] = cmdStrings;
        //exportComponent.roomEmit(io,'textFromServer', cmdStrings, statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: cmdStrings,
          alert: false
        })
      }
      console.log("emitMode: " + cmdStrings);
      break;
    case "SWITCH":
      statusList["cmd"]["now"]["SWITCH"] = !statusList.cmd.now.SWITCH
      for(let id in statusList.clients){
        if(statusList.clients[id].server) postHTTP("SWITCH", statusList.cmd.now.SWITCH, statusList.clients[id].ipAddress)
      }
      break;
    case "GLITCH":
      let count = 0;
      let flag = true;
      for(let str in statusList.streamStatus.glitch){
        if(statusList.streamStatus.glitch[str]) count++;
      }
      if(count > Object.keys(statusList.streamStatus.glitch).length/2){
        flag = false;
      }
      for(let str in statusList.streamStatus.glitch){
        statusList.streamStatus.glitch[str] = flag;
      }
      if(flag){
        //exportComponent.roomEmit(io,'textFromServer', cmdStrings, statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: cmdStrings,
          alert: false
        })
      } else {
        //exportComponent.roomEmit(io,'textFromServer',"NOT GLITCH", statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: "NOT GLITCH",
          alert: false
        })
      }
      break;
    case "DRONE":
      if(statusList["streamStatus"]["drone"]) {
        statusList["streamStatus"]["drone"] = false;
      } else {
        statusList["streamStatus"]["drone"] = true;
        statusList.streamStatus.droneRoute = droneRoute();
      }
      io.emit('cmdFromServer',{
        "cmd": "DRONE",
        "property": statusList.streamStatus.drone
      });
      break;
    case "BROWSER":
      io.emit('cmdFromServer',{"cmd": "BROWSER"});
      break;
    default:
      let cmd = cmdSelect(cmdStrings);
      if(cmd) {
        console.log("cmd: " + cmd["cmd"]);
        if(cmd["cmd"] === "RECORD"){
          let idArr = [];
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], cmd["cmd"], "FROM");
          // console.log(idArr);
          for(let i=0;i<idArr.length;i++){
            io.to(idArr[i]).emit('cmdFromServer', cmd);
          }
        } else if(cmd.cmd === "DRUM") {
          console.log("streamstart: drum")
          statusList.streamStatus.streamFlag.KICK = true
          statusList.streamStatus.streamFlag.SNARE = true
          statusList.streamStatus.streamFlag.HAT = true
          exportComponent.roomEmit(io, 'cmdFromServer', {"cmd":"KICK"}, statusList["cmd"]["target"]);
          exportComponent.roomEmit(io, 'cmdFromServer', {"cmd":"SNARE"}, statusList["cmd"]["target"]);
          exportComponent.roomEmit(io, 'cmdFromServer', {"cmd":"HAT"}, statusList["cmd"]["target"]);
          setTimeout(() =>{
            let idArr = Object.keys(statusList.clients)
            streamReq("KICK", idArr[Math.floor(Math.random() * idArr.length)])
            streamReq("HAT", idArr[Math.floor(Math.random() * idArr.length)])
            setTimeout(() => {
              streamReq("SNARE", idArr[Math.floor(Math.random() * idArr.length)])
            }, (60000 * 4) / (statusList.clients[idArr[Math.floor(Math.random() * idArr.length)]].rhythm.bpm))
          },500);
        } else {
          console.log(io.sockets.adapter.rooms);
          exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"]);
        }
        for(let key in statusList["streamStatus"]["streamCmd"]){
          if(cmd["cmd"] === key){
            console.log(key + " stream start");
            statusList["streamStatus"]["streamFlag"][statusList["streamStatus"]["streamCmd"][key]] = true;
            setTimeout(() =>{
              let idArr = Object.keys(statusList.clients)
              streamReq(statusList["streamStatus"]["streamCmd"][key], idArr[Math.floor(Math.random() * idArr.length)])
              // wavReqFromClient(cmd["cmd"]);
            },500);
          }
        }
      } else if (isNaN(Number(cmdStrings)) === false && cmdStrings != "") {
        let json = sineWave(cmdStrings);
        exportComponent.roomEmit(io, 'cmdFromServer', json, statusList["cmd"]["target"]);
      } else if( ~cmdStrings.indexOf("SEC") ) {
        let secs = cmdStrings.slice(0,cmdStrings.indexOf("SEC"));
        if(isNaN(Number(secs)) === false && secs != ""){
          let rate = 44100;
          if( ~cmdStrings.indexOf("_") ){
            if(isNaN(Number(cmdStrings.split("_")[1])) === false && cmdStrings.split("_")[1] != ""){
              rate = Number(cmdStrings.split("_")[1]);
            }
          }
          exportComponent.roomEmit(io, 'cmdFromServer', {
            "cmd":"SECBEFORE",
            "property": Number(secs),
            "rate": rate
          },statusList["cmd"]["target"]);
          statusList["cmd"]["now"]["SECBEFORE"] = secs;
        }
      /*} else if( ~cmdStrings.indexOf("_") ) {
        joinUnderBar(cmdStrings);*/
      } else {
        //exportComponent.roomEmit(io,'textFromServer', cmdStrings, statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: cmdStrings,
          alert: alertFlag
        })
      }
      break;
  }
  statusList["cmd"]["prevCmd"] = cmdStrings;
  let dt = new Date();
  statusList["cmd"]["prevTime"] = dt.toFormat("HH24:MI:SS");
  cmdStrings = "";
  io.emit("statusFromServer", statusList);
}

const charFromClient = (keyCode, socket) =>{
  let character = keycodeMap[String(keyCode)];
  //      strings = exportComponent.char2Cmd(io, strings, character, cmdList, keyCode);
  if(character === "enter") {
    recordCmd(logFilePath,'"' + String(socket.id) + '": "' + strings + '"')
    console.log(strings);
    if(~strings.indexOf(" ") ) {
      joinSpace(strings, false);
      //joinUnderBar(strings);
      strings = "";
    /*} else if(strings === "CTRL" || strings === "CONTROL"){
      socket.emit('cmdFromServer', {
        "cmd": "CTRL",
        "property": statusList
      });
      strings = "";
      io.emit('textFromServer', "");
      console.log("control view");
     */
    } else if(strings === "LOOP"){
      io.emit('cmdFromServer', {"cmd": "LOOP"})
      //socket.emit('cmdFromServer', {"cmd": "LOOP"})
      strings = ""
    } else if(strings === "CLICK"){
      io.emit('textFromServer',"")
      let idArr = [];
      for(let idString in statusList.clients){
        for(let id in io.sockets.adapter.rooms) {
          if(String(id) === idString){
            idArr.push(id);
          }
        }
      }
      io.to(idArr[Math.floor(idArr.length * Math.random())]).emit('cmdFromServer',{"cmd":"CLICK"})
      strings = ""
    } else if(strings === "BASS") {
      socket.emit('cmdFromServer',{"cmd":"BASS"})
      strings = "";
    } else {
      //enterFromClient(keyCode);
      cmdFromServer(strings, false)
      strings = ""
    }
    //enterFromClient(keyCode, socket);
  } else if(character === "backspace" || character === "left_arrow" || character === "tab") {
    exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
    strings =  "";
  } else if(character === "escape"){
    stopFromServer();
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode === 226 || keyCode === 220 || keyCode === 189){
    exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "BASS","property": "LOW"}, statusList["cmd"]["target"]);
    if(statusList["cmd"]["now"]["BASS"]){
      statusList["cmd"]["now"]["BASS"] = false;
    } else {
      statusList["cmd"]["now"]["BASS"] = true;
    }
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode === 187){
    exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "BASS","property": "HIGH"}, statusList["cmd"]["target"]);
    if(statusList["cmd"]["now"]["BASS"]){
      statusList["cmd"]["now"]["BASS"] = false;
    } else {
      statusList["cmd"]["now"]["BASS"] = true;
    }
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode === 17){
    socket.emit('cmdFromServer', {
      "cmd": "CTRL",
      "property": statusList
    });
    strings = "";
    console.log("control view");
  } else if(character === "up_arrow"){
    strings = statusList["cmd"]["prevCmd"];
    exportComponent.roomEmit(io, 'stringsFromServer', strings, statusList["cmd"]["target"]);
  //} else if(keyCode === 32){
    //console.log("debg");
    //spaceForMetronome();
  } else if(character != undefined) {
  //} else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 32 || keyCode === 189 || keyCode === 226 || keyCode === 220){ //alphabet or number
    strings =  strings + character;
    exportComponent.roomEmit(io, 'stringsFromServer', strings, statusList["cmd"]["target"]);
    if(keyCode === 32) {
      metronomeBPMCount(socket.id);
    } else {
      metronomeArr = []
    }
  }
}

let metronomeArr = [];
const metronomeBPMCount = (sourceId) =>{
switch(metronomeArr.length){
  case 3:
    let interval = (new Date().getTime() - metronomeArr[0])/3
    let bpm = 60000 / interval
    statusList.clients[String(sourceId)].rhythm.bpm = bpm
    statusList.clients[String(sourceId)].rhythm.interval = (60000 * 4) / (statusList.clients[String(sourceId)].rhythm.score.length * bpm)
    //console.log(interval);
    //console.log(bpm);
    console.log(statusList.clients[String(sourceId)].rhythm);
    io.to(sourceId).emit('cmdFromServer',{
      "cmd": "METRONOME",
      "type": "param",
      "trig": true,
      "property": statusList.clients[String(sourceId)].rhythm
    });
    /*
    setTimeout(()=>{
      io.to(sourceId).emit('cmdFromServer',{
        "cmd": "METRONOME",
        "type": "trig"
      });
    }, statusList.clients[String(sourceId)].rhythm.interval)
    */
    metronomeArr = [];
    break;
  default:
    metronomeArr.push(new Date().getTime());
    let tapLength = Number(metronomeArr.length)
    console.log(metronomeArr);
    setTimeout(()=>{
      if(metronomeArr.length === tapLength) metronomeArr = [];
    },10000);
    break;
}
}

const postHTTP = (type, value, ipAddress) => {
  let postData = {
    "type": type,
    "value": value
  }
  let postOption = {
    uri: "http://" + ipAddress + ":7777",
    headers: {
      "Content-Type": "application/json"
    },
    json: postData
  };
  console.log(postOption)
  request.post(postOption, (error, response, body) => {
    response.on('data', (chunk) =>{
      console.log(chunk)
    })
  })
}

//const joinUnderBar = (strings) => {
const joinSpace = (strings, alertFlag) => {
  console.log(strings)
  let strArr = strings.split(" ");
  // console.log(strArr);
  switch(strArr[0]) {
    case "VOL":
    case "VOLUME":
      console.log("VOLUME " + strArr[1]);
      exportComponent.roomEmit(io, 'cmdFromServer', {
        "cmd": "VOLUME",
        "property": strArr[1]
      }, statusList["cmd"]["target"]);
      break;
    case "GAIN":
      for(let id in statusList.clients){
        if(statusList.clients[id].server) postHTTP(strArr[0], strArr[1], statusList.clients[id].ipAddress)
      }
      break;
    case "UP":
    case "DOWN":
      if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "SINEWAVE_" + strArr[0],
          "property": Number(strArr[1])
        }, statusList["cmd"]["target"]);
      }
      break;
    case "FADE":
      if(strArr[1] === "IN" || strArr[1] === "OUT"){
        if(Number(statusList.cmd.FADE[strArr[1]]) === 0){
          statusList.cmd.FADE[strArr[1]] = "1"
        } else {
          statusList.cmd.FADE[strArr[1]] = "0"
        }
        exportComponent.roomEmit(io, 'cmdFromServer',{
          "cmd": "FADE",
          "property": {
            "type" : strArr[1],
            "status": statusList.cmd.FADE
          }
        }, statusList.cmd.target)
      }
      break;
    case "PORTAMENT":
    case "PORT":
      if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
        statusList.cmd.PORTAMENT = Number(strArr[1])
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "PORTAMENT",
          "property": Number(strArr[1])
        }, statusList["cmd"]["target"]);
      }
      break;
    case "BPM":
      if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
        for(let id in statusList.clients){
          statusList.clients[id].rhythm.bpm = Number(strArr[1])
          statusList.clients[id].rhythm.interval = 60000 / Number(strArr[1])
          statusList.clients[id].STREAMS.KICK.LATENCY =   statusList.clients[id].rhythm.interval /4
          statusList.clients[id].STREAMS.SNARE.LATENCY =  statusList.clients[id].rhythm.interval /4
          statusList.clients[id].STREAMS.HAT.LATENCY =  statusList.clients[id].rhythm.interval / 8
        }
      }
    break
    case "UPLOAD":
      let fname = "";
      for(let i=0;i<strArr.length;i++){
        fname = fname + strArr[i] + "_";
      }
      fname = fname.substr(7);
      fname = fname.substr(0, fname.length-1);
      //console.log(fname);

      if(fname === "TIMETABLE"){
        console.log("TIMETABLE renew");
        timeTable = timeTableRead();
      } else {
        fileImport(fname,libDir,statusImport);
      }
      //mp4にも対応したい
      //exportComponent.roomEmit(io,'textFromServer', strArr[0], statusList["cmd"]["target"]);
      io.emit('textFromServer',{
        text: strArr[0],
        alert: false
      })
      break;
    case "LATENCY":
      if(strArr[0] === "LATENCY" && strArr[1] in statusList["cmd"]["streamFlag"]) {
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
      }
      //exportComponent.roomEmit(io,'textFromServer', strArr[0], statusList["cmd"]["target"]);
      io.emit('textFromServer',{
        text: strArr[0],
        alert: false
      })
      break;
    case "RATE":
    case "SAMPLERATE":
      let targetStream = statusList.streamStatus.streamCmd[strArr[1]]
      if(targetStream != undefined){
        let rtnRate = "";
        let targetStream = statusList["streamStatus"]["streamCmd"];
        switch(statusList["sampleRate"][strArr[1]]){
          case "22050":
            rtnRate = "33075";
            break
          case "33075":
            rtnRate = "44100"
            break
          case "44100":
            rtnRate = "55125"
            break
          case "55125":
            rtnRate = "66150"
            break
          case "66150":
            rtnRate = "77175"
            break
          case "77175":
            rtnRate = "88200";
            break;
          case "88200":
            rtnRate = "11025";
            break;
          default:
            rtnRate = "22050";
            break;
        }
        statusList["sampleRate"][strArr[1]] = rtnRate;
        for(let clientID in statusList["clients"]){
          for(let str in statusList["clients"][clientID].STREAMS){
            if(String(str) === String(statusList.streamStatus.streamCmd[strArr[1]])){
              statusList["clients"][clientID].STREAMS[str].RATE = rtnRate;
            }
          }
        }
        io.emit('statusFromServer', statusList)
        //exportComponent.roomEmit(io, 'textFromServer', "SAMPLE RATE(" + String(statusList.streamStatus.streamCmd[strArr[1]])+"):"+rtnRate + "Hz", statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: "SAMPLE RATE(" + String(statusList.streamStatus.streamCmd[strArr[1]])+"):"+rtnRate + "Hz",
          alert: false
        })
      } else if(strArr[1] === "DRUM") {
        let rtnRate = "";
        let targetStream = statusList["streamStatus"]["streamCmd"];
        switch(statusList["sampleRate"]["KICK"]){
          case "22050":
            rtnRate = "33075";
            break
          case "33075":
            rtnRate = "44100"
            break
          case "44100":
            rtnRate = "55125"
            break
          case "55125":
            rtnRate = "66150"
            break
          case "66150":
            rtnRate = "77175"
            break
          case "77175":
            rtnRate = "88200";
            break;
          case "88200":
            rtnRate = "11025";
            break;
          default:
            rtnRate = "22050";
            break;
        }
        statusList.sampleRate.KICK = rtnRate;
        statusList.sampleRate.SNARE = rtnRate;
        statusList.sampleRate.HAT = rtnRate;
        for(let clientID in statusList["clients"]){
          for(let str in statusList["clients"][clientID].STREAMS){
            statusList["clients"][clientID].STREAMS.KICK.RATE = rtnRate;
            statusList["clients"][clientID].STREAMS.SNARE.RATE = rtnRate;
            statusList["clients"][clientID].STREAMS.HAT.RATE = rtnRate;
          }
        }
        io.emit('statusFromServer', statusList)
        //exportComponent.roomEmit(io, 'textFromServer', "SAMPLE RATE(" + String(statusList.streamStatus.streamCmd[strArr[1]])+"):"+rtnRate + "Hz", statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: "SAMPLE RATE(" + String(statusList.streamStatus.streamCmd[strArr[1]])+"):"+rtnRate + "Hz",
          alert: false
        })
      } else if(isNaN(Number(strArr[1])) === false && strArr[1] != "") {
        let rtnRate = strArr[1]
        for (let key in statusList["sampleRate"]){
          statusList["sampleRate"][key] = rtnRate;
          for(let clientID in statusList["clients"]){
              statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
          }
        }
        exportComponent.roomEmit(io, 'textFromServer', "SAMPLE RATE: " + rtnRate + "Hz", statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          text: "SAMPLE RATE: " + rtnRate + "Hz",
          alert: false
        })
      }
      break;
    case "ALL":
      let targetStrm = statusList.streamStatus.streamCmd[strArr[1]]
      if(targetStrm != undefined){
        for(let id in statusList.clients){
          switch(targetStrm){
            case "CHAT":
              statusList.clients[id].STREAMS[targetStrm].FROM = true
            default:
              statusList.clients[id].STREAMS[targetStrm].TO = true
              break
          }
        }
      }
      break
    case "GLITCH":
      if(statusList.streamStatus.streamCmd[strArr[1]] != undefined){
        statusList.streamStatus.glitch[statusList.streamStatus.streamCmd[strArr[1]]] = !statusList.streamStatus.glitch[statusList.streamStatus.streamCmd[strArr[1]]]
        let str = statusList.streamStatus.streamCmd[strArr[1]] + ": "
        if(!statusList.streamStatus.glitch[statusList.streamStatus.streamCmd[strArr[1]]]) str = str + "NOT "
        str = str + "GLITCH"
        io.emit("textFromServer", {
          text: str,
               alert: false
        });
      }
      break;
    case "GRID":
      if(statusList.streamStatus.streamCmd[strArr[1]] != undefined){
        let strm = statusList.streamStatus.streamCmd[strArr[1]]
        let str = strm + ": "
        for(let id in statusList.clients){
          console.log(strm)
          console.log(statusList.clients[id].STREAMS[strm].LATENCY)
          if(statusList.clients[id].STREAMS[strm].LATENCY > 0){
          console.log(strm)
            statusList.clients[id].STREAMS[strm].LATENCY = 0
            str = str + "NOT "
          } else {
            statusList.clients[id].STREAMS[strm].LATENCY = statusList.clients[id].rhythm.interval / 32
          }
          console.log(statusList.clients[id].STREAMS[strm])
        }
        str = str + "GRID"
        console.log(str)
        io.emit("textFromServer", {
          "text": str,
          "alert": false
        });
      }
      break
    case "STOP":
    case "OFF":
      for(let key in statusList["streamStatus"]["streamCmd"]){
        if(strArr[1] === key){
          console.log("stream stop");
          statusList.streamStatus.streamFlag[statusList.streamStatus.streamCmd[key]] = false
        }
      }
      if(strArr[1] === "DRUM"){
        statusList.streamStatus.streamFlag.KICK = false
        statusList.streamStatus.streamFlag.SNARE = false
        statusList.streamStatus.streamFlag.HAT = false
      }
     if(strArr[1] === "CLICK" || strArr[1] === "METRONOME") {
        //console.log("stop");
        io.emit('cmdFromServer',{
          "cmd": "METRONOME",
          "property": "STOP"
        });
      }
      break;
  }
  Object.keys(io.sockets.adapter.rooms).forEach((value,index,arr)=>{
    let targetRoom = strArr[0].toLowerCase();
    console.log(value);
    if(targetRoom === value/* && strArr.length > 0 && strArr[1] != ""*/){
      let json = false;
      let cmd = cmdSelect(strArr[1]);
      if(cmd){
        json = cmd;
      } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
        json = sineWave(strArr[1]);
      }
      if(json){
        let flag = true;
        for(let key in statusList["streamStatus"]["streamCmd"]){
          if(cmd === key){
            flag = false;
          }
        }
        if(flag){
          io.to(targetRoom).emit("cmdFromServer", json);
          io.emit("statusViewFromServer");
        }
      }
    }
  })
  if(isNaN(Number(strArr[0])) === false && strArr[0] != ""){
    if(strArr.length === 2) {
      let json = false;
      let cmd = cmdSelect(strArr[1]);
      let Id = targetNoSelect(Number(strArr[0]));
      if(cmd){
        if(cmd.cmd === "RECORD"){
          if(statusList.clients[Id].STREAMS.RECORD.FROM) json = cmd
        } else {
          json = cmd;
        }
      } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
        json = sineWave(strArr[1]);
      }
      for(let key in statusList.cmd.stream){
        if(key === strArr[1]) {
          console.log(strArr[1])
          console.log(Id)
          json.cmd = statusList.cmd.stream[strArr[1]]
          for (let sockID in statusList.clients){
            if(String(Id) === sockID){
              switch(json.cmd){
                case "DRUM":
                  statusList.clients[sockID].STREAMS.KICK.TO = true
                  statusList.clients[sockID].STREAMS.SNARE.TO = true
                  statusList.clients[sockID].STREAMS.HAT.TO = true
                  break
                case "CHAT":
                  statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].FROM = true
                  statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].TO = true
                  break
                default:
                  statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].TO = true
                  break
              }
            } else {
              switch(json.cmd){
                case "DRUM":
                  statusList.clients[sockID].STREAMS.KICK.TO = false
                  statusList.clients[sockID].STREAMS.SNARE.TO = false
                  statusList.clients[sockID].STREAMS.HAT.TO = false
                  break
                case "CHAT":
                  statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].FROM = false
                  statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].TO = false
                  break
                default:
                  statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].TO = false
              }
            }
          }
          setTimeout(()=>{
            console.log("debug")
            switch(json.cmd){
              case "CHAT":
                statusList["streamStatus"]["streamFlag"][json.cmd] = true
                io.to(Id).emit('streamReqFromServer', "CHAT");
                break
              case "DRUM":
                statusList.streamStatus.streamFlag.KICK = true
                statusList.streamStatus.streamFlag.SNARE = true
                statusList.streamStatus.streamFlag.HAT = true
                streamReq("KICK", String(Id))
                streamReq("HAT", String(Id))
                setTimeout(()=>{
                  streamReq("SNARE", String(Id))
                },statusList.clients[String(Id)].rhythm.interval * 2)
                break
              default:
                statusList["streamStatus"]["streamFlag"][json.cmd] = true
                streamReq(json.cmd, String(Id))
            }
          }, 800)
        }
      }
      if(json && Id){
        let flag = true;
        for(let key in statusList["streamStatus"]["streamCmd"]){
          if(cmd === key){
            flag = false;
          }
        }
        if(flag){
          //console.log(Id);
          /*
          console.log(statusList.clients);
          for(let key in statusList.clients){
            for(let id in io.sockets.adapter.rooms){
              if(statusList.clients[key].No = Number(strArr[0]) && key === String(id)){
                console.log(id);
                io.to(id).emit("cmdFromServer", json);
              }
            }
          }*/
          io.emit("statusViewFromServer");
          io.to(Id).emit("cmdFromServer", json);
        }
      }
    } else if(isNaN(Number(strArr[1])) === false && strArr[1] != "" && strArr[2] === "CHAT") {
      let fromId = targetNoSelect(Number(strArr[0]));
      let toId = targetNoSelect(Number(strArr[1]));
      if(fromId && toId){
        for (let sockID in statusList.clients){
          if(String(fromId) === sockID){
            statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[2]]].FROM = true
            statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[2]]].TO = false
            console.log("debug")
          } else if(String(toId) === sockID) {
            statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[2]]].TO = true
            statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[2]]].FROM = false
            console.log("debug")
          } else {
            statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[2]]].FROM = false
            statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[2]]].TO = false
          }
        }
        statusList["streamStatus"]["streamFlag"]["CHAT"] = true
        io.emit("cmdFromServer", {cmd:"CHAT"});
        //io.to(toId).emit("cmdFromServer", {cmd:"CHAT"});
        setTimeout(()=>{
          io.to(fromId).emit('streamReqFromServer', "CHAT");
          console.log("debug")
        },800)
      }
    }
  } else {
    if(~strArr[0].indexOf(":")) {
      let timeArr = strArr[0].split(":")

      let formatFlag = true
      for(let i=0;i<timeArr.length;i++){
        if (isNaN(Number(timeArr[i]))) formatFlag = false
      }
      let dt = new Date();
      let y = dt.getFullYear();
      let m = ("00" + (dt.getMonth()+1)).slice(-2);
      let d = ("00" + dt.getDate()).slice(-2);
      let today = y + "-" + m + "-" + d;
      let timerVal = 0
      if(formatFlag && timeArr.length === 3){
       timerVal = Date.parse(today +"T" + strArr[0] + "+09:00") - Date.now()
      } else if(formatFlag && timeArr.length === 2){
       timerVal = Date.parse(today +"T" + strArr[0] + ":00+09:00") - Date.now()
      }
      console.log(today+ "T" + strArr)
      console.log(formatFlag)
      console.log(timerVal)
      if(timerVal>0){
        setTimeout(()=>{
          if(strArr.length > 2){
            let joinArr = strArr.slice(1)
            joinSpace(joinArr.join(" "),true)
          } else {
            cmdFromServer(strArr[1], true)
          }
        },timerVal)
      }
    } else {
      io.emit('textFromServer',{
        text: strArr.join(" "),
        alert: alertFlag
      })
    }
  }
}

let timeLapseLength = 0;

const streamReq = (target, sockID) => {
  //console.log("Stream Request in " + target)
  if(statusList["streamStatus"]["streamFlag"][target]){
    if(statusList["clients"][sockID] != undefined && statusList["clients"][sockID]["STREAMS"] != undefined && Number(statusList["clients"][sockID]["STREAMS"][target]["LATENCY"]) > 0) {
      setTimeout(()=>{
        let idArr = [];
        if(statusList["streamStatus"]["streamFlag"][target]){
          switch(target){
            case "CHAT":
              idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "FROM");
              if(idArr.length > 0){
                io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('streamReqFromServer', "CHAT");
              }
              break;
            case "TIMELAPSE":
              idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO");
              let json = {
                "target": target,
                "video": "",
                "glitch": statusList.streamStatus.glitch[target]
              };
              if(idArr.length > 0){
              //if(idArr.length > 0 && timeLapseLength <= audioBuff[target].length){
                let targetID = idArr[Math.floor(Math.random() * idArr.length)];
                json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][target]["RATE"]);
                json["audio"] = audioBuff[target].shift();
                audioBuff[target].push(json["audio"]);
                if(target in videoBuff && videoBuff[target].length > 0){
                  json["video"] = videoBuff[target].shift();
                  videoBuff[target].push(json["video"]);
                  if(statusList["streamStatus"]["glitch"][target]) json = exportComponent.glitchStream(json);
                }
                io.to(targetID).emit('chunkFromServer', json);
                timeLapseLength++;
              /*} else if(timeLapseLength > audioBuff[target].length){
                timeLapseLength = 0;
                io.emit('stringsFromServer', "");*/
              } else {
                console.log("no timelapse target");
              }
              break;
            default: //PLAYBACK,TIMELAPSE,DRUM,SILENCEも含む  //1008はTimelapseは含まず
              idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO");
       //       console.log(idArr);
              console.log(idArr);
              if(idArr.length > 0){
                let json = {
                  "target": target,
                  "video": "",
                  "glitch": false
                };
                let targetID = idArr[Math.floor(Math.random() * idArr.length)];
                json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][target]["RATE"]);
                console.log(statusList.streamStatus.glitch);
                if(statusList["streamStatus"]["emitMode"] === "RANDOM"){
                  json["audio"] = audioBuff[target][Math.floor(Math.random() * audioBuff[target].length)];
                  if(target in videoBuff && videoBuff[target].length > 0) {
                    json["video"] = videoBuff[target][Math.floor(Math.random() * videoBuff[target].length)];
                    if(statusList["streamStatus"]["glitch"][target] && target != "DRUM") json = exportComponent.glitchStream(json);
                  }
                  //io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('chunkFromServer', json);
                  io.to(targetID).emit('chunkFromServer', json);
                } else if(statusList["streamStatus"]["emitMode"] === "BROADCAST"){
                  let idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO")
                  for(let i=0;i<idArr.lentgh;i++){
                    json["audio"] = audioBuff[statusList["clients"][String(idArr[i])][target]["arr"]];
                    if(target in videoBuff && videoBuff[target].length > 0) {
                      json["video"] = videoBuff[statusList["clients"][String(idArr[i])][target]["arr"]];
                      if(statusList["streamStatus"]["glitch"][target]) json = exportComponent.glitchStream(json);
                    }
                    io.to(idArr[i]).emit('chunkFromServer',json);
                    if(statusList["clients"][String(idArr[i])][target]["arr"] < audioBuff[target].length){
                      statusList["clients"][String(idArr[i])][target]["arr"]++;
                    } else {
                      statusList["clients"][String(idArr[i])][target]["arr"] = 0;
                    }
                  }
                } else {
                  json["audio"] = audioBuff[target].shift();
                  audioBuff[target].push(json["audio"]);
                  if(target in videoBuff && videoBuff[target].length > 0){
                    json["video"] = videoBuff[target].shift();
                    videoBuff[target].push(json["video"]);
                    if(statusList["streamStatus"]["glitch"][target]) json = exportComponent.glitchStream(json);
                  }
                  io.to(targetID).emit('chunkFromServer', json);
                }
              } else {
                console.log("no target");
                //json["audio"] = "";
                //json["video"] = "";
                //json["sampleRate"] = 44100;
                //console.log(json);
                //io.emit('chunkFromServer', json);
              }
            break;
          }
        }
      },Number(statusList["clients"][sockID]["STREAMS"][target]["LATENCY"]) * Math.pow(2,(Math.floor(Math.random() * 6))))
    } else {
      let idArr = [];
      switch(target){
        case "CHAT":
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "FROM");
          if(idArr.length > 0){
            io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('streamReqFromServer', "CHAT");
          }
          break;
        case "TIMELAPSE":
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO");
          let json = {
            "target": target,
            "video": "",
            "glitch": false
          };
          if(idArr.length > 0 && timeLapseLength <= audioBuff[target].length){
            let targetID = idArr[Math.floor(Math.random() * idArr.length)];
            json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][target]["RATE"]);
            json["audio"] = audioBuff[target].shift();
            audioBuff[target].push(json["audio"]);
            if(target in videoBuff && videoBuff[target].length > 0){
              json["video"] = videoBuff[target].shift();
              videoBuff[target].push(json["video"]);
              if(statusList["streamStatus"]["glitch"][target]) json = exportComponent.glitchStream(json);
            }
            io.to(targetID).emit('chunkFromServer', json);
            timeLapseLength++;
          } else if(timeLapseLength > audioBuff[target].length){
            timeLapseLength = 0;
            io.emit('stringsFromServer', "");
          } else {
            console.log("no timelapse target");
          }
          break;
        default: //PLAYBACK,TIMELAPSE,DRUM,SILENCEも含む  //1008はTimelapseは含まず
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO");
   //       console.log(idArr);
          //console.log(idArr);
          if(idArr.length > 0){
            let json = {
              "target": target,
              "video": "",
              "glitch": false
            };
            let targetID = idArr[Math.floor(Math.random() * idArr.length)];
            json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][target]["RATE"]);
            if(statusList["streamStatus"]["emitMode"] === "RANDOM"){
              json["audio"] = audioBuff[target][Math.floor(Math.random() * audioBuff[target].length)];
              if(target in videoBuff && videoBuff[target].length > 0) {
                json["video"] = videoBuff[target][Math.floor(Math.random() * videoBuff[target].length)];
                if(statusList["streamStatus"]["glitch"][target]) json = exportComponent.glitchStream(json);
              }
              //io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('chunkFromServer', json);
              io.to(targetID).emit('chunkFromServer', json);
            } else if(statusList["streamStatus"]["emitMode"] === "BROADCAST"){
              let idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO")
              for(let i=0;i<idArr.lentgh;i++){
                json["audio"] = audioBuff[statusList["clients"][String(idArr[i])][target]["arr"]];
                if(target in videoBuff && videoBuff[target].length > 0) {
                  json["video"] = videoBuff[statusList["clients"][String(idArr[i])][target]["arr"]];
                  if(statusList["streamStatus"]["glitch"][target]) json = exportComponent.glitchStream(json);
                }
                io.to(idArr[i]).emit('chunkFromServer',json);
                if(statusList["clients"][String(idArr[i])][target]["arr"] < audioBuff[target].length){
                  statusList["clients"][String(idArr[i])][target]["arr"]++;
                } else {
                  statusList["clients"][String(idArr[i])][target]["arr"] = 0;
                }
              }
            } else {
              json["audio"] = audioBuff[target].shift();
              audioBuff[target].push(json["audio"]);
              if(target in videoBuff && videoBuff[target].length > 0){
                json["video"] = videoBuff[target].shift();
                videoBuff[target].push(json["video"]);
                if(statusList["streamStatus"]["glitch"][target]) json = exportComponent.glitchStream(json);
              }
              io.to(targetID).emit('chunkFromServer', json);
            }
          } else {
            console.log("no target");
            //json["audio"] = "";
            //json["video"] = "";
            //json["sampleRate"] = 44100;
            //console.log(json);
            //io.emit('chunkFromServer', json);
          }
        break;
      }
    }
  } else if(target === "droneChat") {
    console.log("stream request for droneChat");
    io.emit('streamReqFromServer', "droneChat");
  }
}

const chunkFromClient = (data, sourceId) => {
  if(data.target != "DRONECHAT"){
    let json = {
      "glitch": false
    };
    //console.log(data);
    if(data["target"]){
      audioBuff[data["target"]].push(data["audio"]);
      videoBuff[data["target"]].push(data["video"]);
    } else {
    //  console.log(data);
      if(audioBuff["CHAT"].length === 0) audioBuff["CHAT"].push("");
      if(videoBuff["CHAT"].length === 0) videoBuff["CHAT"].push("");
      console.log(audioBuff["CHAT"].length);
      console.log(videoBuff["CHAT"].length);
    }
      //console.log(data["target"] + " length: " + String(audioBuff[data["target"]].length));
      //console.log(statusList["clients"][sourceId]);
    let sampleRate = String(statusList["clients"][sourceId]["STREAMS"]["CHAT"]["RATE"]);
    if(statusList["streamStatus"]["streamFlag"]["CHAT"]){
      let idArr = []
      idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], "CHAT", "TO")
      //console.log(idArr);
      if(idArr.length > 0){
        let clientRate = false;
        for(let i=0;i<idArr.length;i++){
          if(statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["RATE"] != Number(statusList["sampleRate"]["CHAT"])){
            clienttRate = true;
          }
        }
        json["target"] = "CHAT";
        json["sampleRate"] = sampleRate;
  /*        let json = {
          "target": data["target"],
          "sampleRate": sampleRate,
          "glitch": false
        };*/
        if(statusList["streamStatus"]["emitMode"] != "BROADCAST"){
          json["audio"] = audioBuff["CHAT"].shift();
          json["video"] = videoBuff["CHAT"].shift();
          if(statusList["streamStatus"]["glitch"]["CHAT"]) json = exportComponent.glitchStream(json);
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
            let arrVal = 0;
            if(statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"] < audioBuff[data["target"]].length){
              arrVal = statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"];
              statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"]++;
            } else {
              statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"] = 0;
            }
            json["audio"] = audioBuff[data["CHAT"]][arrVal];
            json["video"] = videoBuff[data["CHAT"]][arrVal];
            if(statusList["streamStatus"]["glitch"]["CHAT"]) json = exportComponent.glitchStream(json);
            io.to(idArr[i]).emit('chunkFromServer',json);
            statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["ACK"] = false;
            if(minItem === undefined || minVal > audioBuff[statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"]]) minItem = audioBuff[statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"]];

          }
          if(minItem != undefined && minItem > 0){
            for(let i=0; i<idArr.length;i++){
              statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"] = statusList["clients"][String(idArr[i])]["STREAMS"]["CHAT"]["arr"] - minItem;
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
  } else {
    data["sampleRate"] = 44100;
    data["gain"] = 1;
    //console.log(data);
    for(let distinationId in io.sockets.adapter.rooms){
      if(droneRoute[sourceId] === String(distinationId)){
        //console.log(distinationId);
        io.to(distinationId).emit('chunkFromServer',data);
      }
    }
  }
}

const stopFromServer = () => {
  exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "STOP"}, statusList["cmd"]["target"]);
  for(let key in statusList["cmd"]["now"]){
    if(statusList["cmd"]["now"][key] === false){
      statusList["cmd"]["past"][key] = false;
    } else if(statusList["cmd"]["now"][key] === true){
      statusList["cmd"]["past"][key] = true;
    } else {
      statusList["cmd"]["past"][key] = String(statusList["cmd"]["now"][key])
    }
    statusList["cmd"]["now"][key] = false;
  }
  for(let key in statusList["streamStatus"]["streamFlag"]){
    statusList["streamStatus"]["streamFlag"][key] = false;
  }
  audioBuff["CHAT"] = [];
  videoBuff["CHAT"] = [];
  io.to("ctrl").emit('statusFromServer', statusList);
  strings = "";
}

const cmdSelect = (strings) => {
  let cmd = false;
  for(let key in statusList["cmd"]["list"]){
    if(strings === key){
      cmd = {"cmd": statusList["cmd"]["list"][key]};
      // console.log("do cmd " + cmd["cmd"]);
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
  // console.log("sinewave " + strings + "Hz");
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
      io.emit('streamListFromServer', statusList["streamStatus"]["streamCmd"]);
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
              videoBuff[filename].push('data:image/jpeg;base64,' + data);
              //videoBuff[filename].push('data:image/webp;base64,' + data);
              let rmExec = 'rm ' + process.env.HOME + libDir + f;
              console.log(videoBuff[filename].length);
              console.log(rmExec);
              exec(rmExec,(err,stderr,stdout)=>{
                if(err) console.log(err);
                if(stderr) console.log(stderr);
                if(stdout) {
                  console.log(stdout);

                }
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
  let strFilename = String(filename);
  statusList["cmd"]["list"][strFilename] = strFilename;
  statusList["cmd"]["streamFlag"][strFilename] = false;
  statusList["streamStatus"]["streamCmd"][strFilename] = strFilename;
  statusList["streamStatus"]["streamFlag"][strFilename] = false;
  statusList.streamStatus.glitch[strFilename] = false;
  statusList["sampleRate"][strFilename] = "44100";
  for(let key in statusList["clients"]){
    statusList["clients"][key]["STREAMS"][strFilename] = {"TO": true, "arr": 0, "RATE": 44100};
  }
  io.emit('streamListFromServer', statusList["streamStatus"]["streamCmd"]);
  console.log(statusList);
  //console.log(testHsh["audio"].length);
}

const recordCmd = (file,data) => {
  let dt = new Date();
  fs.appendFile(file, ',\n  "' + dt.toFormat("YYYY/MM/DD HH24:MI:SS") + '": {' + data + '}', (err) => {
    if(err) throw err;
  });
}

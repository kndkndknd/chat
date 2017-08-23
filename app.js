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

const pcm = require('pcm');
const exec = require('child_process').exec;
const os = require('os');
const request = require('request');

const exportComponent = require('./exportFunction.js');
const keycodeMap = require ('./lib/keyCode.json');
let statusList = require ('./lib/status.json');

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
    title: 'Sloth',
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
app.get('/info', function(req, res, next) {
  console.log(req);
  res.render('info', {
    title: 'info',
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

let port = 8888;
let server = https.createServer(options,app).listen(port);
let io = require('socket.io').listen(server);

console.log("server start in " + os.networkInterfaces().en0[1]["address"] + ":" + String(port));

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

const audioBuff = {
  "DRUM": pcm2arr("./public/files/drum.wav"),
  "SILENCE": pcm2arr("./public/files/silence.wav"),
  "PLAYBACK": [],
  "TIMELAPSE": [],
  "CHAT": []
};
const videoBuff = {"PLAYBACK": [], "TIMELAPSE": [], "CHAT":[]};

const instructionDuration = [10000, 30000, 60000];
let strings = "";

// for connection check
const intervalValue = 30000; // 1min
setInterval(function() {
  for(let key in statusList["connected"]){
    if(io["sockets"]["adapter"]["rooms"][key] != undefined){
      statusList["connected"][key] = io["sockets"]["adapter"]["rooms"][key]["sockets"];
    }
  }
  console.log("now connected: ");
  console.log(statusList["connected"]);
  io.to("ctrl").emit("statusFromServer",statusList);
}, intervalValue);



io.sockets.on('connection',(socket)=>{
  socket.on("connectFromClient", (data) => {
    let sockId = String(socket.id);
    console.log("connect: " + sockId);
    socket.join(data);
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
      if(statusList["clients"] === undefined){
        console.log(sockId);
        let hsh = {};
        hsh[sockId] = {
          "room": data,
          "type": pcname,
          "CHAT":{"FROM": true, "TO": true, "ACK": true, "arr": 0},
          "RECORD": {"FROM": true, "arr": 0},
          "PLAYBACK": {"TO": true, "arr": 0},
          "TIMELAPSE": {"TO": true, "arr": 0},
          "DRUM": {"TO": true, "arr": 0},
          "SILENCE": {"TO": true, "arr": 0},
          "SECBEFORE": {"TO": true, "arr": 0},
          "CHATRATE": Number(statusList["sampleRate"]["CHAT"])
        };
        statusList["clients"] = hsh;
      } else {
        statusList["clients"][sockId] = {
          "room":data,
          "type": pcname,
          "CHAT":{"FROM": true, "TO": true, "ACK": true, "arr": 0},
          "RECORD": {"FROM": true, "arr": 0},
          "PLAYBACK": {"TO": true, "ACK": true, "arr": 0},
          "TIMELAPSE": {"TO": true, "ACK": true, "arr": 0},
          "DRUM": {"TO": true, "ACK": true, "arr": 0},
          "SILENCE": {"TO": true, "ACK": true, "arr": 0},
          "SECBEFORE": {"TO": true, "ACK": true, "arr": 0},
          "CHATRATE": Number(statusList["sampleRate"]["CHAT"])
        };
      }
    }
    io.to("ctrl").emit("statusFromServer", statusList);
    io.emit('streamStatusFromServer', statusList["streamStatus"]["streamFlag"]);
    // console.log(statusList["connected"]);
    console.log(statusList["clients"]);
  });

  socket.on("routingFromCtrl", (data) =>{
    console.log(data);
  });

  socket.on('chunkFromClient', (data)=>{
    chunkFromClient(data, String(socket.id));
  });

  socket.on('AckFromClient', (data)=>{
    statusList["clients"][String(socket.id)][data]["ACK"] = true;
    streamReq(data);
  });


  socket.on('charFromClient', (keyCode) =>{
    charFromClient(keyCode);
  });

  socket.on('wavReqFromClient',(data)=>{
    // wavReqFromClient(data);
    streamReq(data);
  })

  socket.on("uploadReqFromClient", (data) =>{
    let dataArr = data.split(".");
     uploadReqFromClient({
    //  movImport({
      "type": dataArr[1],
      "file": dataArr[0]
    });
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
    switch(data["cmd"]){
      case "FROM":
      case "TO":
        // console.log(data["property"]);
        if("clients" in statusList && data["property"]["target"] in statusList["clients"] && data["property"]["stream"] in statusList["clients"][data["property"]["target"]]){
          statusList["clients"][data["property"]["target"]][data["property"]["stream"]][data["cmd"]] = data["property"]["val"];
        }
        // console.log(statusList["clients"]);
        break;
      case "gain":
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
        if("sampleRate" in statusList && data["property"]["target"] in statusList["sampleRate"]){
          statusList["sampleRate"][data["property"]["target"]] = String(data["property"]["val"]);
          if(data["property"]["target"] === "CHAT"){
            for(let key in statusList["clients"]){
              statusList["clients"][key]["CHATRATE"] = Number(data["property"]["val"]);
            }
          }
        }
        exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate: " + String(data["property"]["val"]) + "Hz", statusList["cmd"]["target"]);
        break;
      case "shutter":
        console.log("shutter "+ data["property"]);
        io.to("client").emit('cmdFromServer', {
          "cmd": "SHUTTER",
          "property": data["property"]
        });
        break;
      case "CHATRATE":
        console.log("CHATRATE change");
        statusList["clients"][data["property"]["target"]]["CHATRATE"] = data["property"]["val"];
        break;
    }
    io.to("ctrl").emit("statusFromServer", statusList);
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
      }
    }
    if('clients' in statusList && sockId in statusList["clients"]){
      for(let key in statusList["clients"][sockId]){
        if(statusList["clients"][sockId][key]){
          socket.leave(key);
        }
      }
      delete statusList["clients"][sockId];
    }
  });
});

const charFromClient = (keyCode) =>{
  let character = keycodeMap[String(keyCode)];
  //      strings = exportComponent.char2Cmd(io, strings, character, cmdList, keyCode);
  if(character === "enter") {

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
          statusList["streamStatus"]["streamFlag"][statusList["cmd"]["stream"][key]] = true;
          setTimeout(() =>{
            streamReq(cmd["cmd"]);
            // wavReqFromClient(cmd["cmd"]);
          },500);
        }
      }
    }
    if (isNaN(Number(strings)) === false && strings != "") {
      let json = sineWave(strings);
      exportComponent.roomEmit(io, 'cmdFromServer', json, statusList["cmd"]["target"]);
    } else if( ~strings.indexOf("SEC") ) {
      let secs = strings.slice(0,strings.indexOf("SEC"));
      if(isNaN(Number(secs)) === false && secs != ""){
        let rate = 44100;
        if( ~strings.indexOf("_") ){
          if(isNaN(Number(strings.split("_")[1])) === false && strings.split("_")[1] != ""){
            rate = Number(strings.split("_")[1]);
          }
        }
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd":"SECBEFORE",
          "property": Number(secs),
          "rate": rate
        },statusList["cmd"]["target"]);
        statusList["cmd"]["now"]["SECBEFORE"] = secs;
      }
    } else if( ~strings.indexOf("_") ) {
      joinUnderBar(strings);
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
        if(key === "CHAT"){
          for(let clientID in statusList["clients"]){
            statusList["clients"][clientID]["CHATRATE"] = Number(rtnRate);
          }
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
              streamReq(key1);
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
    } else if(strings === "SWITCH"){
      /*
      later
      */
      for(let key in statusList["arduino"]["client"]){
        let urlStrings = statusList["arduino"]["network"] + statusList["arduino"]["client"][key]["host"];
        if(statusList["arduino"]["client"][key]["flag"]){
          urlStrings = urlStrings + + "/off/"
          arduino["flag"] = false;
        } else {
          urlStrings = urlStrings + "/on/"
          arduino["flag"] = true;
        }
        console.log(urlStrings);
        request(urlStrings, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            console.log(response);
          } else {
            console.log('error: '+ response);
          }
        })
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
  } else if(character === "backspace" || character === "left_arrow" || character === "tab") {
    exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
    strings =  "";
  } else if(character === "escape"){
    stopFromServer();
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode === 18){
    exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "BASS"}, statusList["cmd"]["target"]);
    if(statusList["cmd"]["now"]["BASS"]){
      statusList["cmd"]["now"]["BASS"] = false;
    } else {
      statusList["cmd"]["now"]["BASS"] = true;
    }
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 32 || keyCode === 189 || keyCode === 226 || keyCode === 220){ //alphabet or number
    strings =  strings + character;
    exportComponent.roomEmit(io, 'stringsFromServer', strings, statusList["cmd"]["target"]);
  } else if(character === "up_arrow"){
    strings = statusList["cmd"]["prevCmd"];
    exportComponent.roomEmit(io, 'stringsFromServer', strings, statusList["cmd"]["target"]);
  }

}

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
    if(strArr[0] === "CHAT"){
      for(let clientID in statusList["clients"]){
        statusList["clients"][clientID]["CHATRATE"] = Number(rtnRate);
      }
    }
    exportComponent.roomEmit(io, 'stringsFromServer', "sampling rate(" + strArr[0]+"):"+rtnRate + "Hz", statusList["cmd"]["target"]);
  }
}

const streamReq = (data) => {
  // console.log("Stream Request in " + data)
  if(statusList["streamStatus"]["streamFlag"][data]){
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
        if(idArr.length > 0){
          let json = {
            "target": data,
            "sampleRate": Number(statusList["sampleRate"][data]),
            "video": ""
          };
          if(statusList["streamStatus"]["emitMode"] === "RANDOM"){
            json["audio"] = audioBuff[data][Math.floor(Math.random() * audioBuff[data].length)];
            if(data in videoBuff){
              json["video"] = videoBuff[data][Math.floor(Math.random() * videoBuff[data].length)];
            }
            io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('chunkFromServer', json);
/*          } else if(statusList["streamStatus"]["emitMode"] === "BROADCAST"){
            let idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], data, "TO")
            for(let i=0;i<idArr.lentgh;i++){
              json["audio"] = audioBuff[statusList["clients"][String(idArr[i])][data]["arr"]];
              json["video"] = videoBuff[statusList["clients"][String(idArr[i])][data]["arr"]];
              io.to(idArr[i]).emit('chunkFromServer',json);
              if(statusList["clients"][String(idArr[i])][data]["arr"] < audioBuff[data].length){
                statusList["clients"][String(idArr[i])][data]["arr"]++;
              } else {
                statusList["clients"][String(idArr[i])][data]["arr"] = 0;
              }
            }*/
          } else {
            json["audio"] = audioBuff[data].shift();
            audioBuff[data].push(json["audio"]);
            if(data in videoBuff){
              json["video"] = videoBuff[data].shift();
              videoBuff[data].push(json["video"]);
            }
            io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit('chunkFromServer', json);
          }
        }
      break;
    }
  }
}

const chunkFromClient = (data, sourceId) => {
  audioBuff[data["target"]].push(data["audio"]);
  videoBuff[data["target"]].push(data["video"]);
  console.log(data["target"] + " length: " + String(audioBuff[data["target"]].length));
  let sampleRate = String(statusList["clients"][sourceId]["CHATRATE"]);
  if(data["target"] === "CHAT" && statusList["streamStatus"]["streamFlag"][data["target"]]){
    let idArr = []
    idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], data["target"], "TO")
    if(idArr.length > 0){
/*      let clientRate = false;
      for(let i=0;i<idArr.length;i++){
        if(statusList["clients"][String(idArr[i])]["CHATRATE"] != Number(statusList["sampleRate"][data["target"]])){
          clienttRate = true;
        }
      }*/
      let json = {
        "target": data["target"],
        //"sampleRate": Number(statusList["sampleRate"][data["target"]])
        "sampleRate": sampleRate
      }
      // if(statusList["streamStatus"]["emitMode"] != "BROADCAST"){
        json["audio"] = audioBuff[data["target"]].shift();
        json["video"] = videoBuff[data["target"]].shift();
        let targetID = idArr[Math.floor(Math.random() * idArr.length)];
/*        if(clienttRate){
          json["sampleRate"] = statusList["clients"][targetID]["CHATRATE"];
        }
        */
        io.to(targetID).emit('chunkFromServer', json);
        statusList["clients"][String(targetID)]["CHAT"]["ACK"] = false;
/*      } else {
        let minItem;
        console.log(idArr.length);
        for(let i=0;i<idArr.length;i++){
          console.log('debug');
          let arrVal = 0;
          if(statusList["clients"][String(idArr[i])][data["target"]]["arr"] < audioBuff[data["target"]].length){
            arrVal = statusList["clients"][String(idArr[i])][data["target"]]["arr"];
            statusList["clients"][String(idArr[i])][data["target"]]["arr"]++;
          } else {
            statusList["clients"][String(idArr[i])][data["target"]]["arr"] = 0;
          }
          json["audio"] = audioBuff[data["target"]][arrVal];
          json["video"] = videoBuff[data["target"]][arrVal];
          io.to(idArr[i]).emit('chunkFromServer',json);
          statusList["clients"][String(idArr[i])]["CHAT"]["ACK"] = false;
          if(minItem === undefined || minVal > audioBuff[statusList["clients"][String(idArr[i])][data["target"]]["arr"]]){
            minItem = audioBuff[statusList["clients"][String(idArr[i])][data["target"]]["arr"]];
          }
        }
        if(minItem != undefined && minItem > 0){
          for(let i=0; i<idArr.length;i++){
            statusList["clients"][String(idArr[i])][data["target"]]["arr"] = statusList["clients"][String(idArr[i])][data["target"]]["arr"] - minItem;
          }
          //audioBuff,videoBuffを先頭からminItem分の要素削除
          audioBuff[data["target"]].splice(0,minItem);
          videoBuff[data["target"]].splice(0,minItem);
        }
      }*/
    } else {
      statusList["streamStatus"]["waitCHAT"] = true;
    }
  }
}

const stopFromServer = () => {
  exportComponent.roomEmit(io, 'cmdFromServer', {"cmd": "STOP"}, statusList["cmd"]["target"]);
  // console.log(statusList["cmd"]["now"]);
  // statusList["cmd"]["past"] = statusList["cmd"]["now"];
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
  exec(sndConvert,(error,stdout,stderr) =>{
    if(stdout){
      console.log('stdout: ' + stdout);
      statusList["cmd"]["list"][data["file"]] = data["file"];
      statusList["cmd"]["stream"][data["file"]] = data["file"];
      statusList["streamStatus"]["streamFlag"][data["file"]] = false;
      audioConvert(data);
    }
    if(stderr){
      console.log('stderr: ' + stderr);
      statusList["cmd"]["list"][data["file"]] = data["file"];
      statusList["cmd"]["stream"][data["file"]] = data["file"];
      statusList["streamStatus"]["streamFlag"][data["file"]] = false;
      io.emit('streamStatusFromServer', statusList["streamStatus"]["streamFlag"]);
      audioConvert(data);
    }
    if (error !== null) {
      console.log('Exec error: ' + error);
    }
  });

}
const audioConvert = (data) =>{
  audioBuff[data["file"]] = pcm2arr(process.env.HOME + libDir + data["file"] + '.aac');
  videoBuff[data["file"]] = [];
  let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + data["file"] + '.' + data["type"] + '-t 10 -r 2 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
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

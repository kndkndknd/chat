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
const requestOption = {
  url: 'https://knd.space/getBufferData/',
  json: true
};

//promisify
const util = require('util');
const readDir = util.promisify(fs.readdir)
const readFile = util.promisify(fs.readFile)
const execPromise = util.promisify(exec)


// arduino
let relay = null
const arduino = require('johnny-five')
const board = new arduino.Board()
board.on('ready', () => {
  console.log("johnny five relay connected, NC open");
  relay = new arduino.Led(13);
  relay.on();
  setTimeout(()=>{
    relay.off();
    },500);
});
// --arduino

const exportComponent = require('./exportFunction.js');
let statusList = require ('./lib/status.json');
let pathList = require('./lib/path.json')
let dt = new Date();
const logFilePath = "./log/log" + dt.toFormat("YYYYMMDDHH24MMSS") + ".json"

const https = require('https');
const http = require('http');
const { isObjectLiteralElement } = require('typescript');

//https鍵読み込み
const options = {
  key: fs.readFileSync(process.env.HOME + '/keys/privkey.pem'),
  cert: fs.readFileSync(process.env.HOME + '/keys/cert.pem')
}


const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'lib/favicon.ico')));

app.get('/', function(req, res, next) {
  res.render('client', {
    title: 'client'
   });
});
app.get('/hls', function(req, res, next) {
  res.render('hls', {
    title: 'hls test'
   });
});
app.get('/text', function(req, res, next) {
  res.render('textInput', {
    title: 'text input'
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
  statusList.ipAddress = os.networkInterfaces().en0[1].address + ":8888"
} else {
  console.log("server start in localhost:8888")
  statusList.ipAddress = "localhost:8888"
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
        tmpBuff = new Float32Array(8192);
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
const movBuff = {
  "KICK": {
    // "audio": exportComponent.pcm2arr(pcm, "./public/files/KICK.wav"),
    "audio": [],
    "index": 0
  },
  "SNARE": {
    // "audio": exportComponent.pcm2arr(pcm, "./public/files/SNARE.wav"),
    "audio": [],
    "index": 0
  },
  "HAT": {
    // "audio": exportComponent.pcm2arr(pcm, "./public/files/HAT.wav"),
    "audio": [],
    "index": 0
  },
  "SILENCE": {
    // "audio": exportComponent.pcm2arr(pcm, "./public/files/SILENCE.wav"),
    "audio": [],
    "index": 0
  },
  "PLAYBACK": {
    "audio": [],
    "video": [],
    "index": 0
  },
  "TIMELAPSE": {
    "audio": [],
    "video": [],
    "index": 0
  },
  "CHAT": [],
  "INTERNET": {
    "audio": [],
    "video": [],
    "index": 0
  }
}

let strings = "";
const homeDir = pathList.home
//const libDir = process.env.HOME + pathList.upload
const libDir = "./upload/"
let timelapseFlag = false;
let tile = false
let cmd
let internetUrl = "https://knd.space/"
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


// scenario
let logArr = []
let startTime = new Date()
fs.appendFile(logFilePath, '{', (err) => {
  if(err) throw err;
})
let initCommand = true
const scenarioPath = "./scenario.json"
let scenario = {}

let switchInterval

const getInternet = () =>{
  //console.log('request.get({url: ' + internetUrl + '"ckeckGetBuffer/",json:true}, function (error, response, body) {function}')
  request.get({url: internetUrl + 'ckeckGetBuffer/',json:true}, function (error, response, body) {
    //console.log(response)
    if (!error && response.statusCode == 200) {
      console.log(response.body)
      //console.log(response.body.value)
      if(response.body.value > 0) {
        console.log("response.body.value > 0")
        let flag = true
          //while(flag){
        for(let i=0;i<response.body.value;i++){
          request.get({url: internetUrl + 'getBuffer/',json:true}, function(error, response, body) {
            if(!error && response.statusCode == 200 && body.remainLength > 0) {
              //console.log("get")
              if(body.remainLength > 0) {
                //if(body.audio != undefined) audioBuff.INTERNET.push(body.audio)
                //if(body.video != undefined) videoBuff.INTERNET.push(body.video)
                if(body.audio != undefined) {
                  movBuff.INTERNET.audio.push(body.audio)
                  movBuff.INTERNET.video.push(body.video)
                }
              } else {
                flag = false
       //         break
              }
            } else {
              //console.log(body)
            }
          })
        }
        //}
      } else {
        console.log("response.body.value === 0")
      } 
    } else if(response != undefined) {
      console.log('internet connect error: '+ response.statusCode);
    } else {
      //console.log('internet connect error: ' + String(error))
    }
  })
}

//const intervalValue = 30000; // 1min
setInterval(function() {
  for(let key in statusList["connected"]){
    if(io["sockets"]["adapter"]["rooms"][key] != undefined){
      statusList["connected"][key] = io["sockets"]["adapter"]["rooms"][key]["sockets"];
    }
  }
  //console.log("now connected: ");
  //console.log(statusList["clients"]);
  //console.log("now InternetBuffer: " + String(movBuff.INTERNET.audio.length))
  io.to("ctrl").emit("statusFromServer",statusList);
  if(timelapseFlag) {
    exportComponent.shutterReq(io, "oneshot");
    //getInternet() //当面使わない
  }
}, Number(statusList.interval) * 1000);

let cliNo = 0;
io.sockets.on('connection',(socket)=>{
  socket.on("connectFromClient", (data) => {
    let sockID = String(socket.id);
//    console.log(socket.handshake.headers.host);
    console.log('socket.on("connectFromClient", (data) => {data:' + data + ', id:' + sockID + '}')
    //console.log(data);
    socket.join(data);
    socket.join("all");
    if(data != "ctrl"){
      socket.join("default");
    }
    if(statusList.connected[data] === undefined){
      statusList.connected[data] = {sockID: true};
    } else {
      statusList.connected[data][sockID] = true;
    }
    if(data != "ctrl" && data != "log" && data != "mic"){
      let pcname = "unknown";
      for(let key in statusList["pc"]){
        if( socket.handshake.headers["user-agent"].indexOf(statusList.pc[key]) > -1){
          pcname = key
        }
      }
      //console.log(socket.handshake.address);
      if(Object.keys(statusList.clients)[0] === 'dummy' && Object.keys(statusList.clients.length === 1 )){
        delete statusList.clients.dummy;
        /*
        fs.appendFile(logFilePath, '{\n  "' + dt.toFormat("YYYY/MM/DD HH24:MI:SS") + '": {"' + String(socket.id) + '":"connect"}', (err) => {
          if(err) throw err;
        });
      } else {
        recordCmd(logFilePath, String(socket.id) ,"connect")
        */
      }
      let ipAddress = "localhost";
      if(String(socket.handshake.address) != "::1"){
        //console.log(socket.handshake)
        ipAddress = String(socket.handshake.address.replace("::ffff:",""))
      }
      statusList.clients[sockID] = {
        "room":data,
        "No": cliNo,
        "type": pcname,
        "ipAddress": ipAddress,
        //"ipAddress": socket.handshake.headers.host.split(":")[0],
        "STREAMS": {
          "RECORD": {"FROM": false, "arr": 0}
        },
        "rhythm":{
          "bpm": 60
        },
        "cmd": {
          "cmd":"none",
          "timestamp":0
        },
        "voice": false
      };
      switch(cliNo){
        case 0:
          statusList.clients[sockID].rhythm["score"] = [1,1,1,1]
          statusList.clients[sockID].rhythm["timbre"] = 440
          break;
        case 1:
          statusList.clients[sockID].rhythm["score"] = [0,0,1,0]
          statusList.clients[sockID].rhythm["timbre"] = 880
          break;
        case 2:
          statusList.clients[sockID].rhythm["score"] = [0,1,0,1]
          statusList.clients[sockID].rhythm["timbre"] = 110
          break;
        case 3:
          statusList.clients[sockID].rhythm["score"] = [1,0,1,0]
          statusList.clients[sockID].rhythm["timbre"] = 220
          break;
        case 4:
          statusList.clients[sockID].rhythm["score"] = [1,0,1,0]
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
            statusList.clients[sockID].STREAMS[key] = {"FROM": false, "TO": false, "ACK": false, "arr": 0, "LATENCY": 0, "RATE":"44100"};
            break;
          case "KICK":
          case "SNARE":
          case "HAT":
            statusList.clients[sockID].STREAMS[key] = {"TO": false, "ACK": false, "arr": 0, "LATENCY": statusList.clients[sockID].rhythm.interval / 8, "RATE":"44100"};
            break
          //case "RECORD":
           // statusList["clients"][sockID]["STREAMS"][key] = {"FROM": true, "arr": 0, "LATENCY": "0", "RATE":"48000"};
            //break;
          default:
            statusList.clients[sockID].STREAMS[key] = {"TO": false, "arr": 0, "LATENCY": 0, "RATE":"44100"};
        }
      }
      // gainCtrl server connect test
      request("http://" + statusList.clients[sockID].ipAddress + ":7777", function (error, response, body) {
        if (!error && response.statusCode == 200) {
          statusList.clients[sockID].server = true
          //console.log('http://' + statusList.clients[sockID].ipAddress + ':7777 http response:' + response.statusCode)
        } else {
          statusList.clients[sockID].server = false
          if(!error) {
            //console.log('http://' + statusList.clients[sockID].ipAddress + ':7777 http response:' + response.statusCode)
          } else {
            //console.log(error)
          }
        }
      })
      cliNo++;
      console.log(Object.keys(statusList.clients))
    }
    //console.log(statusList["clients"]);
    io.to("ctrl").emit("statusFromServer", statusList);
    io.emit('streamListFromServer', statusList["streamStatus"]["streamCmd"]);
    socket.emit('connectFromServer', {
      clientStatus: statusList.clients[sockID],
      streamFlag: statusList.streamStatus.streamFlag
    })

    //recordCmd(logFilePath, "connect | " + sockID)
  });
  socket.on("startFromClient", () => {
    timelapseFlag = true;
    //getInternet()
    if(statusList.clients[String(socket.id)] !== undefined){
    statusList.clients[String(socket.id)].STREAMS.RECORD = {"FROM": true, "arr": 0}
    for(let key in statusList.streamStatus.streamFlag){
      switch(key){
        case "CHAT":
          statusList.clients[String(socket.id)].STREAMS[key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": 0, "RATE":"44100"};
          break;
        case "KICK":
        case "SNARE":
        case "HAT":
          statusList.clients[String(socket.id)].STREAMS[key] = {"TO": true, "ACK": true, "arr": 0, "LATENCY": statusList.clients[String(socket.id)].rhythm.interval / 8, "RATE":"44100"};
          break
        default:
          statusList.clients[String(socket.id)].STREAMS[key] = {"TO": true, "arr": 0, "LATENCY": 0, "RATE":"44100"};
      }
    }
    socket.emit('streamFlagFromServer', statusList.streamStatus.streamFlag)
  }
  })
  socket.on("routingFromCtrl", (data) =>{
    //console.log(data);
  });

  socket.on('chunkFromClient', (data)=>{
    // console.log(data); //20210421_2
    console.log("debug chunkFromClient data.target:" + data.target) //20210421
    chunkFromClient(data, String(socket.id));
    //if(Math.random()<0.1) postToInternet({"audio":data.audio, "video": data.video, "target":"CHAT"})
  });

  socket.on('AckFromClient', (data)=>{
    let id = String(socket.id)
    //console.log(data)
    console.log("debug AckFromClient data:" + data)
    if(statusList.streamStatus.streamFlag && id in statusList.clients) {
      console.log("debug streamFlag in AckFromClient data:" + data)
      statusList.clients[id].STREAMS[data].ACK = true;
      streamReq(data, id);
    }
  });


  socket.on('charFromClient', (character) =>{
    strings = charFromClient(character,strings, socket.id, false);
  });
  //mic
  socket.on('micFromClient', (data) => {
    //console.log(data)
    strings = data
    micToCmd(data, socket.id)
  })

  socket.on('wavReqFromClient',(data)=>{
    streamReq(data, String(socket.id));
  })

  socket.on("uploadReqFromClient", (data) =>{
    let dataArr = data.split(".");
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

  socket.on("AckFromMobile", (data)=>{
    if(data === "start") socket.emit("streamReqToMobile", "CHAT")
  })
  socket.on("chunkFromMobile", (data)=>{
    if(data.audio != "" && data.video != ""){
      movBuff.CHAT.push({"id": String(socket.id), "audio": data.audio, "video":data.video});
    }
    setTimeout(() =>{
      socket.emit("streamReqToMobile", "CHAT")
    } ,500)
  })
  socket.on("textFromClient",(data) =>{
    if(data !== ""){
      for(let key in statusList.cmd.textList) {
        if(data.includes(key) && !statusList.cmd.textState[statusList.cmd.textList[key]]) {
          // コマンドの処理
          const cmd = statusList.cmd.textList[key]
          cmdFromServer(cmd, false)
          console.log(key)
          /*
          if(cmd === "440" || cmd === "10000" || cmd === "80"){
            statusList.cmd.textState.SINEWAVE = true
          } else {
            */
            statusList.cmd.textState[cmd] = true
          // }
        }
      }
    } else { // テキスト欄削除またはEnterキー入力の動作
      console.log("stop textInput")
      //停止の処理
      //RANDOMとGLITCHとタイルの強制解除
      for(let key in statusList.cmd.textState){
        if(statusList.cmd.textState[key]) {
          //停止の処理
          switch(key) {
            case "SINEWAVE":
              console.log("sinewave")
            case "WHITENOISE":
            case "FEEDBACK":
            case "BASS":
            case "CHAT":
            case "PLAYBACK":
            case "DRUM":
            case "TIMELAPSE":
              splitSpace("STOP " + key, false, "dummy");
              break;
            case "GRID":
              statusList.streamStatus.grid = false
              break;
            case "QUANTIZE":
              statusList.streamStatus.quantize = false
              io.emit("cmdFromServer",{
                "cmd": "QUANTIZE",
                "quantize": statusList.streamStatus.quantize
              })
              break;
            case "RANDOM":
              statusList.streamStatus.emitMode = "NORMAL"
              break;
            case "GLITCH":
              for(let stream in statusList.streamStatus.glitch) {
                statusList.streamStatus.glitch[stream] = false
              }
              break;
          }
        }
        statusList.cmd.textState[key] = false
      }
    }
    io.emit("textFromServer", {
      "text": data,
      "alert": false,
      "timeout": true
    })
  })
  socket.on("voiceCtrlFromClient", (data) => {
    statusList.clients[String(socket.id)].voice = data
  })
  /*
  socket.on("recordFinishFromCLient", () => {
    statusList.streamStatus.record = false
    for(let stream in statusList.streamStatus.streamFlag) {
      if(statusList.streamStatus.streamFlag[stream]){
        let json = {}
        if(movBuff.CHAT.length > 1){ // 20210420試し
          if(!statusList.streamStatus.chatSequence){
            json = movBuff.CHAT.shift()
            console.log("debug length")
            console.log(movBuff.CHAT.length)
          } else {
            movBuff.CHAT.some((element, index)=>{
              if(element.id === sourceId){
                json = element
                movBuff.splice(index,1)
                return true
              }
            })
          }
        } else if(movBuff.CHAT.length > 0) { //20210420試し
          json = movBuff.CHAT[0]
        }

        if( json !== {}){
          let idArr = []
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], "CHAT", "TO", sourceId)
          if(idArr.length > 0){
            let clientRate = false;
            idArr.forEach((element, index) => {
              if(String(element) in statusList.clients && statusList.clients[String(element)].STREAMS.CHAT.RATE != Number(statusList.sampleRate.CHAT)) clientRate = true
            })
            json.target = "CHAT";
            json.glitch = false
            json.sampleRate = sampleRate;
            if(statusList.streamStatus.glitch.CHAT) json = exportComponent.glitchStream(json);
            let targetID = idArr[Math.floor(Math.random() * idArr.length)];
            if(clientRate){
              if(statusList.clients[targetID] != undefined) json.sampleRate = statusList.clients[targetID].STREAMS.CHAT.RATE
              if(json.sampleRate === "RANDOM") json.sampleRate = String(Math.ceil(Math.random() * 8) * 12000)
            }
            io.to(targetID).emit('chunkFromServer', json);
            console.log("for debug; io.to(" + targetID + ").emit('chunkFromServer', " + json + ")")
            if(statusList.clients[String(targetID)] != undefined) statusList["clients"][String(targetID)]["STREAMS"]["CHAT"]["ACK"] = false;
          } else {
            statusList["streamStatus"]["waitCHAT"] = true;
          }
        }
      }
    }
  })
  */
  socket.on("disconnect", () =>{
    console.log('disconnect: ' + String(socket.id));
    //recordCmd(logFilePath, String(socket.id) ,"disconnect")
    let sockID = String(socket.id);
    for(let key in statusList["connected"]){
      if(statusList["connected"][key][sockID]){
        delete statusList["connected"][key][sockID];
        socket.leave(key);
      }
    }
    if('clients' in statusList && sockID in statusList.clients){
      for(let key in statusList.clients[sockID]){
        if(statusList.clients[sockID][key]){
          socket.leave(key);
        }
      }
      delete statusList.clients[sockID];
    }
    cliNo = 0;
    if(Object.keys(statusList.clients).length > 0){
      for(let key in statusList.clients){
        statusList.clients[key].No = cliNo;
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
// websocket


const getFromInternet = () =>{
  request.get({url: internetUrl + 'ckeckGetBuffer/',json:true}, (error, response, body) => {
    if (response.statusCode == 200) {
      for(let i=0;i<body.value;i++){
      request.get({url: internetUrl + 'getBuffer/',json:true}, (error, response, body) =>{
        if (!error && response.statusCode == 200 && body.value != "no") {
          if(body.audio != undefined && body.video != undefined) {
            movBuff.INTERNET.audio.push(body.audio)
            movBuff.INTERNET.video.push(body.video)
          }
        } else if(value in body && body.value === "no"){
        }
      })
      }
    } else if(response != undefined) {
    } else {
    }
  })
}

const postToInternet = (chunk) =>{
  request.get({url: internetUrl + 'checkPost/',json:true}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      if(response.body.ack === "ok") {
        request.post({
          uri: internetUrl + "postBuffer/",
          headers:{"Content-type":"application/json"},
          json: chunk
        },(error, response, body) =>{
        })
      } else {
      }
    } else {
    } 
  })
}

const cmdFromServer = (cmdStrings, alertFlag) =>{
  let sendText = "";
  console.log("socket.emit('cmdFromSever',"+cmdStrings+")")
  switch(cmdStrings){
    case "LIGHTMODE":
      console.log("debug0103")
      statusList.dark = false
      io.emit('cmdFromServer',{
        "cmd": "DARKMODE",
        "property": false
      })
      break;
    case "DARKMODE":
      console.log("debug0103")
      statusList.dark = true
      io.emit('cmdFromServer',{
        "cmd": "DARKMODE",
        "property": true
      })
      break;
    case "SCENARIO":
      doScenario();
      break;
    case "START":
      startTime = new Date()
      timelapseFlag = true;
      io.emit('textFromServer',{
        "text": cmdStrings,
        "alert": false,
        "timeout": true
      })
      break;
    case "STOP":
      stopFromServer();
      /*
      io.emit('textFromServer',{
        "text": cmdStrings,
        "alert": false,
        "timeout": true
      })
      */
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
      rtnRate = calcRate(aveRate / keys)
      console.log('STREAM sampleRate = ' + String(rtnRate))
      for (let key in statusList["sampleRate"]){
        statusList["sampleRate"][key] = rtnRate;
        if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
          for(let clientID in statusList.clients){
            statusList.clients[clientID].STREAMS[key].RATE = String(rtnRate);
          }
        }
      }
      io.emit('cmdFromServer',{
        cmd: "SAMPLERATE",
        property: rtnRate
      })
      break;
    case "GRID":
      console.log('STREAM note on in GRID: ' + String(!statusList.streamStatus.grid))
      if(!statusList.streamStatus.grid){
        io.emit("textFromServer", {
          "text": "GRID",
          "alert": false,
          "timeout": true
        })
        for(let id in statusList.clients){
          for(let strms in statusList.clients[id].STREAMS){
            if(strms != "KICK" && strms != "SNARE" && strms != "HAT") statusList.clients[id].STREAMS[strms].LATENCY = statusList.clients[id].rhythm.interval / 32
          }
        }
      } else {
        io.emit("textFromServer", {
          "text": "NOT GRID",
          "alert": false,
          "timeout": true
        })
        for(let id in statusList.clients){
          for(let strms in statusList.clients[id].STREAMS){
            if(strms != "KICK" && strms != "SNARE" && strms != "HAT") statusList.clients[id].STREAMS[strms].LATENCY = 0
          }
        }
      }
      statusList.streamStatus.grid = !statusList.streamStatus.grid
      break
    case "QUANTIZE":
      statusList.streamStatus.quantize = !statusList.streamStatus.quantize
      console.log('STREAM note on in QUANTIZE')
        io.emit("cmdFromServer",{
          "cmd": "QUANTIZE",
          "quantize": statusList.streamStatus.quantize
        })
      break
    case "METRONOME":
      for(let id in io.sockets.adapter.rooms.client.sockets){
        io.to(id).emit('cmdFromServer',{
          "cmd": "METRONOME",
          "type": "param",
          "trig": true,
          "property": statusList.clients[String(id)].rhythm
        });
      }
      break;
    case "PREV":
    case "PREVIOUS":
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
              let idArr = Object.keys(statusList.clients)
              streamReq(key1, idArr[Math.floor(Math.random() * idArr.length)])
            },500);
          }
        }
      }
      break;
    case "RANDOM":
      if(statusList["streamStatus"]["emitMode"] === cmdStrings){
        statusList["streamStatus"]["emitMode"] = "NORMAL";
        io.emit('textFromServer',{
          "text": "NOT RANDOM",
          "alert": false,
          "timeout": true
        })
      } else {
        statusList["streamStatus"]["emitMode"] = cmdStrings;
        io.emit('textFromServer',{
          "text": cmdStrings,
          "alert": false,
          "timeout": true
        })
      }
      break;
    case "SWITCH":
      if(relay !== null) {
        statusList.cmd.now.SWITCH = !statusList.cmd.now.SWITCH
        if(statusList.cmd.now.SWITCH) {
          relay.on()
          io.emit('textFromServer',{
            "text": "SWITCH ON",
            "alert": false,
            "timeout": true
          })
        } else {
          relay.off()
          io.emit('textFromServer',{
            "text": "SWITCH OFF",
            "alert": false,
            "timeout": true
          })
        }
      } else {
        console.log("relay is not connected");
        //sendText = String(statusList.cmd.now.SWITCH)
        statusList.cmd.now.SWITCH = !statusList.cmd.now.SWITCH
        if(statusList.cmd.now.SWITCH) {
          sendText = "SWITCH ON"
          request.get({url: 'http://192.168.0.128/2/on',json:true}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              sendText = "SWTICH ON";
              /*
              io.emit('textFromServer',{
                "text": "SWITCH ON",
                "alert": false,
                "timeout": true
              })
              */
              // statusList.cmd.now.SWITCH = true;
            } else {
              sendText = "SWITCH ERROR";
              /*
              io.emit('textFromServer',{
                "text": "SWITCH ERR",
                "alert": false,
                "timeout": true
              })
              */
              // statusList.cmd.now.SWITCH = false;
            }
          })
        } else {
          sendText = "SWITCH OFF"
          request.get({url: 'http://192.168.0.128/2/off',json:true}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              sendText = "SWTICH OFF";
              /*
              io.emit('textFromServer',{
                "text": "SWITCH OFF",
                "alert": false,
                "timeout": true
              })
              */
              // statusList.cmd.now.SWITCH = false;
            } else {
              sendText = "SWITCH ERROR";
              /*
              io.emit('textFromServer',{
                "text": "SWITCH ERR",
                "alert": false,
                "timeout": true
              })
              */
            }
          })
        }
        io.emit('textFromServer',{
          "text": sendText,
          "alert": false,
          "timeout": true
        })
        
      }
      break;
    case "FAN":
      // let sendText;
      if(!statusList.cmd.now.FAN) {
        request.get({url: 'http://192.168.0.128/2/on',json:true}, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            sendText = "FAN ON";
            statusList.cmd.now.FAN = true;
          } else {
            sendText = "FAN ERROR";
          }
        })
      } else {
        request.get({url: 'http://192.168.0.128/2/off',json:true}, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            sendText = "FAN OFF";
            statusList.cmd.now.FAN = false;
          } else {
            sendText = "FAN ERROR";
          }
        })
      }
      io.emit('textFromServer',{
        "text": sendText,
        "alert": false,
        "timeout": true
      })
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
        io.emit('textFromServer',{
          "text": cmdStrings,
          "alert": false,
          "timeout": true
        })
      } else {
        //exportComponent.roomEmit(io,'textFromServer',"NOT GLITCH", statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          "text": "NOT GLITCH",
          "alert": false,
          "timeout": true
        })
      }
      break;
      /*
    case "BROWSER":
      exportComponent.roomEmit(io, 'cmdFromServer', {
        "cmd": "BROWSER",
        "property":statusList.ipAddress
      },statusList.cmd.target)
      break;
      */
    case "MUTE":
      io.emit('cmdFromServer',{"cmd": "MUTE"});
      break;
    case "HALF":
      io.emit('cmdFromServer',{"cmd": "HALF"})
      break;
    case "TWICE":
      io.emit('cmdFromServer',{"cmd": "TWICE"})
      break;
    case "THRICE":
      io.emit('cmdFromServer',{"cmd": "THRICE"})
      break;
    case "TILE":
      if(tile) {
        tile = false
      } else {
        tile = true
        console.log("tile")
      }
      io.emit('cmdFromServer',{"cmd":"TILE", "property":tile})
      break;
    case "FLASH":
      io.emit('cmdFromServer', {cmd: "FLASH"})
      break;
    default:
      cmd = cmdSelect(cmdStrings);
      if(cmd) {
        //console.log("cmd: " + cmd["cmd"]);
        if(cmd["cmd"] === "RECORD"){
          // statusList.streamStatus.record = true
          console.log("debug RECORD start")
          let idArr = [];
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList.clients, cmd["cmd"], "FROM", "dummyID")
          for(let i=0;i<idArr.length;i++){
            io.to(idArr[i]).emit('cmdFromServer', cmd);
          }
        } else if(cmd.cmd === "DRUM") {
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
          let flag = true
          for(let key in statusList.streamStatus.streamCmd){
            if(cmd.cmd === key) flag = true
          }
          
          if(flag){
            cmd.target = exportComponent.pickCmdTarget(statusList.clients,cmd)
            if(cmd.target != undefined){
              if(cmd.cmd != statusList.clients[cmd.target].cmd.cmd){
                statusList.clients[cmd.target].cmd.cmd = cmd.cmd
              } else {
                statusList.clients[cmd.target].cmd.cmd = "none"
              }
              statusList.clients[cmd.target].cmd.timestamp = Number(new Date())
              exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"]);
            } 
          } else {
            exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"])
          }
        }
        for(let key in statusList.streamStatus.streamCmd){
          if(cmd.cmd === key){
            console.log(key)
            //console.log(key + " stream start");
            statusList.streamStatus.streamFlag[statusList.streamStatus.streamCmd[key]] = true;
            setTimeout(() =>{
              let idArr = Object.keys(statusList.clients)
              if(statusList.streamStatus.streamCmd[key] === "CHAT"){
                for(let id in io.sockets.adapter.rooms){
                  if(statusList.clients[String(id)] != undefined && statusList.clients[String(id)].STREAMS[statusList.streamStatus.streamCmd[key]].FROM) io.to(id).emit('streamReqFromServer',"CHAT")
                }
              } else {
                console.log("20210423 debug")
                streamReq(statusList.streamStatus.streamCmd[key], idArr[Math.floor(Math.random() * idArr.length)])
              }
              //streamReq(statusList.streamStatus.streamCmd[key], idArr[Math.floor(Math.random() * idArr.length)])
            },500);
          }
        }
      } else if ((isNaN(Number(cmdStrings)) === false || isNaN(Number(cmdStrings.replace("HZ",""))) === false) && cmdStrings != "") {
        //console.log("cmd: SINEWAVE")
        cmd = sineWave(cmdStrings.replace("HZ",""));
        cmd.target = exportComponent.pickCmdTarget(statusList.clients,cmd)
        if(cmd.property != statusList.clients[cmd.target].cmd.cmd){
          statusList.clients[cmd.target].cmd.cmd = cmd.property
        } else {
          statusList.clients[cmd.target].cmd.cmd = "none"
        }
        statusList.clients[cmd.target].cmd.timestamp = Number(new Date())
        exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList.cmd.target);
      } else {
        io.emit('textFromServer',{
          'text': cmdStrings,
          'alert': alertFlag,
          'timeout': false
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

const micToCmd = (micStrings, socketId) => {
  let cmd = {"cmd": ""};
  for(let key in statusList.cmd.speech){
    if( ~micStrings.indexOf(key)){
      cmd.cmd = statusList.cmd.speech[key]
    }
  }
  let numCmd = micStrings.match(/^([1-9][0-9]*|0)(\.\[0-9 ０-９]+)?$/) //サイン波(~20000）、サンプリング周波数(20000~180000)
  if(numCmd !== null){
    if(Number(numCmd[0]) <= 20000) {
      cmd.cmd = numCmd[0]
    } else if(Number(numCmd[0] <= 180000)) {
      cmd.cmd = "RATE"
      cmd.property = numCmd[0]
    }
  }

  if(cmd.cmd != "") {
    console.log("socket.emit('cmdFromSever'," + String(cmd) + ")")
    switch(cmd.cmd) {
      case "CHAT":
      case "PLAYBACK":
      case "TIMELAPSE":
        if(cmd.cmd in statusList.streamStatus.streamCmd) {
          cmd.target = exportComponent.pickCmdTarget(statusList.clients,cmd)
          if(cmd.target != undefined){
            if(cmd.cmd != statusList.clients[cmd.target].cmd.cmd){
              statusList.clients[cmd.target].cmd.cmd = cmd.cmd
            } else {
              statusList.clients[cmd.target].cmd.cmd = "none"
            }
            statusList.clients[cmd.target].cmd.timestamp = Number(new Date())
            //console.log(statusList.clients[cmd.target].cmd)
            exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"]);
          } 
        } else {
            exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"])
        }
        if(cmd.cmd in statusList.streamStatus.streamCmd){
          //console.log(cmd.cmd + " STREAM start");
          statusList.streamStatus.streamFlag[statusList.streamStatus.streamCmd[cmd.cmd]] = true;
          setTimeout(() =>{
            let idArr = Object.keys(statusList.clients)
            if(statusList.streamStatus.streamCmd[cmd.cmd] === "CHAT"){
              for(let id in io.sockets.adapter.rooms){
                if(statusList.clients[String(id)] != undefined && statusList.clients[String(id)].STREAMS[statusList.streamStatus.streamCmd[cmd.cmd]].FROM) io.to(id).emit('streamReqFromServer',"CHAT")
              }
            } else {
              streamReq(statusList.streamStatus.streamCmd[cmd.cmd], idArr[Math.floor(Math.random() * idArr.length)])
            }
          },500);
        }
        break;
      case "DRUM":
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
        break;
      case "RECORD":
        console.log('videoMode.mode = "record"')
        let idArr = [];
        idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList.clients, cmd["cmd"], "FROM", "dummyID")
        for(let i=0;i<idArr.length;i++){
          io.to(idArr[i]).emit('cmdFromServer', {"cmd":"RECORD"});
        }
        break;
      case "GLITCH":
        Object.keys(statusList.streamStatus.glitch).forEach((stream) => {
          statusList.streamStatus.glitch[stream] = !statusList.streamStatus.glitch[stream]
        })
        let gltch = "GLITCH"
        if(!statusList.streamStatus.glitch.CHAT) gltch = "NOT GLITCH"
        io.emit('textFromServer',{
          "text": gltch,
          "alert": false,
          "timeout": true
        })
        break;
      case "RANDOM":
        let rdm = "RANDOM"
        if(statusList.streamStatus.emitMode === "NORMAL") {
          statusList.streamStatus.emitMode = "RANDOM"
        } else {
          statusList.streamStatus.emitMode = "NORMAL"
          rdm = "NOT RANDOM"
        }
        io.emit('textFromServer',{
          "text": rdm,
          "alert": false,
          "timeout": true
        })
        break;
      case "SWITCH":
        /*
        if(relay !== null) {
          statusList.cmd.now.SWITCH = !statusList.cmd.now.SWITCH
          if(statusList.cmd.now.SWITCH) {
            relay.on()
            io.emit('textFromServer',{
              "text": "SWITCH ON",
              "alert": false,
              "timeout": true
            })
          } else {
            relay.off()
            io.emit('textFromServer',{
              "text": "SWITCH OFF",
              "alert": false,
              "timeout": true
            })
          }
        }
        */
        break;
      case "LOOP":
        io.emit("stringsFromServer", "");
        let loopArr = Object.keys(io.sockets.adapter.rooms);
        roopArr.forEach((id) =>{
          if(String(id) === Object.keys(statusList.clients)[0]) {
            io.to(id).emit("cmdFromServer",{
              "cmd": "LOOP"
            })
          }
        })
        break;
      case "RATE":
        if(cmd.property === undefined) cmd.property = calcRate(Number(statusList.sampleRate.CHAT))
          for(let key in statusList.streamStatus.streamCmd) {
            statusList.sampleRate[statusList.streamStatus.streamCmd[key]] = cmd.property;
            for(let clientID in statusList.clients){
              statusList.clients[clientID].STREAMS[statusList.streamStatus.streamCmd[key]].RATE = cmd.property
            }
          }
          io.emit('statusFromServer', statusList)
          io.emit('cmdFromServer',{
            cmd: "SAMPLERATE",
            property: 0
          })
        break;
      case "FACEDETECT":
        let cmdProperty = false
        if(statusList.faceDetect) {
          cmdProperty = false
        } else {
          cmdProperty = true
        }
        console.log("statuslist.facedetect: " + String(cmdProperty))
        statusList.faceDetect = cmdProperty
        io.emit("cmdFromServer", {
          "cmd":"FACEDETECT",
          "property": cmdProperty
        });
        break;
      case "VOICE":
        let flag = false
        for(let id in statusList.clients) {
          if(statusList.clients[id].voice) flag =true
        }
        if(flag) {
          Object.keys(statusList.clients).forEach((id)=>{
            Object.keys(io.sockets.adapter.rooms).forEach((sockID)=>{
              if(statusList.clients[id].voice && id === String(sockID)) {
                statusList.clients[id].voice = false
                io.to(sockID).emit('cmdFromServer',{
                  "cmd": "VOICE",
                  "property": false
                })
              }
            })
          })
        } else {
          Object.keys(io.sockets.adapter.rooms).forEach((sockID) =>{
            if(sockID === Object.keys(statusList.clients)[0]){
              statusList.clients[String(sockID)].voice = true
              io.to(sockID).emit('cmdFromServer',{
                "cmd": "VOICE",
                "property": true
              })
            }
          })
        }
        break;
      default:
        cmdFromServer(cmd.cmd, false)
        break;
    }
    if(statusList.cmd.now[cmd.cmd]){
      statusList.cmd.now[cmd.cmd] = false
    } else {
      statusList.cmd.now[cmd.cmd] = true
    }
    strings = ""
    io.emit("stringsFromServer", "")
  } else {
    io.emit('stringsFromServer', micStrings)
  }
}

let cinemaNum = 0
let hlsNum = 0

function splitPlus(cmdArr) {
  cmdArr.forEach((cmd) => {
    cmdFromServer(cmd, false)
  })
}

const charFromClient = (character, charString, socketId, alertFlag) =>{
  if(character === "enter") {
    recordCmd(logFilePath, String(socketId), strings)
    if(charString.includes("+") ) {
      splitPlus(charString.split("+"));
      charString = "";
    } else if(charString === "->CHAT" || charString === "-> CHAT") {
      cmdFromServer("CHAT", false)
      charString = "";
      setTimeout(() => {
        io.emit("cmdFromServer", {cmd: "HLS", property: "stop"})
      },1500)
    } else if((charString === "FTARRI" && hlsNum === 0) || (charString === "MILKBOTTLE" && hlsNum <= 1)) {
      io.to(socketId).emit("cmdFromServer", {cmd: "HLS", property: hlsNum})
      charString = "";
      console.log(hlsNum)
      hlsNum++
      charString = "";
    } else if(charString === "CINEMA" && cinemaNum === 0) {
      console.log("stop tile && valid quantize")
      tile = false
      io.emit('cmdFromServer',{"cmd":"TILE", "property":tile})
      //quantize
      statusList.streamStatus.quantize = true // 20210424 のみの処理、QUANTIZEを止めると同時に有効にする
      io.emit("cmdFromServer",{
        "cmd": "QUANTIZE",
        "quantize": statusList.streamStatus.quantize
      })
      console.log("stop stream")
      for(let stream in statusList.streamStatus.streamFlag) {
        if(statusList.streamStatus.streamFlag[stream]){
          console.log(stream)
          statusList.streamStatus.streamFlag[stream] = false
          io.emit('cmdFromServer',{
            "cmd": "STOP",
            "property": stream
          });
        }
      }
      console.log("cinema hls")
      io.to(socketId).emit("cmdFromServer", {cmd: "CINEMA", property: cinemaNum})
      cinemaNum++
      charString = "";
    } else if((charString === "FTARRI" && hlsNum > 0) || (charString === "MILKBOTTLE" && hlsNum > 1 ) || (charString === "CINEMA" && cinemaNum > 0)) {
      cmdFromServer(charString, false)
      charString = "";
      console.log(cinemaNum)
      /*
    } else if(charString === "HLS") {
      // io.to(socketId).emit("HLSfromServer", "START")
      io.to(socketId).emit("cmdFromServer", {cmd: "HLS", property: "play"})
      charString = "";
    } else if(charString === "HLSSTOP") {
      // io.to(socketId).emit("HLSfromServer", "START")
      io.to(socketId).emit("cmdFromServer", {cmd: "HLS", property: "stop"})
      charString = "";
    } else if(charString === "HLSCHANGE") {
      // io.to(socketId).emit("HLSfromServer", "LOAD")
      charString = "";
      */
    } else if(~charString.indexOf(" ") ) {
      splitSpace(charString, false, socketId);
      charString = "";
    } else if(charString === "VOICE") {
      statusList.clients[String(socketId)].voice = !statusList.clients[String(socketId)].voice
      io.to(socketId).emit("cmdFromServer",{
        "cmd": "VOICE",
        "property": statusList.clients[String(socketId)].voice
      })
      charString = ""
    } else if(charString === "BEAT") {
      io.to(socketId).emit("cmdFromServer",{
        "cmd": "BEAT"
      })
      charString = ""
      /*
    } else if(charString === "3D") {
      io.to(socketId).emit("cmdFromServer",{
        "cmd": "3D"
      });
      */
      charString = ""
    } else if(charString === "LOOP") { //LOOP
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
      io.to(socketId).emit("cmdFromServer",{
        "cmd": "LOOP"
      })
      charString = ""
    } else if(charString === "BROWSER") {
      console.log("BROWSER open")
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
      io.to(socketId).emit("cmdFromServer",{
        "cmd": "BROWSER",
        "property":statusList.ipAddress
      })
      charString = ""
    } else if(charString === "LOCALREC") { //LOOP
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
        io.to(socketId).emit("cmdFromServer",{
          cmd: "RECORD",
          property: "local"
        })
      charString = ""
    } else if(charString === "LOCALPLAY") { //LOOP
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
        io.to(socketId).emit("cmdFromServer",{
          cmd: "PLAYBACK",
          property: "local"
        })
      charString = ""
    } else if(charString === "SPEECH") {
      //speechToCmd()
      /*
      if(!statusList.speech) {
        speechToCmd()
      } else {
        recording.stop()
        recognizeStream.end()
      }
      */
      charString = ""
    } else {
      cmdFromServer(charString, alertFlag)
      charString = ""
    }
  } else if(character === "tab" || character === "right_arrow" || character === "down_arrow") {
    io.emit('erasePrintFromServer', "")
    charString =  "";
  } else if(character === "left_arrow" || character === "backspace") {
    charString = charString.slice(0,-1)
    io.emit('stringsFromServer', charString)
  } else if(character === "escape"){
    stopFromServer();
    recordCmd(logFilePath, String(socketId), "STOP")
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(character === "BASS" || character === "BASS"){
    console.log("io.to(" + socketId + ").emit('cmdFromSever',{'cmd':'BASS','property':'LOW'})")
    io.to(socketId).emit('cmdFromServer',{"cmd":"BASS","property":"LOW"})
    recordCmd(logFilePath, String(socketId), "BASS")
  } else if(character === "BASSS"){
    console.log("io.to(" + socketId + ").emit('cmdFromSever',{'cmd':'BASS','property':'HIGH'})")
    io.to(socketId).emit('cmdFromServer',{"cmd":"BASS","property":"HIGH"})
    recordCmd(logFilePath, String(socketId), "BASS")
  } else if(character === "up_arrow"){
    charString = statusList["cmd"]["prevCmd"];
    exportComponent.roomEmit(io, 'stringsFromServer', charString, statusList["cmd"]["target"]);
    recordCmd(logFilePath, String(socketId), "charString")
  } else if(character != undefined) {
    charString =  charString + character;
    io.emit('stringsFromServer',charString)
    if(character === " ") {
      metronomeBPMCount(socketId);
    } else {
      metronomeArr = []
    }
  }
  return charString
}


let metronomeArr = [];
const metronomeBPMCount = (sourceId) =>{
  switch(metronomeArr.length){
    case 3:
      let interval = (new Date().getTime() - metronomeArr[0])/3
      let bpm = 60000 / interval
      statusList.clients[String(sourceId)].rhythm.bpm = bpm
      statusList.clients[String(sourceId)].rhythm.interval = (60000 * 4) / (statusList.clients[String(sourceId)].rhythm.score.length * bpm)
      console.log('BPM: ' + String(bpm));
      io.emit('cmdFromServer',{
        "cmd": "BPM",
        "property": statusList.clients[String(sourceId)].rhythm.bpm
      });
      recordCmd(logFilePath, String(sourceId), "METRONOME_" + String(statusList.clients[String(sourceId)].rhythm))
      metronomeArr = [];
      strings = ""
      break;
    default:
      metronomeArr.push(new Date().getTime());
      let tapLength = Number(metronomeArr.length)
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
  request.post(postOption, (error, response, body) => {
    response.on('data', (chunk) =>{
 //     console.log(chunk)
    })
  })
}

const textCmd = (strings) => {
  let strArr = strings.replace(",","").split(" ")
  io.emit("textFromServer",{
    "text": strings,
    "alert": false,
    "timeout": false
  })
}

const splitSpace = (strings, alertFlag, socketId) => {
  //console.log('splitSpace = (' + strings + ')')
  let strArr = strings.split(" ");
  if(strArr.length > 3 || strings.split(",").length > 1) {
    textCmd(strings)
  } else {
    switch(strArr[0]) {
      case "VOL":
      case "VOLUME":
      case "GAIN": //UP or DOWN
        for(let id in statusList.clients){
          if(statusList.clients[id].server) postHTTP("GAIN", strArr[1], statusList.clients[id].ipAddress)
        }
        break;
      case "INPUT": //Number set
      case "MIC":
      case "OUTPUT":
      case "SPEAKER":
        if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
          for(let id in statusList.clients){
            if(statusList.clients[id].server) postHTTP(strArr[0], strArr[1], statusList.clients[id].ipAddress)
          }
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
          console.log("io.emit('cmdFromServer', {cmd:'FADE', property:{'type':'" + strArr[1] + "','status':" + statusList.cmd.FADE + "}})")
        } else if(strArr[1] === "OFF" || strArr[1] === "STOP") {
          statusList.cmd.FADE.IN = "0"
          statusList.cmd.FADE.OUT = "0"
          exportComponent.roomEmit(io, 'cmdFromServer',{
            "cmd": "FADE",
            "property": {
              "type" : "OUT",
              "status": statusList.cmd.FADE
            }
          }, statusList.cmd.target)
          console.log("io.emit('cmdFromServer', {cmd:'FADE', property:{'type':'OUT','status':" + statusList.cmd.FADE + "}})")
          exportComponent.roomEmit(io, 'cmdFromServer',{
            "cmd": "FADE",
            "property": {
              "type" : "IN",
              "status": statusList.cmd.FADE
            }
          }, statusList.cmd.target)
          console.log("io.emit('cmdFromServer', {cmd:'FADE', property:{'type':'IN','status':" + statusList.cmd.FADE + "}})")
        } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
          exportComponent.roomEmit(io, 'cmdFromServer',{
            "cmd": "FADE",
            "property": {
              "type" : "val",
              "status": Number(strArr[1])
            }
          }, statusList.cmd.target)
        }
        //console.log("io.emit('cmdFromServer', {cmd:'FADE', property:{'type':'val','status':" + strArr[1] + "}})")
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
        console.log("io.emit('cmdFromServer', {cmd:'PORTAMENT', property:" + strArr[1] + "})")
        break;
      case "BPM":
        //if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
        if(!Number.isNaN(Number(strArr[1])) && strArr[1].length > 0){
          if(strArr.length === 2) {
            if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
              for(let sockID in statusList.clients){
                statusList.clients[sockID].rhythm.bpm = Number(strArr[1])
                statusList.clients[sockID].rhythm.interval = 60000 / Number(strArr[1])
                statusList.clients[sockID].STREAMS.KICK.LATENCY =   statusList.clients[sockID].rhythm.interval /4
                statusList.clients[sockID].STREAMS.SNARE.LATENCY =  statusList.clients[sockID].rhythm.interval /4
                statusList.clients[sockID].STREAMS.HAT.LATENCY =  statusList.clients[sockID].rhythm.interval / 8
                for(let strm in statusList.clients[sockID].STREAMS) {
                  if(Number(statusList.clients[sockID].STREAMS[strm].LATENCY) > 0 && strm != "RECORD" && strm != "DRUM" && strm != "KICK" && strm != "SNARE") {
                    statusList.clients[sockID].STREAMS[strm].LATENCY = statusList.clients[sockID].rhythm.interval / 32
                  }
                }
              }
            }
            io.emit('cmdFromServer', {cmd:"BPM", property:Number(strArr[1])})
            console.log("io.emit('cmdFromServer', {cmd:'BPM', property:" + strArr[1] + "})")
          } else if(strArr.length === 3 && !Number.isNaN(Number(strArr[2])) && strArr[2].length > 0){
            console.log("debuging")
            if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
              console.log("debuging")
              for(let sockID in statusList.clients){
                if(statusList.clients[sockID].No === Number(strArr[1])) {
                  statusList.clients[sockID].rhythm.bpm = Number(strArr[2])
                  statusList.clients[sockID].rhythm.interval = 60000 / Number(strArr[1])
                  statusList.clients[sockID].STREAMS.KICK.LATENCY =   statusList.clients[sockID].rhythm.interval /4
                  statusList.clients[sockID].STREAMS.SNARE.LATENCY =  statusList.clients[sockID].rhythm.interval /4
                  statusList.clients[sockID].STREAMS.HAT.LATENCY =  statusList.clients[sockID].rhythm.interval / 8
                  for(let strm in statusList.clients[sockID].STREAMS) {
                    if(Number(statusList.clients[sockID].STREAMS[strm].LATENCY) > 0 && strm != "RECORD" && strm != "DRUM" && strm != "KICK" && strm != "SNARE") {
                      statusList.clients[sockID].STREAMS[strm].LATENCY = statusList.clients[sockID].rhythm.interval / 32
                    }
                  }
                  Object.keys(io.sockets.adapter.rooms).forEach((id) =>{
                    if(String(id) === sockID) io.to(id).emit('cmdFromServer', {cmd:"BPM", property:Number(strArr[2])})
                  })
                  console.log("io.emit('cmdFromServer', {cmd:'BPM', property:" + strArr[1] + ", to:" + sockID + "})")
                }
              }
            }
          }
        }
      break
      case "UPLOAD":
        let fname = strArr[1]
        if(fname === "TIMETABLE") {
          console.log("TIMETABLE renew");
          timeTable = timeTableRead();
        } else {
          let ss = "00:00:00"
          let t = "00:00:20"
          switch(strArr.length) {
            case 4:
              if(~strArr[3].indexOf(":")) {
                let timeArr = strArr[3].split(":")
                if(timeArr.length === 3){
                  t = strArr[3]
                } else if(timeArr.length === 2) {
                  t = "00:" + strArr[3]
                }
              }
            case 3:
              if(~strArr[2].indexOf(":")) {
                let timeArr = strArr[2].split(":")
                if(timeArr.length === 3){
                  ss = strArr[2]
                } else if(timeArr.length === 2) {
                  ss = "00:" + strArr[2]
                }
              } else if(strArr[2] === "FULL") {
                t = "FULL"
                ss = "FULL"
              }
              break;
            case 2:
              break;
          }
          console.log("upload " + fname)
          //fileImport(fname,libDir,statusImport,ss,t);
          mediaImport(fname,libDir,ss,t);
        }
        io.emit('textFromServer',{
          "text": strArr[0],
          "alert": false,
          "timeout": true
        })
        break;
      case "RECORD":
      case "REC":
        if(Object.keys(statusList.cmd.list).indexOf(strArr[1]) === -1 && movBuff[strArr[1]] === undefined) {
          movBuff[strArr[1]] = {"audio": [], "video":[]}
          statusList.cmd.list[strArr[1]] = strArr[1]
          statusList.streamStatus.latency[strArr[1]] = "0"
          statusList.streamStatus.glitch[strArr[1]] = false
          statusList.streamStatus.streamFlag[strArr[1]] = false
          statusList.streamStatus.streamCmd[strArr[1]] = strArr[1]
          if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
            Object.keys(statusList.clients).forEach((id,index,arr)=>{
              statusList.clients[id].STREAMS[strArr[1]] = {"TO":true, "arr":0, "LATENCY": 0, RATE:44100}
            })
          }
          //if(videoBuff[strArr[1]] === undefined) videoBuff[strArr[1]] = []
          io.emit('streamListFromServer', statusList["streamStatus"]["streamCmd"]);
        }
        Object.keys(io.sockets.adapter.rooms).forEach((id,index,arr)=>{
          if(statusList.clients[String(id)] != undefined && statusList.clients[String(id)].STREAMS.RECORD.FROM) io.to(id).emit('cmdFromServer',{"cmd":"RECORD", "property":strArr[1]})
        })
        console.log("RECORD as " + strArr[1])
        break
      case "CLEAR":
        if(Object.keys(statusList.streamStatus.streamCmd).indexOf(strArr[1]) != 1 && movBuff[strArr[1]] === undefined && strArr[1] != CHAT) {
          movBuff[strArr[1]] = {"audio":[], "video":[]}
        }
        break
      case "LATENCY":
        if(strArr[0] === "LATENCY" && strArr[1] in statusList["cmd"]["streamFlag"]) {
          let latencyVal = 0;
          if(strArr.length > 2){
            if(isNaN(Number(strArr[2])) === false && strArr[2] != "") latencyVal = String(Number(strArr[2]) * 1000);
          } else {
            if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
              for(let id in statusList["clients"]){
                if(latencyVal < Number(statusList["clients"][id]["STREAMS"][strArr[1]]["LATENCY"])) latencyVal = Number(statusList["clients"][id]["STREAMS"][strArr[1]]["LATENCY"]);
              }
            }
            if(latencyVal + 500 > 10000) {
              latencyVal = 0;
            } else {
              latencyVal = latencyVal + 500;
            }
            latencyVal = String(latencyVal);
          }
          if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
            for(let key in statusList["clients"]){
              statusList["clients"][key]["STREAMS"][strArr[1]]["LATENCY"] = latencyVal;
            }
          }
        }
        io.emit('textFromServer',{
          "text": strArr[0],
          "alert": false,
          "timeout": true
        })
        break;
      case "RATE":
      case "SAMPLERATE":
        let targetStream = statusList.streamStatus.streamCmd[strArr[1]]
        if(targetStream != undefined){
          let rtnRate = "";
          let targetStream = statusList["streamStatus"]["streamCmd"];
          if(strArr.length === 2){
            rtnRate = calcRate(Number(statusList.sampleRate[strArr[1]]))
          } else if(strArr.length === 3 ) {
            if(isNaN(Number(strArr[2])) === false && strArr[2] != "") {
              rtnRate = Number(strArr[2])
            } else if(strArr[2] === "RANDOM"){
              rtnRate = "RANDOM"
            }
          }
          statusList["sampleRate"][strArr[1]] = rtnRate;
          if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
            for(let clientID in statusList["clients"]){
              for(let str in statusList["clients"][clientID].STREAMS){
                if(String(str) === String(statusList.streamStatus.streamCmd[strArr[1]])){
                  statusList["clients"][clientID].STREAMS[str].RATE = rtnRate;
                }
              }
            }
          }
          io.emit('statusFromServer', statusList)
          io.emit('cmdFromServer',{
            cmd: "SAMPLERATE",
            property: 0
          })
          console.log(strArr[1] + " SAMPLERATE: " + String(rtnRate))
        } else if(strArr[1] === "DRUM") {
          let rtnRate = "";
          let targetStream = statusList["streamStatus"]["streamCmd"];
          rtnRate = calcRate(Number(statusList.sampleRate.KICK))
          statusList.sampleRate.KICK = rtnRate;
          statusList.sampleRate.SNARE = rtnRate;
          statusList.sampleRate.HAT = rtnRate;
          if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
            for(let clientID in statusList["clients"]){
              for(let str in statusList["clients"][clientID].STREAMS){
                statusList["clients"][clientID].STREAMS.KICK.RATE = rtnRate;
                statusList["clients"][clientID].STREAMS.SNARE.RATE = rtnRate;
                statusList["clients"][clientID].STREAMS.HAT.RATE = rtnRate;
              }
            }
          }
          io.emit('statusFromServer', statusList)
          io.emit('textFromServer',{
            "text": "SAMPLE RATE(" + String(statusList.streamStatus.streamCmd[strArr[1]])+"):"+String(rtnRate) + "Hz",
            "alert": false,
            "timeout": true
          })
          console.log(strArr[1] + " SAMPLERATE: " + String(rtnRate))
        } else if(isNaN(Number(strArr[1])) === false && strArr[1] != "") {
          let rtnRate = strArr[1]
          for (let key in statusList.sampleRate){
            statusList.sampleRate[key] = rtnRate;
            if(statusList.clients !== undefined && Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
              //console.log(statusList.clients)
              for(let clientID in statusList.clients){
                //console.log(clientID)
                //console.log(statusList.clients[clientID])
                if(statusList.clients[clientID].STREAMS[key] !== undefined) statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
              }
            }
          }
          io.emit('cmdFromServer', {
            cmd:"SAMPLERATE",
            property:Number(rtnRate)
          })
          console.log("SAMPLERATE: " + String(rtnRate))
        } else if(strArr[1] === "RANDOM") {
          let rtnRate = "RANDOM"
          for (let key in statusList["sampleRate"]){
            statusList["sampleRate"][key] = rtnRate;
            if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
              for(let clientID in statusList.clients){
                  statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
              }
            }
          }
          console.log("SAMPLERATE: RANDOM")
        }
        break;
      case "ALL":
        let targetStrm = statusList.streamStatus.streamCmd[strArr[1]]
        let targetCmd = cmdSelect(strArr[1])
        if(targetStrm != undefined){
          if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
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
        } else if(targetCmd != false) {
          io.emit('cmdFromServer', targetCmd)
          console.log("io.emit('cmdFromSever'," + String(targetCmd) + ")")
        } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
          io.emit('cmdFromServer', {"cmd": "SINEWAVE", "property": strArr[1]})
          console.log("io.emit('cmdFromSever',{cmd:'SINEWAVE', property:'" + strArr[1] + "'})")
        }
        break
      case "GLITCH":
        if(statusList.streamStatus.streamCmd[strArr[1]] != undefined){
          statusList.streamStatus.glitch[statusList.streamStatus.streamCmd[strArr[1]]] = !statusList.streamStatus.glitch[statusList.streamStatus.streamCmd[strArr[1]]]
          let str = statusList.streamStatus.streamCmd[strArr[1]] + ": "
          if(!statusList.streamStatus.glitch[statusList.streamStatus.streamCmd[strArr[1]]]){
            str = str + "NOT "
            statusList.streamStatus.glitch[strArr[1]] = false
          } else {
            statusList.streamStatus.glitch[strArr[1]] = true
          }
          str = str + "GLITCH"
          //console.log(str)
          exportComponent.roomEmit(io, 'textFromServer', {"text":str, "alert":false}, statusList["cmd"]["target"]);
          /*
          io.emit("textFromServer", {
            "text": str,
            "alert": false,
            "timeout": true
          });
          */
        }
        break;
      case "GRID":
        if(statusList.streamStatus.streamCmd[strArr[1]] != undefined){
          let strm = statusList.streamStatus.streamCmd[strArr[1]]
          let str = strm + ": "
          if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
            for(let id in statusList.clients){
              //console.log(strm)
              //console.log(statusList.clients[id].STREAMS[strm].LATENCY)
              if(statusList.clients[id].STREAMS[strm].LATENCY > 0){
              //console.log(strm)
                statusList.clients[id].STREAMS[strm].LATENCY = 0
                str = str + "NOT "
              } else {
                statusList.clients[id].STREAMS[strm].LATENCY = statusList.clients[id].rhythm.interval / 32
              }
              //console.log(statusList.clients[id].STREAMS[strm])
            }
          }
          str = str + "GRID"
          //console.log(str)
          io.emit("textFromServer", {
            "text": str,
            "alert": false,
            "timeout": true
          });
        }
        break
      case "STOP":
      case "OFF":
        if(Object.keys(statusList.cmd.list).includes(strArr[1])){
          if(Object.keys(statusList.streamStatus.streamCmd).includes(strArr[1])) {
            statusList.streamStatus.streamFlag[statusList.streamStatus.streamCmd[strArr[1]]] = false
          }
            // 全端末の該当コマンドを停止する
            // stopにPropertyをつけて送信する
            io.emit('cmdFromServer',{
              "cmd": "STOP",
              "property": statusList.cmd.list[strArr[1]]
            });
        } else {
          switch(strArr[1]) {
            case "DRUM":
              statusList.streamStatus.streamFlag.KICK = false
              statusList.streamStatus.streamFlag.SNARE = false
              statusList.streamStatus.streamFlag.HAT = false
            io.emit('cmdFromServer',{
              "cmd": "STOP",
              "property": statusList.cmd.list[strArr[1]]
            });
              break;
            case "CLICK":
            case "METRONOME":
              io.emit('cmdFromServer',{
                "cmd": "METRONOME",
                "property": "STOP"
              });
              break;
            case "STREAM":
              console.log("stop tile && valid quantize")
              tile = false
              io.emit('cmdFromServer',{"cmd":"TILE", "property":tile})
              //quantize
              statusList.streamStatus.quantize = true // 20210424 のみの処理、QUANTIZEを止めると同時に有効にする
              io.emit("cmdFromServer",{
                "cmd": "QUANTIZE",
                "quantize": statusList.streamStatus.quantize
              })
              console.log("stop stream")
              for(let stream in statusList.streamStatus.streamFlag) {
                if(statusList.streamStatus.streamFlag[stream]){
                  console.log(stream)
                  statusList.streamStatus.streamFlag[stream] = false
                  io.emit('cmdFromServer',{
                    "cmd": "STOP",
                    "property": stream
                  });
                }
              }
              break;
            case "CINEMA":
            case "HLS":
              io.emit('cmdFromServer', {
                cmd: "HLS",
                property: "stop"
              })
              break;
            default:
              if(Object.keys(statusList.cmd.list).includes(strArr[1])) {
                io.emit('cmdFromServer', {
                  cmd: "STOP",
                  property: statusList.cmd.list[strArr[1]]
                })
              }
              break;
          }
          /*
          if(strArr[1] === "DRUM") {
          } else if(strArr[1] === "CLICK" || strArr[1] === "METRONOME") {
            io.emit('cmdFromServer',{
              "cmd": "METRONOME",
              "property": "STOP"
            });
            console.log("io.emit('cmdFromSever',{cmd:'METRONOME', property:'STOP'})")
          } else if(strArr[1] === "STREAM") {
            for(let stream in statusList.streamStatus.streamCmd) {
              io.emit('cmdFromServer', {
                cmd: "STOP",
                property: stream
              })
            }
          } else {
            if(Object.keys(statusList.cmd.list).includes(strArr[1])) {
              io.emit('cmdFromServer', {
                cmd: "STOP",
                property: statusList.cmd.list[strArr[1]]
              })
            }
          }
          */
        }
        /*
        for(let key in statusList["streamStatus"]["streamCmd"]){
          if(strArr[1] === key){
            statusList.streamStatus.streamFlag[statusList.streamStatus.streamCmd[key]] = false
          }
        }
        if(strArr[1] === "DRUM"){
          statusList.streamStatus.streamFlag.KICK = false
          statusList.streamStatus.streamFlag.SNARE = false
          statusList.streamStatus.streamFlag.HAT = false
        }
        if(strArr[1] === "CLICK" || strArr[1] === "METRONOME") {
          io.emit('cmdFromServer',{
            "cmd": "METRONOME",
            "property": "STOP"
          });
          console.log("io.emit('cmdFromSever',{cmd:'METRONOME', property:'STOP'})")
        }
        */
        break;
      case "FACE":
        if(strArr[1] === "DETECT") {
          let cmdProperty = false
          if(statusList.faceDetect) {
            cmdProperty = false
          } else {
            cmdProperty = true
          }
          console.log("statuslist.facedetect: " + String(cmdProperty))
          statusList.faceDetect = cmdProperty
          io.emit("cmdFromServer", {
            "cmd":"FACEDETECT",
            "property": cmdProperty
          });
          console.log("io.emit('cmdFromSever',{cmd:'FACE DETECT', property:"+cmdProperty+"})")
        }
        break;
      case "SWITCH":
        if(strArr[1] === "ON"){
          request.get({url: 'http://192.168.0.128/2/on',json:true}, function (error, response, body) {})
        } else if(strArr[1] === "OFF") {
          request.get({url: 'http://192.168.0.128/2/off',json:true}, function (error, response, body) {})
        }
        /*
        if(strArr[1] === "ON") {
          if(relay !== null && !statusList.cmd.now.SWITCH) {
            relay.on()
          }
        } else if(relay !== null && strArr[1] === "OFF") {
          if(statusList.cmd.now.SWITCH) {
            relay.off()
          }
        }
        */
        io.emit('textFromServer',{
          "text": strings,
          "alert": false,
          "timeout": true
        })
        break;
      case "VOICE":
        let flag = false
        let lang = ""
        switch(strArr[1]){
          case "JP":
          case "JA":
          case "JAPANESE":
            lang = "ja-JP"
            io.emit('cmdFromServer', {
              "cmd": "VOICE",
              "property": lang
            })
//            console.log("io.to(" + sockID + ").emit('cmdFromSever',{cmd:'VOICE', property:"+lang+"})")
            break;
          case "EN":
          case "ENGLISH":
            lang = 'en-US'
//            console.log("io.to(" + sockID + ").emit('cmdFromSever',{cmd:'VOICE', property:"+lang+"})")
            io.emit('cmdFromServer', {
              "cmd": "VOICE",
              "property": lang
            })
            break;
          case "ON":
            flag = true
          case "OFF":
            for(let id in statusList.client) {
              if(statusList.client[id].voice !== flag) {
                statusList.cilent[id].voice = flag
                Object.keys(io.sockets.adapter.rooms).forEach((sockID)=>{
                  if(String(sockID) === id) {
                    console.log("io.to(" + sockID + ").emit('cmdFromSever',{cmd:'VOICE', property:"+flag+"})")
                    io.to(sockID).emit('cmdFromServer',{
                      "cmd": "VOICE",
                      "property": flag
                    })
                  }
                })
              }
            }
          break;
        }
        break;
      case "PAN":
        console.log('io.to('+String(socketId) + ').emit("cmdFromServer","PAN"_____')
        // Object.keys(io.sockets.adapter.rooms).forEach((id) => {
          // if(String(socketId) === String(id)){
            io.to(socketId).emit('cmdFromServer', {
              cmd:'PAN',
              property: strArr[1]
            })
          // }
        // })
        break;
      case "->":
        if(strArr[1] in statusList.streamStatus.streamCmd) {
          statusList.streamStatus.cutup = strArr[1];
        }
        break;
      case "SETINTERVAL":
        console.log("dg");
        if(strArr[1] == "SWITCH" && isFinite(Number(strArr[2]))) {
          console.log("d???g");
          if(relay !== null) {
            switchInterval = setInterval(() => {
              console.log("degug");
              relay.on()
              io.emit('textFromServer',{
                "text": "SWITCH ON",
                "alert": false,
                "timeout": true
              })
              setTimeout(()=>{
                relay.off()
                io.emit('textFromServer',{
                  "text": "SWITCH OFF",
                  "alert": false,
                  "timeout": true
                })
              },Number(strArr[2]) * 500);
            }, Number(strArr[2]) * 1000);
          } else {
            console.log("relay is not connected");
          }
        }
        break;
      default:
        Object.keys(io.sockets.adapter.rooms).forEach((value,index,arr)=>{
          let targetRoom = strArr[0].toLowerCase();
          //console.log(value);
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
        if(isNaN(Number(strArr[0])) === false && strArr[0] != ""){ //sine wave or stream routing
          if(strArr.length === 2) {
            let json = false;
            let cmd = cmdSelect(strArr[1]);
            let Id = targetNoSelect(Number(strArr[0]));
            /*
            if(strArr[1] === "PLAYBACK") {
              io.to(Id).emit("cmdFromServer", {cmd:"PLAYBACK",property:"local"})
            } else if(strArr[1] === "RECORD") {
              io.to(Id).emit("cmdFromServer", {cmd:"RECORD",property:"local"})
            }
            */
            if(cmd){
              if(cmd.cmd === "RECORD"){
                if(status.clients[Id] != undefined && statusList.clients[Id].STREAMS.RECORD.FROM) json = cmd
              } else {
                json = cmd;
              }
            } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
              json = sineWave(strArr[1]);
            }
            //console.log(String(Id) + " cmd:" + cmd.cmd)
            for(let key in statusList.streamStatus.streamCmd){
              if(key === strArr[1]) {
                //console.log(strArr[1])
                //console.log(Id)
                json.cmd = statusList.streamStatus.streamCmd[strArr[1]]
                if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
                  for (let sockID in statusList.clients){ let flag = false
                    if(String(Id) === sockID) {
                      flag = true
                    }
                    switch(json.cmd) {
                      case "DRUM":
                        ["KICK","SNARE","HAT"].forEach((e)=>{

                          statusList.clients[sockID].STREAMS[e].TO = flag
                          statusList.streamStatus.streamFlag[e] = true
                          setTimeout(()=>{
                            streamReq(e, String(Id))
                          },800)
                        })
                        break
                      case "CHAT":
                        statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].FROM = flag
                        statusList.clients[sockID].STREAMS[statusList.cmd.stream[strArr[1]]].TO = flag
                        statusList.streamStatus.streamFlag.CHAT = true
                        setTimeout(()=>{
                          io.to(Id).emit('streamReqFromServer',"CHAT")
                        },800)
                      default:
                        statusList.clients[sockID].STREAMS[statusList.streamStatus.streamCmd[strArr[1]]].TO = flag
                        
                        statusList.streamStatus.streamFlag[json.cmd] = true
                        setTimeout(()=>{
                          streamReq(json.cmd, String(Id))
                        },800)
                    }
                  }
                }
              }
            }
            if(json && Id){
              let flag = true;
              for(let key in statusList.streamStatus.streamCmd){
                if(cmd === key){
                  flag = false;
                }
              }
              if(flag){
                io.emit("statusViewFromServer");
                io.to(Id).emit("cmdFromServer", json);
              }
            }
          } else if(strArr[strArr.length - 1] === "CHAT") {
            let targetArr = []
            if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
              for(let id in statusList.clients){
                statusList.clients[id].STREAMS[statusList.cmd.stream[strArr[strArr.length - 1]]].FROM = false
                statusList.clients[id].STREAMS[statusList.cmd.stream[strArr[strArr.length - 1]]].TO = false
              }
            }
            for(let i=0;i<(strArr.length - 1);i++){
              //console.log(i)
              if(isNaN(Number(strArr[i])) === false && strArr[i] != ""){
                let targetID = targetNoSelect(Number(strArr[i]))
                //console.log(targetID)
                if(targetID) {
                  if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
                    for(let id in statusList.clients) {
                      if(id === targetID){
                        statusList.clients[id].STREAMS[statusList.cmd.stream[strArr[strArr.length - 1]]].FROM = true
                        statusList.clients[id].STREAMS[statusList.cmd.stream[strArr[strArr.length - 1]]].TO = true
                        //console.log(statusList.clients[id].STREAMS[statusList.cmd.stream[strArr[strArr.length - 1]]])
                        targetArr.push(id)
                      }
                    }
                  }
                }
              }
            }
            statusList.streamStatus.streamFlag.CHAT = true
            io.emit("cmdFromServer", {cmd:"CHAT"});
              setTimeout(()=>{
                for(let id in io.sockets.adapter.rooms){
                  for(let i=0;i<targetArr.length;i++){
                    if(String(id) === targetArr[i]){
   //                   console.log(id)
   //                   console.log(strArr[strArr.length - 1])
                      io.to(id).emit('streamReqFromServer', strArr[strArr.length - 1]);
                    }
                  }
                }
              },800)
            //}
          } else if(strArr[1] === "INPUT" || strArr[1] === "MIC" || strArr[1] === "OUTPUT" || strArr[1] === "SPEAKER" && (isNaN(Number(strArr[2])) === false && strArr[2] != "")){
            let targetAddress = "0.0.0.0"
            if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
              for(let id in statusList.clients){
                if(Number(strArr[0]) === statusList.clients[id].No) {
                  targetAddress = statusList.clients[id].ipAddress
                  if(targetAddress != "0.0.0.0"){
                    if(statusList.clients[id].server) postHTTP(strArr[1], Number(strArr[2]), targetAddress)
                  }
                }
              }
            }
          } else if((strArr[1] === "RATE" || strArr[1] === "SAMPLERATE") && (isNaN(Number(strArr[2])) === false && strArr[2] != "")) {
            let id = targetNoSelect(Number(strArr[0]))
            io.to(id).emit("cmdFromServer",{
              cmd:"SAMPLERATE",
              property:Number(strArr[2])
            })
          }
        } else if(~strArr[0].indexOf(":")) { //timestamp
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
            //console.log(timeArr)
            if(formatFlag && timeArr.length === 3){
             timerVal = Date.parse(today +"T" + strArr[0] + "+09:00") - Date.now()
            } else if(formatFlag && timeArr.length === 2){
             timerVal = Date.parse(today +"T" + strArr[0] + ":00+09:00") - Date.now()
            }
            //console.log(today+ "T" + strArr)
            //console.log(formatFlag)
            //console.log(timerVal)
            
            io.emit("textFromServer", {
              "text": "SCHEDULED " + String(timerVal) + " LATER",
              "alert": false,
              "timeout": true
            })
            console.log("SCHEDULED IN " + String(timerVal) + " later")
            if(timerVal>0){
              setTimeout(()=>{
                let idArr = Object.keys(io.sockets.adapter.rooms)
                let randomId = idArr[Math.floor(Math.random() * idArr.length)]
                let cmdString
                console.log(strArr)
                if(strArr[1] === "INSTRUCTION" && strArr.length === 3) {
                  console.log("INSTRUCTION: " + strArr[2])
                  io.emit("cmdFromServer", {
                    "cmd": "INSTRUCTION",
                    "property": strArr[2]
                  })
                } else if(strArr.length > 2){
                  cmdString = strArr.slice(1).join(" ")
                //  console.log(cmdString)
                  charFromClient("enter",cmdString,randomId, true) //enterを送ったのと同義にしている
                } else {
                  cmdString = strArr[1]
                //  console.log(cmdString)
                  charFromClient("enter",cmdString,randomId, true) //enterを送ったのと同義にしている
                }
              },timerVal)
            }
            setTimeout(()=>{
              io.emit('textFromServer', {
                "text": "",
                "alert": false,
                "timeout": true
              })
            },500)
        } else {
          /*
          strArr.forEach((value,index) => { //command by text
            console.log(value)
            let idArr = Object.keys(io.sockets.adapter.rooms)
            let randomId = idArr[Math.floor(Math.random() * idArr.length)]
            charFromClient(13,value,randomId, true) //enterを送ったのと同義にしている
          })
          */
          io.emit('textFromServer',{
            "text": strArr.join(" "),
            "alert": alertFlag,
            "timeout": true
          });
        }
      break;
    }
  }
}

let timeLapseLength = 0;

const streamReq = (target, sockID) => {
  //console.log(sockID)
  //console.log(target)
  if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy" && String(sockID) in statusList.clients){
  //console.log(statusList.clients[String(sockID)].STREAMS[target])
    //if(!streamStatus.cutup && statusList["streamStatus"]["streamFlag"][target]){
    if(statusList.streamStatus.cutup != false) {
      statusList.streamStatus.streamFlag[target] = false;
      statusList.streamStatus.streamFlag[statusList.streamStatus.cutup] = true;
      target = statusList.streamStatus.cutup;
      statusList.streamStatus.cutup = false;
    }
    if(statusList["streamStatus"]["streamFlag"][target]){
      if(sockID in statusList.clients){
        // console.log(sockID);
        // console.log(target);
        // console.log(statusList.clients[sockID].STREAMS[target].LATENCY);
        setTimeout(()=>{
          let idArr = [];
          let targetID = ""
          //if(statusList["streamStatus"]["streamFlag"][target]){
            switch(target){
              case "CHAT":
                idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList.clients, target, "FROM", sockID);
                targetID = idArr[Math.floor(Math.random() * idArr.length)]
                io.to(targetID).emit('streamReqFromServer', "CHAT");
                break;
              default: //PLAYBACK,TIMELAPSE,DRUM,SILENCEも含む  //1008はTimelapseは含まず
                idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO", "dummyID");
                //console.log(idArr)
                if(idArr.length > 0){
                  let json = {}
                  if(statusList.streamStatus.emitMode != "RANDOM"){
                    json.audio = movBuff[target].audio.shift()
                    movBuff[target].audio.push(json.audio)
                    // json.audio = movBuff[target].audio[movBuff[target].index]
                    // let buffEnd = movBuff[target].audio.length
                    if(movBuff[target].video != undefined) {
                      // json.video = movBuff[target].video[movBuff[target].index]
                      // if(movBuff[target].video.length < buffEnd) buffEnd = movBuff[target].video.length
                      json.video = movBuff[target].video.shift()
                      movBuff[target].video.push(json.video)
                    }
                    // movBuff[target].index++
                    // if(movBuff[target].index >= buffEnd) movBuff[target].index = 0
                  } else {
                    let randomNum = Math.floor(Math.random() * movBuff[target].audio.length)
                    json.audio = movBuff[target].audio[randomNum]
                    if(movBuff[target].video != undefined) json.video = movBuff[target].video[Math.floor(Math.random() * movBuff[target].video.length)]
                    /*if(movBuff[target].video != undefined && movBuff[target].video.length > randomNum) {
                      json.video = movBuff[target].video[randomNum]
                    }*/
                  }
                  json.target = target
                  json.glitch = false
                  targetID = idArr[Math.floor(Math.random() * idArr.length)];
                  if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
                    if(statusList.clients[String(targetID)].STREAMS[target].RATE != "RANDOM") {
                      json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][target]["RATE"]);
                    } else {
                      json["sampleRate"] = Math.ceil(Math.random() * 8) * 11025
                    }
                  }
                  if(statusList.streamStatus.glitch[target] && target != "DRUM") {
                    json = exportComponent.glitchStream(json)
                    json.glitch = true
                  }
                  if(target === "CHAT") {
                    json.source = sockID
                  } else {
                    json.source = target
                  }
                  console.log("debug chunkFromServer to " + targetID + ": " + json.source)
                  io.to(targetID).emit('chunkFromServer', json);
                  //console.log("io.to(" + targetID + ").emit('chunkFromServer', " + json + ")")
                }
          }
          setTimeout(() => {
            if(statusList.streamStatus.streamFlag && !(targetID in statusList.clients) && Object.keys(statusList.clients).length > 0) {
              streamReq(target,sockID)
              //console.log("streamreq timer streamreq again")
            } 
          },5000)
        },Number(statusList.clients[sockID].STREAMS[target].LATENCY) * Math.pow(2,(Math.floor(Math.random() * 6))))
      }
    }
  }
}

const chunkFromClient = (data, sourceId) => {
  if(data.target === "CHAT") {
    if(data.audio != "" && data.video != "") {
      movBuff.CHAT.push({"id":sourceId, "audio": data.audio, "video": data.video})
    }
  } else {
    if(data.target && data.audio != "" && data.video != ""){
      movBuff[data.target].audio.push(data.audio)
      movBuff[data.target].video.push(data.video)
      movBuff[data.target].index = movBuff[data.target].audio.length
      console.log(data.target + "length: " + String(movBuff[data.target].index))
      // console.log(data.target + "length: " + String(movBuff[data.target].video.length))
    }
  }
  let sampleRate = "44100"
  if(sourceId in statusList.clients) sampleRate = String(statusList["clients"][sourceId]["STREAMS"]["CHAT"]["RATE"]);
  if(sampleRate === "RANDOM") {
    sampleRate = String(Math.ceil(Math.random() * 8) * 12000)
  }
  if(statusList.streamStatus.streamFlag.CHAT){
  // if(!statusList.streamStatus.record && statusList.streamStatus.streamFlag.CHAT){
    let json = {}
    if(movBuff.CHAT.length > 1){ // 20210420試し
      if(!statusList.streamStatus.chatSequence){
        json = movBuff.CHAT.shift()
        console.log("debug length")
        console.log(movBuff.CHAT.length)
      } else {
        movBuff.CHAT.some((element, index)=>{
          if(element.id === sourceId){
            json = element
            movBuff.splice(index,1)
            return true
          }
        })
      }
    } else if(movBuff.CHAT.length > 0) { //20210420試し
      json = movBuff.CHAT[0]
    }
    if(json !== {}){
      let idArr = []
      idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], "CHAT", "TO", sourceId)
      if(idArr.length > 0){
        let clientRate = false;
        idArr.forEach((element, index) => {
          if(String(element) in statusList.clients && statusList.clients[String(element)].STREAMS.CHAT.RATE != Number(statusList.sampleRate.CHAT)) clientRate = true
        })
        json.target = "CHAT";
        json.glitch = false
        json.sampleRate = sampleRate;
        json.source = sourceId
        if(statusList.streamStatus.glitch.CHAT) json = exportComponent.glitchStream(json);
        let targetID = idArr[Math.floor(Math.random() * idArr.length)];
        if(clientRate){
          if(statusList.clients[targetID] != undefined) json.sampleRate = statusList.clients[targetID].STREAMS.CHAT.RATE
          if(json.sampleRate === "RANDOM") json.sampleRate = String(Math.ceil(Math.random() * 8) * 12000)
        }
        io.to(targetID).emit('chunkFromServer', json);
        console.log("for debug; io.to(" + targetID + ").emit('chunkFromServer', " + json + ")")
        if(statusList.clients[String(targetID)] != undefined) statusList["clients"][String(targetID)]["STREAMS"]["CHAT"]["ACK"] = false;
      } else {
        statusList["streamStatus"]["waitCHAT"] = true;
      }
    } else {
      console.log("test")
    }
  }
}


const stopFromServer = () => { 
  console.log("io.emit('cmdFromSever', {'cmd':'STOP'})")
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
  for(let key in statusList.streamStatus.streamFlag){
    statusList.streamStatus.streamFlag[key] = false;
    //statusList.streamStatus.timer[key] = false
  }
  if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy"){
    for(let id in statusList.clients){
      statusList.clients[id].cmd.cmd = "none"
      statusList.clients[id].cmd.timestamp = 0
    }
  }
  movBuff.CHAT = []
  //statusList.faceDetect = false
  //io.
  /*
  audioBuff["CHAT"] = [];
  videoBuff["CHAT"] = [];
  */
  io.to("ctrl").emit('statusFromServer', statusList);
  clearInterval(switchInterval);
  strings = "";
}

const cmdSelect = (strings) => {
  let cmd = false;
  for(let key in statusList["cmd"]["list"]){
    if(strings === key){
      cmd = {"cmd": statusList["cmd"]["list"][key]};
      cmd.overlay = true
      if(statusList["cmd"]["now"][cmd["cmd"]]){
        statusList["cmd"]["now"][cmd["cmd"]] = false
      } else {
        statusList["cmd"]["now"][cmd["cmd"]] = true
      }
    }
  }
  return cmd;
}

const sineWave = (strings) => {
  let json = {"cmd": "SINEWAVE", "property": Number(strings)};
  json.overlay = true
  if(strings === statusList["cmd"]["now"]["SINEWAVE"]){
    statusList["cmd"]["now"]["SINEWAVE"] = false;
  } else {
    statusList["cmd"]["now"]["SINEWAVE"] = strings;
  }
  return json;
  //console.log(statusList["clients"]);
}

const targetNoSelect = (i) =>{
  let j = 0;
  let rtnId = false;
  for(let key in io.sockets.adapter.nsp.sockets){
    if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
      for(let clientId in statusList["clients"]){
        if(statusList["clients"][clientId]["No"] === i && String(key) === clientId){
          rtnId = key;
        }
      }
    }
  }
  return rtnId;
}
/*
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
  exec(sndConvert,(error,stdout,stderr) =>{
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
    }
  });
}
*/

const fileImport = (filename, libDir, callback, ss, t) =>{
  fs.readdir(process.env.HOME + libDir, function(err, files){
    if (err) throw err;
    //console.log(files);
    files.map((f) =>{
      if( ~f.indexOf(filename)){
        /*
        audioBuff[filename] = [];
        videoBuff[filename] = [];
        */
        if(!(filename in movBuff)) {
          movBuff[filename] = {"audio":[],"video":[],"index":0}
        }
        //console.log(f);
        //console.log(process.env.HOME + libDir + f)
        let fnameArr = f.split(".");
        switch(fnameArr[1]) {
          case "mov":
          case "MOV":
          case "mp4":
          case "MP4":
          case "webm":
            videoImport(fnameArr[0],fnameArr[1],libDir,ss,t);
//            Promise.resolve().then(videoImport(fnameArr[0],fnameArr[1],libDir)).then(audioConvert(fnameArr[0], fnameArr[1], libDir)).then(imgConvert(fnameArr[0],fnameArr[1],libDir)).then(rmFiles(fnameArr[0],"aac",libDir))
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
            audioConvert(fnameArr[0], fnameArr[1], libDir, false, ss, t);
            break;
        }
        callback(filename);
      }
    })
  });

}
const videoImport = (filename, filetype, libDir, ss, t) =>{
//  return new Promise((resolve, reject) => {
    let sndConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -ss ' + ss + ' -t ' + t + ' -vn -acodec copy ' + process.env.HOME + libDir + filename + '.aac';
    if(ss === "FULL" && t === "FULL") {
      sndConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -vn -acodec copy ' + process.env.HOME + libDir + filename + '.aac';
     }
    //let sndConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -vn -acodec copy ' + process.env.HOME + libDir + filename + '.aac';
    console.log(sndConvert);
    exec(sndConvert,(error, stderr, stdout) =>{
      if(stdout){
        //console.log('stdout: ' + stdout);
 //       resolve()
        audioConvert(filename, "aac", libDir, true);
        imgConvert(filename, filetype, libDir, ss, t);
      }
      if(stderr){
        console.log('stderr: ' + stderr);
      }
      if (error !== null) {
        console.log('Exec error: ' + error);
      }
    });
  //})
}

const imgConvert = (filename, filetype, libDir, ss, t) =>{
  let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -ss ' + ss + ' -t ' + t + ' -r 5.4 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
  if(ss === "FULL" && t === "FULL") {
    imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype +  ' -r 5.4 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
  }
  //let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + '-r 5 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
  console.log(imgConvert);
  exec(imgConvert,(err,stderr,stdout)=>{
    if(stdout){
  //    console.log('stdout: ' + stdout);
      //resolve()
      let rtnArr = []
      fs.readdir(process.env.HOME + libDir, function(err, files){
          if (err) throw err;
          //console.log(files);
          files.map((f) =>{
            if( ~f.indexOf(".jpg")){
              console.log(process.env.HOME + libDir + f)
              let img = fs.readFileSync(process.env.HOME + libDir + f)
              let base64str = new Buffer(img).toString('base64')
              //fs.writeFileSync(file, bitmap);
              //console.log('data:image/jpeg;base64,' + base64str)
              movBuff[filename].video.push('data:image/jpeg;base64,' + base64str)
              let rmExec = 'rm ' + process.env.HOME + libDir + f;
              exec(rmExec,(err,stderr,stdout)=>{
                if(err) console.log(err);
                if(stderr) console.log(stderr);
                if(stdout) {
                  console.log(stdout);
                }
              });
              /*
            fs.readFile(process.env.HOME + libDir + f, 'base64', (err,data) =>{
              if(err) throw err;
//              rtnArr.push('data:image/webp;base64,' + data);
              //videoBuff[filename].push('data:image/jpeg;base64,' + data);
              fs.writeFile(f + ".txt", data)
              movBuff[filename].video.push('data:image/jpeg:base64,' + data)
              //videoBuff[filename].push('data:image/webp;base64,' + data);
              let rmExec = 'rm ' + process.env.HOME + libDir + f;
              //console.log(videoBuff[filename].length);
              console.log(movBuff[filename].video[movBuff[filename].video.length-1])
              console.log(movBuff[filename].video.length)
              console.log(rmExec);
              exec(rmExec,(err,stderr,stdout)=>{
                if(err) console.log(err);
                if(stderr) console.log(stderr);
                if(stdout) {
                  console.log(stdout);
                }
              });
            });
            */
            }
          })
        io.emit('textFromServer',{
          "text": "UPLOADED",
          "alert": false,
          "timeout": true
        })
      });
    }
    if(stderr){
      console.log('exec stderror: '+ stderr);
    }
    if(err !== null){
      console.log('exec error: '+ err);
    }
  });
  //})
}
/*
const rmFiles = (filename, filetype, libDir) => {
  return new Promise((resolve, reject) => {
  fs.readdir(process.env.HOME + libDir, function(err, files){
    if (err) throw err;
    files.map((f) =>{
      if( ~f.indexOf(".jpg")){
  //      console.log(process.env.HOME + libDir + f)
        fs.readFile(process.env.HOME + libDir + f, 'base64', (err,data) =>{
          if(err) throw err;
          videoBuff[filename].push('data:image/jpeg;base64,' + data);
          let rmExec = 'rm ' + process.env.HOME + libDir + f;
   //       console.log(videoBuff[filename].length);
   //       console.log(rmExec);
          exec(rmExec,(err,stderr,stdout)=>{
            if(err) console.log(err);
            if(stderr) {
    //          console.log(stderr);
              exec('rm ' + process.env.HOME + libDir + filename + '.' + filetype,(err,stderr,stdout)=>{
                if(err) console.log(err)
                if(stderr) console.log(stderr)
                if(stdout) console.log(stdout)
              })
            } 
            if(stdout) {
    //          console.log(stdout)
              exec('rm ' + process.env.HOME + libDir + filename + '.' + filetype,(err,stderr,stdout)=>{
                if(err) console.log(err)
                if(stderr) console.log(stderr)
                if(stdout) console.log(stdout)
              })
            }
            resolve()
          });
        });
      }
    })
  });
  })
}
*/
const audioConvert = (filename, filetype, libDir, deleteFlag, ss, t) =>{
  //return new Promise((resolve, reject) => {
  let tmpBuff = new Float32Array(8192);
  let rtnBuff = [];
  let url = process.env.HOME + libDir + filename + '.' + filetype;
  let i = 0;
  let rmExec = 'rm ' + process.env.HOME + libDir + filename + '.' + filetype;
  console.log(url);
  //console.log(rmExec);
  pcm.getPcmData(url, { stereo: true, sampleRate: 22050 },
    function(sample, channel) {
      tmpBuff[i] = sample;
      i++;
      if(i === 8192){
        rtnBuff.push(tmpBuff);
        tmpBuff = new Float32Array(8192);
        i = 0;
      }
    },
    function(err, output) {
      if (err) {
        console.log("err");
        throw new Error(err);
      }
      //console.log(rtnBuff.length);
      //audioBuff[filename] = rtnBuff;
      //movBuff[filename].audio = movBuff[filename].audio + rtnBuff
      movBuff[filename].audio = rtnBuff
      console.log('pcm.getPcmData(' + url+ ', { stereo: true, sampleRate: 44100 })')
      if(deleteFlag) exec(rmExec);
     // resolve()
    }
  )
  //})
}

const statusImport = (filename) =>{
  let strFilename = String(filename);
  statusList["cmd"]["list"][strFilename] = strFilename;
  //statusList["cmd"]["streamFlag"][strFilename] = false;
  statusList["streamStatus"]["streamCmd"][strFilename] = strFilename;
  statusList["streamStatus"]["streamFlag"][strFilename] = false;
  statusList.streamStatus.glitch[strFilename] = false;
  statusList["sampleRate"][strFilename] = "44100";
  if(Object.keys(statusList.clients).length > 0 && Object.keys(statusList.clients)[0] != "dummy") {
    for(let key in statusList["clients"]){
      statusList["clients"][key]["STREAMS"][strFilename] = {"TO": true, "arr": 0, "LATENCY": 0, "RATE": 44100};
    }
  }
  io.emit('streamListFromServer', statusList["streamStatus"]["streamCmd"]);
  //console.log(statusList);
}

const recordCmd = (file,id,data) => {
  let dt = new Date();
  //let dt = new Date().toLocaleString({ timeZone: 'Asia/Tokyo' })
  console.log(dt)
  console.log(startTime)
  let diff = dt.getTime() - startTime.getTime()
  console.log(diff)
  let diffTime = new Date(diff)
  console.log(diffTime)
  if(data !== "END") {
    if(!initCommand) {
      fs.appendFile(file, ',\n  "' + diffTime.toFormat("MI:SS") + '": "' + data + '"', (err) => {
      //fs.appendFile(file, ',\n  "' + dt.toFormat("YYYY/MM/DD HH24:MI:SS") + '": {"' + id + '": "' + data + '"}', (err) => {
        if(err) throw err;
      });
    } else {
      fs.appendFile(file, '\n  "' + diffTime.toFormat("MI:SS") + '": "' + data + '"', (err) => {
        if(err) throw err;
      })
      initCommand = false
    }
  } else {
    fs.appendFile(file, '\n}', (err) => {
      if(err) throw err;
    })
  }
  logArr.push('<b>' + data + '</b> ' + id + '  ' + dt.toFormat("YYYY/MM/DD HH24:MI:SS"))
  if(Object.keys(io.sockets.adapter.rooms).indexOf("log") != -1){
    io.to("log").emit('logFromServer', logArr)
  }
}

const doScenario = () => {
  console.log("scenario")
  let flag = false;
  try {
    fs.statSync(scenarioPath)
    flag = true
  } catch(err) {
    flag = false
  }
  if(flag) {
    //scenario = fs.readFileSync(scenarioPath, 'utf-8').split("\n")
    scenario = require (scenarioPath);
  }
  for(let key in scenario) {
    console.log(key + " -> " + scenario[key])
    let scenarioTime = new Date("1970/01/01 09:" + key)
    let Latency = scenarioTime.getTime()
    setTimeout(()=>{
      io.emit('cmdFromServer', {
        cmd: "INSTRUCTION",
        property: scenario[key]
      })
      //strings = scenario[key]
      /*
      let idArr = Object.keys(statusList.clients)
      console.log(idArr)
      if(idArr.length === 1 && idArr[0] === "dummy") {
        console.log("sent to dummy")
        charFromClient("enter", scenario[key], "dummy", false)
      } else {
      //  let target = idArr[Math.floor(idArr.length * Math.random())]
        let target = idArr[0]
        if(scenario[key] != "VOICE") target = idArr[0]
        console.log(target)
        for(let id in io.sockets.adapter.rooms) {
          if(target === String(id)) {
            console.log(scenario[key])
            console.log(id)
            charFromClient("enter", scenario[key], id, false)
          }
        }
      }
      */
      //let idArr = Object.keys(io.sockets.adapter.rooms)
    },Latency)
    /*
    console.log(scenarioTime.getTime())
    console.log(scenario[key])
    */
  }
  /*
  scenario.forEach((element) => {
    console.log(element)
  })
  */
}

//doScenario()

const calcRate = (targetRate) =>{
  let rtnRate = 22050
  //console.log(targetRate)
  if(targetRate < 11025){
    rtnRate = 11025
  } else if(targetRate < 22050 && targetRate >= 11025){
    rtnRate = 22050
  } else if(targetRate < 44100 && targetRate >= 22050){
    rtnRate = 44100
  } else if(targetRate < 88200 && targetRate >= 44100){
    rtnRate = 88200
  } else if(targetRate < 132300 && targetRate >= 88200){
    rtnRate = 132300
  } else if(targetRate < 176400 && targetRate >= 132300){
    rtnRate = 176400
  } else if(targetRate >= 176400){
    rtnRate = 11025
  }
  return rtnRate
}

async function mediaImport(file,mediaDir,ss,t) {
  try {
    const files = await readDir(mediaDir);
    for(let i = 0;i <= files.length; i++){
      let f = files[i]
      if(f != undefined && f.split(".")[0] === file) {
        let fSplit = f.split(".");
        if(!(fSplit[0] in movBuff)) {
          movBuff[fSplit[0]] = {"audio":[],"video":[],"index":0}
        }
        let tmpBuff = new Float32Array(8192);
        let rtnBuff = [];
        let i = 0;
        switch(fSplit[1]) {
          case "mov":
          case "MOV":
          case "mp4":
          case "MP4":
            let sndConvert = ""
            let imgConvert = ""
            sndConvert = 'ffmpeg -i ' + mediaDir + f + ' -vn -acodec aac ' + mediaDir + fSplit[0] + '.aac';
            imgConvert = 'ffmpeg -i ' + mediaDir + f + ' -r 5.4 -f image2 "' + mediaDir + fSplit[0] + '%06d.jpg"';
            if(ss !== "FULL" && t !== "FULL") {
              sndConvert = sndConvert + ' -ss ' + ss + ' -t ' + t;
              imgConvert = imgConvert + ' -ss ' + ss + ' -t ' + t;
              /*
            } else {
              sndConvert = 'ffmpeg -i ' + mediaDir + f + ' -vn -acodec aac ' + mediaDir + fSplit[0] + '.aac';
              imgConvert = 'ffmpeg -i ' + mediaDir + f + ' -r 5.4 -f image2 "' + mediaDir + fSplit[0] + '%06d.jpg"';
              */
            }
            await execPromise(sndConvert)
            await execPromise(imgConvert)
            await pcm.getPcmData(mediaDir + fSplit[0] + ".aac", { stereo: true, sampleRate: 22050 },
              function(sample, channel) {
                tmpBuff[i] = sample;
                i++;
                if(i === 8192){
                  rtnBuff.push(tmpBuff);
                  tmpBuff = new Float32Array(8192);
                  i = 0;
                }
              },
              function(err, output) {
                if (err) {
                  console.log("err");
                  throw new Error(err);
                }
                movBuff[fSplit[0]].audio = rtnBuff
                console.log('pcm.getPcmData(' + fSplit[0]+ '.aac, { stereo: true, sampleRate: 44100 })')
                console.log(movBuff[fSplit[0]].audio.length);
                execPromise("rm " + mediaDir + fSplit[0] + ".aac")
              }
            )
            const jpgs = await readDir(mediaDir);
            for(let j=0;j<=jpgs.length;j++) {
              let jpg = jpgs[j]
              console.log(jpgs[i])
              if(jpg != undefined && jpg.includes(fSplit[0]) && jpg.includes(".jpg")){
                console.log(process.env.HOME + mediaDir + jpgs[j])
                let img = await readFile(mediaDir + jpgs[j])
                let base64str = await new Buffer(img).toString('base64')
                await movBuff[fSplit[0]].video.push('data:image/jpeg;base64,' + base64str)
                await execPromise('rm ' + mediaDir + jpgs[j])
                io.emit('textFromServer',{
                  "text": "UPLOADED",
                  "alert": false,
                  "timeout": true
                })
              }
            }
            statusImport(fSplit[0])
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
            await pcm.getPcmData(mediaDir + f, { stereo: true, sampleRate: 22050 },
              function(sample, channel) {
                tmpBuff[i] = sample;
                i++;
                if(i === 8192){
                  rtnBuff.push(tmpBuff);
                  tmpBuff = new Float32Array(8192);
                  i = 0;
                }
              },
              function(err, output) {
                if (err) {
                  console.log("err");
                  throw new Error(err);
                }
                //movBuff[f].audio = rtnBuff
                movBuff[fSplit[0]].audio = rtnBuff
                console.log('pcm.getPcmData(' + f+ ', { stereo: true, sampleRate: 44100 })')
                io.emit('textFromServer',{
                  "text": "UPLOADED",
                  "alert": false,
                  "timeout": true
                })
              }
            )
            console.log("audio file")
            statusImport(fSplit[0])
            break;
          default:
            console.log("not media file")
            break;
        }
      }
    }
    console.log(files);
  } catch(e) {
    console.error(e);
  }
}

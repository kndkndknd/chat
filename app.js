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

// canvas to qr
const { Image } = require('canvas')
const jsQR = require('jsqr')

// speech
/*const speech = require('@google-cloud/speech');
const record = require('node-record-lpcm16');*/
// arduino
const arduino = require('johnny-five')
const board = new arduino.Board()
let relay = null
board.on('ready', () => {
  console.log("johnny five relay connected, NC open");
  relay = new arduino.Led(13);
  relay.on();
  setTimeout(()=>{
    relay.off();
    },500);
});
// --arduino

//midi------
/*
const midi = require('midi');
// Set up a new output.
const output = new midi.Output();
// Count the available output ports.
output.getPortCount();
// Get the name of a specified output port.
output.getPortName(0);
// Open the first available output port.
output.openPort(0);
// Send a MIDI message.
output.sendMessage([176,22,1]);
// Close the port when done.
output.closePort();
*/
// ----midi

//osc
const osc = require('node-osc')
//---osc

const exportComponent = require('./exportFunction.js');
const keycodeMap = require ('./lib/keyCode.json');
let statusList = require ('./lib/status.json');
let dt = new Date();
//const logFilePath = process.env.HOME + "/Dropbox/log/" + dt.toFormat("YYYYMMDDHH24MMSS") + ".json"
const logFilePath = "./log" + dt.toFormat("YYYYMMDDHH24MMSS") + ".json"
//const logFilePath = "/Volumes/FDD/doc/share/local/" + dt.toFormat("YYYYMMDDHH24MMSS") + ".json"

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

// cloud speech-to-text---------
/*
const client = new speech.SpeechClient({
    projectId: 'speech2text-1576896349404',
    keyFilename: process.env.HTTPSKEY_PATH + 'speech2text-e54aa4497491.json'
});
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
//const languageCode = 'ja-JP';
const languageCode = 'en-US';

const requestSpeech = {
    config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
    },
    interimResults: false, // If you want interim results, set this to true
};

// Create a recognize stream
const recognizeStream = client
  .streamingRecognize(requestSpeech)
  .on('error', console.error)
  .on('data', data => {
    //console.log(data)
    let cmdList = data.results[0].alternatives[0].transcript.toUpperCase()
    cmdList.split(" ").forEach((element) => cmdFromServer(element, false))
    
  console.log('client.streamingRecognize(requestSpeech).on("error", console.error).on("data", data => { ' + data.results[0].alternatives[0].transcript + ' })')
    //recognizeStream.end()
  }
);
const recording = record.record()
const speechToCmd = ()=>{
  console.log('recording.stream().pipe(recognizeStream')
  recording.stream().pipe(recognizeStream)
  setTimeout(() => {
    recording.pause()
    recording.resume()
//    recording.stop()
    //console.log("speech quit")
  },1000)
}
*/
//--------------cloud speech-to-text

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
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
app.get('/ch2', function(req, res, next) {
  res.render('ch2', {
    title: 'ch2'
   });
});
app.get('/log', function(req, res, next) {
  res.render('log', {
    title: 'log'
   });
});
app.get('/mobile', (req, res, next) => {
  res.render('mobile', {
    title: 'mobile'
  })
})
app.get('/mic', (req, res, next) => {
  res.render('mic', {
    title: 'mic'
  })
})

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
      console.log('pcm.getPcmData(' + url + '), {stereo: true, sampleRate: 44100}, (sample, channel)=>{function}');
    }
  );
  return rtnBuff;
}
const movBuff = {
  "KICK": {
    "audio": exportComponent.pcm2arr(pcm, "./public/files/KICK.wav")
  },
  "SNARE": {
    "audio": exportComponent.pcm2arr(pcm, "./public/files/SNARE.wav")
  },
  "HAT": {
    "audio": exportComponent.pcm2arr(pcm, "./public/files/HAT.wav")
  },
  "SILENCE": {
    "audio": exportComponent.pcm2arr(pcm, "./public/files/SILENCE.wav")
  },
  "PLAYBACK": {
    "audio": [],
    "video": []
  },
  "TIMELAPSE": {
    "audio": [],
    "video": []
  },
  "CHAT": [],
  "INTERNET": {
    "audio": [],
    "video": []
  }
}

let strings = "";
const homeDir = '/Users/knd/'
const libDir = '/Downloads/';
let timelapseFlag = false;
let logArr = []
let tile = false
let cmd
//let internetUrl = "https://localhost:3000/"
let internetUrl = "https://knd.space/"
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const getInternet = () =>{
  console.log('request.get({url: ' + internetUrl + '"ckeckGetBuffer/",json:true}, function (error, response, body) {function}')
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
    //console.log("debug")
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

//oscreceive
let sendCount = 0;
//let oscClient = new osc.Client('127.0.0.1', 7777);
//let oscClient = new osc.Client('192.168.100.25', 7777);
let oscClient = new osc.Client('192.168.0.101', 7777);
var oscServer = new osc.Server(9999);
oscServer.on("message", (msg, rinfo) => {
  console.log("debug")
  console.log(msg)
  switch(msg[0]) {
    case "/bpm":
      bpmFromOsc(msg[1])
      break;
    case "/hitx":
    case "/hity":
      if(msg.length > 2) {
        io.emit("oscFromServer", msg)
      }
      //cmdFromServer()
      break;
    default:
      let stream = "all"
      switch(msg[1]){
        case 1:
          stream = "CHAT"
          break;
        case 2:
          stream = "PLAYBACK"
          break;
        case 3:
          stream = "TIMELAPSE"
          break;
      }
      console.log(stream)
      defaultFromOsc(msg[0],msg[2],stream)
      break;
      /*
    case "/rate":
      rateFromOsc(msg[1], msg[2])
      break;
    case "/ctrl":
      ctrlFromOsc(msg[1], msg[2])
      */
      /*
    case "/stream":
      streamFromOsc(msg[1])
      break;
      */
  }
})
//oscServer.on("stream", (msg, rinfo) => {
const defaultFromOsc = (type, property, stream) => {
  let streamArr = []
  if(stream != "all") {
    streamArr = [stream]
  } else {
    //console.log(property)
    streamArr = Object.values(statusList.streamStatus.streamCmd)
  }
  switch(type) {
    case "/rate":
      if(property < 3000) property = 3000
      if(property > 192000) property = 192000
      streamArr.forEach((element)=>{
        statusList.sampleRate[element] = String(property)
        for(let id in statusList.clients) {
          if(statusList.clients[id].STREAMS[element] != undefined) statusList.clients[id].STREAMS[element].RATE = String(property)

        }
        
        io.emit('cmdFromServer',{
          cmd: "SAMPLERATE",
          property: 0
        })
        io.emit("textFromServer", {
          "text": "RATE:" + stream + " " + String(property) + "Hz",
          "alert": false,
          "timeout": true
        })
      })
      break;
    case "/ctrl":
      if(property) {
        let selectStream = streamArr[0]
        if(streamArr.length > 1) selectStream = streamArr[streamArr.length * Math.floor(Math.random())]
        let idArr = Object.keys(statusList.clients)
        if(selectStream === "CHAT") {
          for(let id in io.sockets.adapter.rooms){
            if(statusList.clients[String(id)] !== undefined && statusList.clients[String(id)].STREAMS[selectStream].FROM) {
              statusList.streamStatus.streamFlag[selectStream] = true;
              setTimeout(() =>{
                io.to(id).emit('streamReqFromServer',"CHAT")
              },500);
              break; //test later
            }
          }
        } else if(selectStream !== "DRUM") {
          statusList.streamStatus.streamFlag[selectStream] = true;
          setTimeout(()=> {
            streamReq(selectStream, idArr[Math.floor(Math.random() * idArr.length)])
          },500)
        } else {
          statusList.streamStatus.streamFlag.KICK = true
          statusList.streamStatus.streamFlag.SNARE = true
          statusList.streamStatus.streamFlag.HAT = true
          exportComponent.roomEmit(io, 'cmdFromServer', {"cmd":"KICK"}, statusList["cmd"]["target"]);
          exportComponent.roomEmit(io, 'cmdFromServer', {"cmd":"SNARE"}, statusList["cmd"]["target"]);
          exportComponent.roomEmit(io, 'cmdFromServer', {"cmd":"HAT"}, statusList["cmd"]["target"]);
          setTimeout(() =>{
            streamReq("KICK", idArr[Math.floor(Math.random() * idArr.length)])
            streamReq("HAT", idArr[Math.floor(Math.random() * idArr.length)])
            setTimeout(() => {
              streamReq("SNARE", idArr[Math.floor(Math.random() * idArr.length)])
            }, (60000 * 4) / (statusList.clients[idArr[Math.floor(Math.random() * idArr.length)]].rhythm.bpm))
          },500);
        }
      } else {
        streamArr.forEach((element)=>{
          if(element !== "DRUM") {
            statusList.streamStatus.streamFlag[element] = false
          } else {
            statusList.streamStatus.streamFlag.KICK = false
            statusList.streamStatus.streamFlag.SNARE = false
            statusList.streamStatus.streamFlag.HAT = false
          }
        })
      }
      break;
  }
}
const rateFromOsc = (rate, stream) => {
  console.log(statusList.osc.rate)
  statusList.sampleRate[statusList.streamStatus.streamCmd[statusList.osc.stream]] = statusList.osc.rate
  for(let id in statusList.clients) {
    statusList.clients[id].STREAMS[statusList.osc.stream].RATE = statusList.osc.rate
  }
}
oscServer.on("video", function (msg, rinfo) {
  console.log(msg);
  /*
  for(var i=0; i<msg.length; i++) {
    console.log(msg[i]);
  }
  */
  let json = {
    "audio": movBuff.SILENCE.audio[0],
    "video": msg[0],
    "target": "INTERNET",
    "glitch": false,
    "sampleRate": 44100
  }
  //send somebody
  let idArr = []
  idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], "INTERNET", "TO", "dummy")
  if(idArr.length > 0) {
    io.to(idArr[Math.floor(Math.random() * idArr.length)]).emit("chunkFromServer", json)
  }
})
const bpmFromOsc = (bpm) => {
  //console.log(msg)
  if(bpm <= 0) bpm = 1
  for(let key in statusList.clients) {
    statusList.clients[key].rhythm.bpm = bpm
    statusList.clients[key].rhythm.interval = (60000 * 4) / (statusList.clients[key].rhythm.score.length * bpm)
  }
  console.log('BPM: ' + String(bpm));
  io.emit("cmdFromServer", {
    "cmd": "BPM",
    "property": bpm
  })
}
//---osc
//oscSend---
const toOsc = (type, stream) => {
  console.log(type)
  let sendOsc = new osc.Message('/'+ type)
  let param = false
  switch(stream) {
    case "CHAT":
      param = 1
      break;
    case "PLAYBACK":
      param = 2
      break;
    case "TIMELAPSE":
      param = 3
      break;
  }
  if(param) {
    console.log(param)
    sendOsc.append(param)
    oscClient.send(sendOsc)
  }
}

//oscSend---
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
      if(Object.keys(statusList.clients)[0] === 'dummy' && Object.keys(statusList["clients"].length === 1 )){
        delete statusList["clients"]["dummy"];
        fs.appendFile(logFilePath, '{\n  "' + dt.toFormat("YYYY/MM/DD HH24:MI:SS") + '": {"' + String(socket.id) + '":"connect"}', (err) => {
          if(err) throw err;
        });
      } else {
        recordCmd(logFilePath, String(socket.id) ,"connect")
      }
      let ipAddress = "localhost";
      if(String(socket.handshake.address) != "::1"){
        //console.log(socket.handshake)
        ipAddress = String(socket.handshake.address.replace("::ffff:",""))
      }
      statusList["clients"][sockID] = {
        "room":data,
        "No": cliNo,
        "type": pcname,
        "ipAddress": ipAddress,
        //"ipAddress": socket.handshake.headers.host.split(":")[0],
        "STREAMS": {
          "SECBEFORE": {"TO": false, "ACK": false, "arr": 0, "LATENCY": "0", "RATE":"44100"},
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
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": false, "TO": false, "ACK": false, "arr": 0, "LATENCY": 0, "RATE":"44100"};
            break;
          case "KICK":
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": false, "TO": false, "ACK": false, "arr": 0, "LATENCY": statusList.clients[sockID].rhythm.interval / 8, "RATE":"44100"};
            break
          case "SNARE":
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": false, "TO": false, "ACK": false, "arr": 0, "LATENCY": statusList.clients[sockID].rhythm.interval / 8, "RATE":"44100"};
            break
          case "HAT":
            statusList["clients"][sockID]["STREAMS"][key] = {"FROM": false, "TO": false, "ACK": false, "arr": 0, "LATENCY": statusList.clients[sockID].rhythm.interval / 8, "RATE":"44100"};
            break
          //case "RECORD":
           // statusList["clients"][sockID]["STREAMS"][key] = {"FROM": true, "arr": 0, "LATENCY": "0", "RATE":"48000"};
            //break;
          default:
            statusList["clients"][sockID]["STREAMS"][key] = {"TO": false, "arr": 0, "LATENCY": 0, "RATE":"44100"};
        }
      }
      // gainCtrl server connect test
      request("http://" + statusList.clients[sockID].ipAddress + ":7777", function (error, response, body) {
        if (!error && response.statusCode == 200) {
          statusList.clients[sockID]["server"] = true
          console.log('http://' + statusList.clients[sockID].ipAddress + ':7777 http response:' + response.statusCode)
        } else {
          statusList.clients[sockID]["server"] = false
          if(!error) {
            console.log('http://' + statusList.clients[sockID].ipAddress + ':7777 http response:' + response.statusCode)
          } else {
            console.log(error)
          }
        }
      })
      cliNo++;
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
    getInternet()
    statusList.clients[String(socket.id)].STREAMS.SECBEFORE =  {"TO": true, "ACK": true, "arr": 0, "LATENCY": "0", "RATE":"44100"},
    statusList.clients[String(socket.id)].STREAMS.RECORD = {"FROM": true, "arr": 0}
    for(let key in statusList.streamStatus.streamFlag){
      switch(key){
        case "CHAT":
          statusList["clients"][String(socket.id)]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": 0, "RATE":"44100"};
          break;
        case "KICK":
          statusList["clients"][String(socket.id)]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": statusList.clients[String(socket.id)].rhythm.interval / 8, "RATE":"44100"};
          break
        case "SNARE":
          statusList["clients"][String(socket.id)]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": statusList.clients[String(socket.id)].rhythm.interval / 8, "RATE":"44100"};
          break
        case "HAT":
          statusList["clients"][String(socket.id)]["STREAMS"][key] = {"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": statusList.clients[String(socket.id)].rhythm.interval / 8, "RATE":"44100"};
          break
        default:
          statusList["clients"][String(socket.id)]["STREAMS"][key] = {"TO": true, "arr": 0, "LATENCY": 0, "RATE":"44100"};
      }
    }
    socket.emit('streamFlagFromServer', statusList.streamStatus.streamFlag)
  })
  socket.on("routingFromCtrl", (data) =>{
    console.log(data);
  });

  socket.on('chunkFromClient', (data)=>{
    //console.log('chunkFromClient')
    //console.log(socket.id)
    //exportComponent.postInternetArr({"audio": data.audio, "video": data.video}, request, internetUrl)
    //console.log(String(socket.id))
    //console.log(data.video)
    chunkFromClient(data, String(socket.id));
    //osc--
    if(data != undefined && data.video != undefined && data.video != "") {
      let sendOsc = new osc.Message('/video')
      sendOsc.append(String(data.video).substr(0,10))
      //sendOsc.append("debug")
      //console.log("debug:" + data.video)
      oscClient.send(sendOsc)
    }
    //--osc
    if(Math.random()<0.1) postToInternet({"audio":data.audio, "video": data.video, "target":"CHAT"})
  });

  socket.on('AckFromClient', (data)=>{
    //console.log("ack from " + String(socket.id))
    let id = String(socket.id)
    if(statusList.streamStatus.streamFlag && id in statusList.clients) {
      statusList.clients[id].STREAMS[data].ACK = true;
      /*
      statusList.streamStatus.timer[data] = false
      console.log("ack timer false")
      */
      streamReq(data, id);
    }
    /*
    statusList.streamStatus.timer = true
    setTimeout(()=>{
      if(statusList.streamStatus.timer) {
        streamReq(data, id);
      }
    }, 5000)
    */
  });


  socket.on('charFromClient', (keyCode) =>{
    strings = charFromClient(keyCode,strings, socket.id, false);
  });
  //mic
  socket.on('micFromClient', (data) => {
    //console.log(data)
    strings = data
    micToCmd(data, socket.id)
  })

  socket.on('wavReqFromClient',(data)=>{
    /*
    if(statusList.streamStatus.streamFlag) {
      statusList.streamStatus.timer[data] = false
      console.log("wavreq timer false")
    }*/
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
    //console.log("ctrlCmd: " + data["cmd"]);
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
        //console.log("test")
        statusList.streamStatus.glitch[data.property.stream] = data.property.val
        //console.log(statusList.streamStatus.glitch)
        break;
      case "FADE":
        //console.log(data.property)
        statusList.cmd.FADE[data.property.target] = String(data.property.val)
        exportComponent.roomEmit(io, 'cmdFromServer',{
          "cmd": "FADE",
          "property": {
            "type" : data.property.target,
            "status": statusList.cmd.FADE
          }
        }, statusList["cmd"]["target"]);
        //console.log(statusList.cmd.FADE)
        break
      case "PORTAMENT":
        statusList.cmd.PORTAMENT = Number(data.property.val)
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "PORTAMENT",
          "property": statusList.cmd.PORTAMENT
        }, statusList["cmd"]["target"]);
        //console.log(statusList.cmd.PORTAMENT)
        break
      case "FACE DETECT":
        splitSpace(data.cmd, false)
        break
    }
    //io.to("ctrl").emit("statusFromServer", statusList);
  })
  socket.on("AckFromMobile", (data)=>{
    //console.log(data)
    if(data === "start") socket.emit("streamReqToMobile", "CHAT")
  })
  socket.on("chunkFromMobile", (data)=>{
    //push buff from mobile data
    //console.log(data.audio)
    if(data.audio != "" && data.video != ""){
      movBuff.CHAT.push({"id": String(socket.id), "audio": data.audio, "video":data.video});
      //console.log(movBuff.CHAT.length)
    }
    /*
    if(data.audio != "" && data.video != "" && audioBuff.CHAT.Mobile.length < 30){
      audioBuff.CHAT.push(data.audio);
      videoBuff.CHAT.push(data.video);
      console.log(audioBuff.CHAT.length)
      //debug later
    } else if(audioBuff.CHAT.Mobile === undefined) {
      audioBuff.CHAT.Mobile = [data.audio]
      videoBuff.CHAT.Mobile = [data.video]
    }
    */
    setTimeout(() =>{
      socket.emit("streamReqToMobile", "CHAT")
    } ,500)
  })
  socket.on("textFromClient",(data) =>{
    io.emit("textFromServer", {
      "text": data,
      "alert": false,
      "timeout": true
    })
  })
  socket.on("voiceCtrlFromClient", (data) => {
    statusList.clients[String(socket.id)].voice = data
  })
  socket.on("disconnect", () =>{
//    disconnect();
    console.log('disconnect: ' + String(socket.id));
    recordCmd(logFilePath, String(socket.id) ,"disconnect")
    let sockID = String(socket.id);
    //console.log("disconnect: " + sockID);
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
      delete statusList.clients[sockID];
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
// websocket


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

const getFromInternet = () =>{
      request.get({url: internetUrl + 'ckeckGetBuffer/',json:true}, (error, response, body) => {
        if (response.statusCode == 200) {
          //console.log(body.value)
          for(let i=0;i<body.value;i++){
          request.get({url: internetUrl + 'getBuffer/',json:true}, (error, response, body) =>{
            //console.log("buffer")
            if (!error && response.statusCode == 200 && body.value != "no") {
              //console.log("get")
              if(body.audio != undefined && body.video != undefined) {
                movBuff.INTERNET.audio.push(body.audio)
                movBuff.INTERNET.video.push(body.video)
              }
              //if(body.audio != undefined) audioBuff.INTERNET.push(body.audio)
              //if(body.video != undefined) videoBuff.INTERNET.push(body.video)
            } else if(value in body && body.value === "no"){
              //console.log("end")
            }
          })
          }
        } else if(response != undefined) {
          //console.log('internet connect error: '+ response.statusCode);
        } else {
          //console.log('internet connect error');
          //console.log(error)
        }
      })
}

const postToInternet = (chunk) =>{
  request.get({url: internetUrl + 'checkPost/',json:true}, function (error, response, body) {
    //console.log("get")
    if (!error && response.statusCode == 200) {
      if(response.body.ack === "ok") {
        request.post({
          uri: internetUrl + "postBuffer/",
          headers:{"Content-type":"application/json"},
          json: chunk
        },(error, response, body) =>{
          //console.log(error)
          //console.log(response)
          //console.log(body)
        })
      } else {
        //console.log("host is busy")
      }
    } else {
      //console.log("request error")
      //console.log(error)
    } 
  })
}

const loopForHour = (cmd) => {
  setInterval(() => {
    cmdFromServer(cmd, false)
  },3600000)
}

const cmdFromServer = (cmdStrings, alertFlag) =>{
  switch(cmdStrings){
    case "START":
      console.log('timelapse start')
      timelapseFlag = true;
      io.emit('textFromServer',{
        "text": cmdStrings,
        "alert": false,
        "timeout": true
      })
      break;
    case "STOP":
      stopFromServer();
      io.emit('textFromServer',{
        "text": cmdStrings,
        "alert": false,
        "timeout": true
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
      //aveRate = aveRate / keys;
      //console.log(aveRate/keys)
      rtnRate = calcRate(aveRate / keys)
      //console.log(rtnRate)
      console.log('STREAM sampleRate = ' + String(rtnRate))
      for (let key in statusList["sampleRate"]){
        //console.log(key)
        statusList["sampleRate"][key] = rtnRate;
        for(let clientID in statusList["clients"]){
          //console.log(statusList.clients[clientID].STREAMS[key])
          statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
        }
      }
      io.emit('cmdFromServer',{
        cmd: "SAMPLERATE",
        property: rtnRate
      })
      /*
      io.emit('textFromServer',{
        text: "SAMPLE RATE: " + rtnRate + "Hz",
        alert: false
      })
      */
      break;
    case "GRID":
      console.log('STREAM note on in GRID: ' + String(!statusList.streamStatus.grid))
      //console.log(statusList.streamStatus.grid)
      if(!statusList.streamStatus.grid){
        io.emit("textFromServer", {
          "text": "GRID",
          "alert": false,
          "timeout": true
        })
        for(let id in statusList.clients){
          for(let strms in statusList.clients[id].STREAMS){
            if(strms != "KICK" && strms != "SNARE" && strms != "HAT") statusList.clients[id].STREAMS[strms].LATENCY = statusList.clients[id].rhythm.interval / 32
            //console.log(statusList.clients[id].STREAMS[strms])
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
            //console.log(statusList.clients[id].STREAMS[strms])
          }
        }
      }
      statusList.streamStatus.grid = !statusList.streamStatus.grid
      break
    case "QUANTIZE":
      console.log('STREAM note on in QUANTIZE')
    //} else if(charString === "QUANTIZE") { //QUANTIZE
      //exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
      //if(!statusList.streamStatus.grid) {
        io.emit("cmdFromServer",{
          "cmd": "QUANTIZE"
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
              //console.log(key1);
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
    //case "BROADCAST":
      if(statusList["streamStatus"]["emitMode"] === cmdStrings){
        statusList["streamStatus"]["emitMode"] = "NORMAL";
        //exportComponent.roomEmit(io,'textFromServer', "NOT RANDOM", statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          "text": "NOT RANDOM",
          "alert": false,
          "timeout": true
        })
      } else {
        statusList["streamStatus"]["emitMode"] = cmdStrings;
        //exportComponent.roomEmit(io,'textFromServer', cmdStrings, statusList["cmd"]["target"]);
        io.emit('textFromServer',{
          "text": cmdStrings,
          "alert": false,
          "timeout": true
        })
      }
      //console.log("emitMode: " + cmdStrings);
      break;
    case "SWITCH":
      if(relay !== null) {
        statusList.cmd.now.SWITCH = !statusList.cmd.now.SWITCH
        //console.log(statusList.cmd.now.SWITCH)
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

      /*
      for(let id in statusList.clients){
        if(statusList.clients[id].server) postHTTP("SWITCH", statusList.cmd.now.SWITCH, statusList.clients[id].ipAddress)
      }
      */
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
      //console.log(cmd)
      io.emit('cmdFromServer',{"cmd": "THRICE"})
      break;
    case "TILE":
      if(tile) {
        tile = false
      } else {
        tile = true
      }
      io.emit('cmdFromServer',{"cmd":"TILE", "property":tile})
      break;
    case "FLASH":
      io.emit('cmdFromServer', {cmd: "FLASH"})
      break;
    default:
      cmd = cmdSelect(cmdStrings);
      if(cmd) {
        console.log("cmd: " + cmd["cmd"]);
        if(cmd["cmd"] === "RECORD"){
          let idArr = [];
          idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList.clients, cmd["cmd"], "FROM", "dummyID")
          for(let i=0;i<idArr.length;i++){
            io.to(idArr[i]).emit('cmdFromServer', cmd);
          }
        } else if(cmd.cmd === "DRUM") {
          //console.log("STREAM start: DRUM")
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
              //console.log(statusList.clients[cmd.target].cmd)
              exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"]);
            } 
          } else {
            exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList["cmd"]["target"])
          }
        }
        // stream
        //console.log('STREAM start: ' + statusList.streamStatus.streamCmd)
        for(let key in statusList.streamStatus.streamCmd){
          if(cmd.cmd === key){
            console.log(key + " stream start");
            statusList.streamStatus.streamFlag[statusList.streamStatus.streamCmd[key]] = true;
            setTimeout(() =>{
              let idArr = Object.keys(statusList.clients)
              if(statusList.streamStatus.streamCmd[key] === "CHAT"){
                for(let id in io.sockets.adapter.rooms){
                  if(statusList.clients[String(id)] != undefined && statusList.clients[String(id)].STREAMS[statusList.streamStatus.streamCmd[key]].FROM) io.to(id).emit('streamReqFromServer',"CHAT")
                }
              } else {
                streamReq(statusList.streamStatus.streamCmd[key], idArr[Math.floor(Math.random() * idArr.length)])
              }
              //streamReq(statusList.streamStatus.streamCmd[key], idArr[Math.floor(Math.random() * idArr.length)])
            },500);
            toOsc("play", key)
          }
        }
      } else if ((isNaN(Number(cmdStrings)) === false || isNaN(Number(cmdStrings.replace("HZ",""))) === false) && cmdStrings != "") {
        console.log("cmd: SINEWAVE")
        cmd = sineWave(cmdStrings.replace("HZ",""));
        cmd.target = exportComponent.pickCmdTarget(statusList.clients,cmd)
      //  console.log(cmd.target)
        if(cmd.property != statusList.clients[cmd.target].cmd.cmd){
          statusList.clients[cmd.target].cmd.cmd = cmd.property
        } else {
          statusList.clients[cmd.target].cmd.cmd = "none"
        }
        statusList.clients[cmd.target].cmd.timestamp = Number(new Date())
        //console.log(statusList.clients[cmd.target])
        exportComponent.roomEmit(io, 'cmdFromServer', cmd, statusList.cmd.target);
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
      } else {
        console.log('io.emit(textFromServer,{"text",' + cmdStrings + '})')
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
  //console.log(numCmd)
  if(numCmd !== null){
    if(Number(numCmd[0]) <= 20000) {
      cmd.cmd = numCmd[0]
    } else if(Number(numCmd[0] <= 180000)) {
      cmd.cmd = "RATE"
      cmd.property = numCmd[0]
    }
  }
      /*
  let num2byteCmd = micStrings.match(/^([１-９][０-９]*|0)([\.．]\[０-９]+)?$/) //サイン波(~20000）、サンプリング周波数(20000~180000)
  */

  //console.log(micStrings) //debug
  if(cmd.cmd != "") {
    //console.log(cmd.cmd)
    switch(cmd.cmd) {
      case "CHAT":
      case "PLAYBACK":
      case "TIMELAPSE":
        if(cmd.cmd in statusList.streamStatus.streamCmd) {
        /*
        let flag = false
        for(let key in statusList.streamStatus.streamCmd){
          if(cmd.cmd === key) flag = true
        }
        
        if(flag){
        */
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
        //}
        if(cmd.cmd in statusList.streamStatus.streamCmd){
         // if(cmd.cmd === key){
          console.log(cmd.cmd + " STREAM start");
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
        //}
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
        console.log("debug " + idArr.join(","))
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
        if(relay !== null) {
          console.log("debug: " + String(relay))
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
        break;
      case "LOOP":
        io.emit("stringsFromServer", "");
        let loopArr = Object.keys(io.sockets.adapter.rooms);
        console.log(loopArr) //debug
        roopArr.forEach((id) =>{
        //Object.keys(io.sockets.adapter.rooms).forEach(id) =>{
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
        //}
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
          console.log(Object.keys(statusList.clients))
          Object.keys(io.sockets.adapter.rooms).forEach((sockID) =>{
            console.log(String(sockID))

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
    /*
    if(cmd.cmd in statusList.streamStatus.streamCmd) { //STREAM
    } else if(cmd.cmd === "GLITCH") {
    } else if(cmd.cmd === "SWITCH") {
    } else if(cmd.cmd === "LOOP") {
    } else if(cmd.cmd === "RATE") {
    } 
    } else {
      cmdFromServer(cmd.cmd, false)
    }
    */
    if(statusList.cmd.now[cmd.cmd]){
      statusList.cmd.now[cmd.cmd] = false
    } else {
      statusList.cmd.now[cmd.cmd] = true
    }
    strings = ""
    //io.to(socketId).emit("textToMic","")
    io.emit("stringsFromServer", "")
  } else {
    io.emit('stringsFromServer', micStrings)
  }
}

const charFromClient = (keyCode, charString, socketId, alertFlag) =>{
  console.log(charString)
  let character = keycodeMap[String(keyCode)];
  //console.log(character)
  if(character === "enter") {
    recordCmd(logFilePath, String(socketId), strings)
    console.log(charString);
    if(~charString.indexOf(" ") ) {
      splitSpace(charString, false);
      charString = "";
    } else if(charString === "LOOP") { //LOOP
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
      io.to(socketId).emit("cmdFromServer",{
        "cmd": "LOOP"
      })
      charString = ""
    } else if(charString === "BROWSER") {
      console.log("BROWSER open")
      console.log(statusList.ipAddress)
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
      io.to(socketId).emit("cmdFromServer",{
        "cmd": "BROWSER",
        "property":statusList.ipAddress
      })
      charString = ""
    } else if(charString === "LOCALREC") { //LOOP
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
      //if(!statusList.streamStatus.grid) {
        io.to(socketId).emit("cmdFromServer",{
          cmd: "RECORD",
          property: "local"
        })
      charString = ""
    } else if(charString === "LOCALPLAY") { //LOOP
      exportComponent.roomEmit(io, 'stringsFromServer', "", statusList["cmd"]["target"]);
      //if(!statusList.streamStatus.grid) {
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
    } else if(charString === "QR" || charString === "QRCODE") {
      io.to(socketId).emit("cmdFromServer", {
        cmd: "QRCODE"
      })
    } else {
      cmdFromServer(charString, alertFlag)
      //for 20190609
      //loopForHour(charString)
      charString = ""
    }
  } else if(character === "tab" || character === "right_arrow" || character === "down_arrow") {
    //exportComponent.roomEmit(io, 'erasePrintFromServer', "", statusList["cmd"]["target"]);
    io.emit('erasePrintFromServer', "")
    charString =  "";
  } else if(character === "left_arrow" || character === "backspace") {
    charString = charString.slice(0,-1)
    //exportComponent.roomEmit(io, 'stringsFromServer', charString, statusList["cmd"]["target"]);
    io.emit('stringsFromServer', charString)
  } else if(character === "escape"){
    stopFromServer();
    //for 20190609
    //loopForHour("STOP")
    recordCmd(logFilePath, String(socketId), "STOP")
    io.to("ctrl").emit("statusFromServer", statusList);
  } else if(keyCode === 226 || keyCode === 220 || keyCode === 189){
    io.to(socketId).emit('cmdFromServer',{"cmd":"BASS","property":"LOW"})
    recordCmd(logFilePath, String(socketId), "BASS")
  } else if(keyCode === 187){
    io.to(socketId).emit('cmdFromServer',{"cmd":"BASS","property":"HIGH"})
    recordCmd(logFilePath, String(socketId), "BASS")
  } else if(keyCode === 17){
    io.to(socketId).emit('cmdFromServer', {
      "cmd": "CTRL",
      "property": statusList
    });
    charString = "";
    console.log("control view");
  } else if(character === "up_arrow"){
    charString = statusList["cmd"]["prevCmd"];
    exportComponent.roomEmit(io, 'stringsFromServer', charString, statusList["cmd"]["target"]);
    recordCmd(logFilePath, String(socketId), "charString")
  /*} else if(keyCode === 124 || keyCode === 46) {
    speechToCmd()*/
  } else if(character != undefined) {
    charString =  charString + character;
    //exportComponent.roomEmit(io, 'stringsFromServer', charString, statusList["cmd"]["target"]);
    io.emit('stringsFromServer',charString)
    if(keyCode === 32) {
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
 //     io.to(sourceId).emit('cmdFromServer',{
      //osc--
      let sendOsc = new osc.Message('/bpm')
      sendOsc.append(bpm);
      oscClient.send(sendOsc);
      //--osc


      io.emit('cmdFromServer',{
        "cmd": "BPM",
        //"type": "param",
        //"trig": true,
        "property": statusList.clients[String(sourceId)].rhythm.bpm
      });
      recordCmd(logFilePath, String(sourceId), "METRONOME_" + String(statusList.clients[String(sourceId)].rhythm))
      metronomeArr = [];
      strings = ""
      break;
    default:
      metronomeArr.push(new Date().getTime());
      let tapLength = Number(metronomeArr.length)
      //console.log(metronomeArr);
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
  //console.log(postOption)
  request.post(postOption, (error, response, body) => {
    response.on('data', (chunk) =>{
      console.log(chunk)
    })
  })
}

const textCmd = (strings) => {
  let strArr = strings.replace(",","").split(" ")
  //console.log(strArr)
  /*
  strArr.forEach((element) =>{
    console.log(element)
    cmdFromServer(element, false)
  })
  */
  //io.emit("stringsFromServer", strings) 
  io.emit("textFromServer",{
    "text": strings,
    "alert": false,
    "timeout": false
  })
}

const splitSpace = (strings, alertFlag) => {
  console.log('splitSpace = (' + strings + ')')
  let strArr = strings.split(" ");
  if(strArr.length > 3 || strings.split(",").length > 1) {
    //console.log(strArr.length)
    textCmd(strings)
  } else {
    switch(strArr[0]) {
      case "VOL":
      case "VOLUME":
        /*
        console.log("VOLUME " + strArr[1]);
        exportComponent.roomEmit(io, 'cmdFromServer', {
          "cmd": "VOLUME",
          "property": strArr[1]
        }, statusList["cmd"]["target"]);
        break;
        */
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
          exportComponent.roomEmit(io, 'cmdFromServer',{
            "cmd": "FADE",
            "property": {
              "type" : "IN",
              "status": statusList.cmd.FADE
            }
          }, statusList.cmd.target)
        } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
          //console.log("FADE VALUE:" + strArr[1])
          exportComponent.roomEmit(io, 'cmdFromServer',{
            "cmd": "FADE",
            "property": {
              "type" : "val",
              "status": Number(strArr[1])
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
          //osc--
          let sendOsc = new osc.Message('/bpm')
          sendOsc.append(Number(strArr[1]));
          oscClient.send(sendOsc);
          //--osc
          io.emit('cmdFromServer', {cmd:"BPM", property:Number(strArr[1])})
        }
      break
      case "UPLOAD":
        let fname = strArr[1]
        if(fname === "TIMETABLE") {
          console.log("TIMETABLE renew");
          timeTable = timeTableRead();
        } else {
          /*
          let fname = "";
          for(let i=0;i<strArr.length;i++){
            fname = fname + strArr[i] + "_";
          }
          */
        /*  fname = fname.substr(7);
          fname = fname.substr(0, fname.length-1);
          */
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
              }
              break;
          }
          //fileImport(fname,libDir,statusImport,"00:00:00","00:00:15");
          console.log(fname)
          fileImport(fname,libDir,statusImport,ss,t);
        }
        io.emit('textFromServer',{
          "text": strArr[0],
          "alert": false,
          "timeout": true
        })
        /*
        if(strArr.length === 2) {
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
          io.emit('textFromServer',{
            "text": strArr[0],
            "alert": false,
            "timeout": true
          })
        }*/
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
          Object.keys(statusList.clients).forEach((id,index,arr)=>{
            statusList.clients[id].STREAMS[strArr[1]] = {"TO":true, "arr":0, "LATENCY": 0, RATE:44100}
          })
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
            for(let id in statusList["clients"]){
              //console.log(statusList["clients"][id]["STREAMS"]);
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
          for(let clientID in statusList["clients"]){
            for(let str in statusList["clients"][clientID].STREAMS){
              if(String(str) === String(statusList.streamStatus.streamCmd[strArr[1]])){
                statusList["clients"][clientID].STREAMS[str].RATE = rtnRate;
              }
            }
          }
          io.emit('statusFromServer', statusList)
          io.emit('cmdFromServer',{
            cmd: "SAMPLERATE",
            property: 0
          })
          /*
          io.emit('textFromServer',{
            text: "SAMPLE RATE(" + String(statusList.streamStatus.streamCmd[strArr[1]])+"):"+String(rtnRate) + "Hz",
            alert: false,
            timeout: true
          })
          */
          console.log(strArr[1] + " SAMPLERATE: " + String(rtnRate))
        } else if(strArr[1] === "DRUM") {
          let rtnRate = "";
          let targetStream = statusList["streamStatus"]["streamCmd"];
          rtnRate = calcRate(Number(statusList.sampleRate.KICK))
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
            if(statusList.clients !== undefined) {
              console.log(statusList.clients)
              for(let clientID in statusList.clients){
                console.log(clientID)
                console.log(statusList.clients[clientID])
                if(statusList.clients[clientID].STREAMS[key] !== undefined) statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
              }
            }
          }
          io.emit('cmdFromServer', {
            cmd:"SAMPLERATE",
            property:Number(rtnRate)
          })
          /*
          io.emit('textFromServer',{
            text: "SAMPLE RATE: " + String(rtnRate) + "Hz",
            alert: false,
            timeout: true
          })
          */
          console.log("SAMPLERATE: " + String(rtnRate))
        } else if(strArr[1] === "RANDOM") {
          let rtnRate = "RANDOM"
          for (let key in statusList["sampleRate"]){
            statusList["sampleRate"][key] = rtnRate;
            for(let clientID in statusList["clients"]){
                statusList["clients"][clientID]["STREAMS"][key]["RATE"] = String(rtnRate);
            }
          }
          console.log("SAMPLERATE: RANDOM")
        }
        break;
      case "ALL":
        //if(strArr[1] === "RECORD" || strArr[1] === "PLAYBACK" || strArr[1] === "REC" || strArr[1] === "PLAY") {
          //io.emit("cmdFromServer", {cmd: strArr[1], property:"local"})
        //} else {
        let targetStrm = statusList.streamStatus.streamCmd[strArr[1]]
        let targetCmd = cmdSelect(strArr[1])
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
        } else if(targetCmd != false) {
          console.log("ALL client cmd: " + targetCmd)
          io.emit('cmdFromServer', targetCmd)
        } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
          io.emit('cmdFromServer', {"cmd": "SINEWAVE", "property": strArr[1]})
          console.log("ALL client cmd: SINEWAVE")
        }
        //}
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
          console.log(str)
          exportComponent.roomEmit(io, 'textFromServer', {"text":str, "alert":false}, statusList["cmd"]["target"]);
          io.emit("textFromServer", {
            "text": str,
            "alert": false,
            "timeout": true
          });
        }
        break;
      case "GRID":
        if(statusList.streamStatus.streamCmd[strArr[1]] != undefined){
          let strm = statusList.streamStatus.streamCmd[strArr[1]]
          let str = strm + ": "
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
          str = str + "GRID"
          console.log(str)
          io.emit("textFromServer", {
            "text": str,
            "alert": false,
            "timeout": true
          });
        }
        break
      case "STOP":
      case "OFF":
        for(let key in statusList["streamStatus"]["streamCmd"]){
          if(strArr[1] === key){
          //  console.log("stream stop");
            statusList.streamStatus.streamFlag[statusList.streamStatus.streamCmd[key]] = false
            toOsc("stop", key)
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
        }
        break;
        /*
      case "EXPORT":
        for(let key in statusList.streamStatus.streamCmd){
          console.log(key)
          if(strArr[1] === key){
            console.log("test now")
            //audioBuff[key].forEach((element,index) => {
              fs.writeFile('/Users/knd/Downloads/' + key + '_AudioOut' + '.txt', audioBuff[key][0]);
            //})
            //videoBuff[key].forEach((element, index) =>{
              fs.writeFile('/Users/knd/Downloads/' + key + '_VideoOut' + '.txt', videoBuff[key])
            //})
          }
        }
        break;
*/
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
        }
        break;
      case "SWITCH":
        /*
        if(strArr[1] === "INIT") {
          const board = new arduino.Board()
          let relay = null
          board.on('ready', () => {
            console.log("johnny five relay connected, NC open");
            relay = new arduino.Led(13);
            relay.on();
            setTimeout(()=>{
              relay.off();
              },500);
          });
        } else*/ if(strArr[1] === "ON") {
          if(relay !== null && !statusList.cmd.now.SWITCH) {
            relay.on()
          }
        } else if(relay !== null && strArr[1] === "OFF") {
          if(statusList.cmd.now.SWITCH) {
            relay.off()
          }
        }
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
          //  console.log("debug VOICE JP")
            lang = "ja-JP"
            io.emit('cmdFromServer', {
              "cmd": "VOICE",
              "property": lang
            })
            break;
          case "EN":
          case "ENGLISH":
            lang = 'en-US'
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
                if(statusList.clients[Id].STREAMS.RECORD.FROM) json = cmd
              } else {
                json = cmd;
              }
            } else if(isNaN(Number(strArr[1])) === false && strArr[1] != ""){
              json = sineWave(strArr[1]);
            }
            console.log(String(Id) + " cmd:" + cmd.cmd)
            for(let key in statusList.streamStatus.streamCmd){
              if(key === strArr[1]) {
                //console.log(strArr[1])
                //console.log(Id)
                json.cmd = statusList.streamStatus.streamCmd[strArr[1]]
                for (let sockID in statusList.clients){
                  let flag = false
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
                      //console.log("debug++++"+json.cmd)
                      setTimeout(()=>{
                        streamReq(json.cmd, String(Id))
                      },800)
                  }
                }
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
                io.emit("statusViewFromServer");
                io.to(Id).emit("cmdFromServer", json);
              }
            }
          } else if(strArr[strArr.length - 1] === "CHAT") {
            let targetArr = []
            for(let id in statusList.clients){
              statusList.clients[id].STREAMS[statusList.cmd.stream[strArr[strArr.length - 1]]].FROM = false
              statusList.clients[id].STREAMS[statusList.cmd.stream[strArr[strArr.length - 1]]].TO = false
            }
            for(let i=0;i<(strArr.length - 1);i++){
              //console.log(i)
              if(isNaN(Number(strArr[i])) === false && strArr[i] != ""){
                let targetID = targetNoSelect(Number(strArr[i]))
                //console.log(targetID)
                if(targetID) {
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
            statusList["streamStatus"]["streamFlag"]["CHAT"] = true
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
     //           console.log("debug")
              },800)
            //}
          } else if(strArr[1] === "INPUT" || strArr[1] === "MIC" || strArr[1] === "OUTPUT" || strArr[1] === "SPEAKER" && (isNaN(Number(strArr[2])) === false && strArr[2] != "")){
            let targetAddress = "0.0.0.0"
            for(let id in statusList.clients){
              if(Number(strArr[0]) === statusList.clients[id].No) {
                targetAddress = statusList.clients[id].ipAddress
                if(targetAddress != "0.0.0.0"){
                  if(statusList.clients[id].server) postHTTP(strArr[1], Number(strArr[2]), targetAddress)
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
            console.log(timeArr)
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
                  console.log(cmdString)
                  charFromClient(13,cmdString,randomId, true) //enterを送ったのと同義にしている
                } else {
                  cmdString = strArr[1]
                  console.log(cmdString)
                  charFromClient(13,cmdString,randomId, true) //enterを送ったのと同義にしている
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
  if(String(sockID) in statusList.clients){
  //console.log(statusList.clients[String(sockID)].STREAMS[target])
  if(statusList["streamStatus"]["streamFlag"][target]){
      if(sockID in statusList.clients){
        setTimeout(()=>{
          let idArr = [];
          let targetID = ""
          //if(statusList["streamStatus"]["streamFlag"][target]){
            switch(target){
              case "CHAT":
                idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList.clients, target, "FROM", sockID);
        //        console.log(idArr)
                targetID = idArr[Math.floor(Math.random() * idArr.length)]
                io.to(targetID).emit('streamReqFromServer', "CHAT");
                //}
                break;
                /*
              case "TIMELAPSE":
                idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO", "dummyID");
                let json = {
                  "audio": movBuff.TIMELAPSE.audio.shift(),
                  "video": movBuff.TIMELAPSE.video.shift()
                }
                movBuff.TIMELAPSE.audio.push(json.audio)
                movBuff.TIMELAPSE.video.push(json.video)
                json.glitch = statusList.streamStatus.glitch.TIMELAPSE
                json.source = String(sockID)
                if(idArr.length > 0){
                  targetID = idArr[Math.floor(Math.random() * idArr.length)];
                  if(statusList.clients[String(targetID)].STREAMS[target].RATE != "RANDOM") {
                    json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][target]["RATE"]);
                  } else {
                    json["sampleRate"] = Math.ceil(Math.random() * 8) * 11025
                  }
                  //console.log(json)
                  if("video" in json && json.glitch) json = exportComponent.glitchStream(json);
                  io.to(targetID).emit('chunkFromServer', json);
                  timeLapseLength++;
                } else {
                  console.log("no timelapse target");
                }
                break;
                */
              default: //PLAYBACK,TIMELAPSE,DRUM,SILENCEも含む  //1008はTimelapseは含まず
                idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], target, "TO", "dummyID");
                //console.log(idArr)
                if(idArr.length > 0){
                  let json = {}
                  if(statusList.streamStatus.emitMode != "RANDOM"){
                    json.audio = movBuff[target].audio.shift()
                    movBuff[target].audio.push(json.audio)
                    if(movBuff[target].video != undefined) {
                      json.video = movBuff[target].video.shift()
                      //console.log(json.video)
                      movBuff[target].video.push(json.video)
                    }
                  } else {
                    let randomNum = Math.floor(Math.random() * movBuff[target].audio.length)
                    json.audio = movBuff[target].audio[randomNum]
                    if(movBuff[target].video != undefined && movBuff[target].video.length > randomNum) {
                      json.video = movBuff[target].video[randomNum]
                    }
                  }
                  json.target = target
                  json.glitch = false
                  targetID = idArr[Math.floor(Math.random() * idArr.length)];
                  if(statusList.clients[String(targetID)].STREAMS[target].RATE != "RANDOM") {
                    json["sampleRate"] = Number(statusList["clients"][String(targetID)]["STREAMS"][target]["RATE"]);
                  } else {
                    json["sampleRate"] = Math.ceil(Math.random() * 8) * 11025
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
                  io.to(targetID).emit('chunkFromServer', json);
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
  } else if(target === "droneChat") {
    //console.log("stream request for droneChat");
    io.emit('streamReqFromServer', "droneChat");
  }
  }
  /*
  statusList.streamStatus.timer[target] = true
  console.log("streamreq timer false")
  console.log(statusList.streamStatus.streamFlag)
  setTimeout(() => {
    if(statusList.streamStatus.streamFlag && statusList.streamStatus.timer[target]) {
      streamReq(target,sockID)
  console.log(statusList.streamStatus.streamFlag)
      console.log("streamreq timer streamreq again")
    } 
  },5000)
  */
}

const chunkFromClient = (data, sourceId) => {
  if(data.target != "DRONECHAT"){
    /*
    let json = {
      "glitch": false
    };
    */
    if(data.target === "CHAT") {
      if(data.audio != "" && data.video != "") {
        movBuff.CHAT.push({"id":sourceId, "audio": data.audio, "video": data.video})
        /*
        const img = new Image()
        img.src = data.video
        console.log(img)
        let imgData = img.createImageData(240,120)
        console.log(imgData)
        const code = jsQR(img, 240, 120)
        if(code) {
          console.log("Found QR code", code);
        }
        */
      }
    } else {
      //console.log(movBuff[data.target])
      if(data.target && data.audio != "" && data.video != ""){
        movBuff[data.target].audio.push(data.audio)
        movBuff[data.target].video.push(data.video)
      }
    }
    let sampleRate = "44100"
    if(sourceId in statusList.clients) sampleRate = String(statusList["clients"][sourceId]["STREAMS"]["CHAT"]["RATE"]);
    if(sampleRate === "RANDOM") {
      sampleRate = String(Math.ceil(Math.random() * 8) * 12000)
    }
    if(statusList.streamStatus.streamFlag.CHAT){
      let idArr = []
      idArr = exportComponent.pickupTarget(io.sockets.adapter.rooms, statusList["clients"], "CHAT", "TO", sourceId)
      //console.log(idArr);
      if(idArr.length > 0){
        let clientRate = false;
        idArr.forEach((element, index) => {
          if(String(element) in statusList.clients && statusList.clients[String(element)].STREAMS.CHAT.RATE != Number(statusList.sampleRate.CHAT)) clientRate = true
        })
        let json = {}
        if(movBuff.CHAT.length > 0){
          if(!statusList.streamStatus.chatSequence){
            json = movBuff.CHAT.shift()
          } else {
            movBuff.CHAT.some((element, index)=>{
              if(element.id === sourceId){
                json = element
                movBuff.splice(index,1)
                return true
              }
            })
          }
        }
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
        if(statusList.clients[String(targetID)] != undefined) statusList["clients"][String(targetID)]["STREAMS"]["CHAT"]["ACK"] = false;
      } else {
        statusList["streamStatus"]["waitCHAT"] = true;
      }
    }
  } else { //DRONECHAT
    data.sampleRate = 44100;
    data.gain = 1;
    data.source = String(sourceId)
    for(let distinationId in io.sockets.adapter.rooms){
      if(droneRoute[sourceId] === String(distinationId)){
        io.to(distinationId).emit('chunkFromServer',data);
      }
    }
  }
  //console.log(movBuff.CHAT.length)
}


const stopFromServer = () => { 
      toOsc("stop","CHAT")
      toOsc("stop", "PLAYBACK")
      toOsc("stop", "TIMELAPSE")
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
  for(let id in statusList.clients){
    statusList.clients[id].cmd.cmd = "none"
    statusList.clients[id].cmd.timestamp = 0
  }
  movBuff.CHAT = []
  //statusList.faceDetect = false
  //io.
  /*
  audioBuff["CHAT"] = [];
  videoBuff["CHAT"] = [];
  */
  io.to("ctrl").emit('statusFromServer', statusList);
  strings = "";
}

const cmdSelect = (strings) => {
  let cmd = false;
  for(let key in statusList["cmd"]["list"]){
    if(strings === key){
      cmd = {"cmd": statusList["cmd"]["list"][key]};
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
    for(let clientId in statusList["clients"]){
      if(statusList["clients"][clientId]["No"] === i && String(key) === clientId){
        rtnId = key;
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
          movBuff[filename] = {"audio":[],"video":[]}
        }
        //console.log(f);
        //console.log(process.env.HOME + libDir + f)
        let fnameArr = f.split(".");
        switch(fnameArr[1]) {
          case "mov":
          case "MOV":
          case "mp4":
          case "MP4":
            videoImport(fnameArr[0],fnameArr[1],libDir,ss,t);
//            Promise.resolve().then(videoImport(fnameArr[0],fnameArr[1],libDir)).then(audioConvert(fnameArr[0], fnameArr[1], libDir)).then(imgConvert(fnameArr[0],fnameArr[1],libDir)).then(rmFiles(fnameArr[0],"aac",libDir))
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
  //return new Promise((resolve, reject) => {
  let imgConvert = 'ffmpeg -i ' + process.env.HOME + libDir + filename + '.' + filetype + ' -ss ' + ss + ' -t ' + t + ' -r 3 -f image2 "' + process.env.HOME + libDir + '%06d.jpg"';
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
              //console.log(process.env.HOME + libDir + f)
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
  console.log("debug rm")
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
  //console.log(url);
  //console.log(rmExec);
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
  for(let key in statusList["clients"]){
    statusList["clients"][key]["STREAMS"][strFilename] = {"TO": true, "arr": 0, "LATENCY": 0, "RATE": 44100};
  }
  io.emit('streamListFromServer', statusList["streamStatus"]["streamCmd"]);
  //console.log(statusList);
}

const recordCmd = (file,id,data) => {
  let dt = new Date();
  fs.appendFile(file, ',\n  "' + dt.toFormat("YYYY/MM/DD HH24:MI:SS") + '": {"' + id + '": "' + data + '"}', (err) => {
    if(err) throw err;
  });
  logArr.push('<b>' + data + '</b> ' + id + '  ' + dt.toFormat("YYYY/MM/DD HH24:MI:SS"))
  if(Object.keys(io.sockets.adapter.rooms).indexOf("log") != -1){
    io.to("log").emit('logFromServer', logArr)
  }
}

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

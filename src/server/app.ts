import * as fs from 'fs'
import * as child_process from "child_process";
const exec = child_process.exec
import * as os from 'os'
import * as util from 'util'

import { default as Express } from "express"
import * as path from "path"
import { default as favicon } from 'serve-favicon'

import * as Https from 'https'
import { Server } from "socket.io"
import { statusList, pathList, statusClient } from './statusList'
import { chatReceive } from './stream'

import { selectOtherClient, roomEmit, pickupTarget, pickCmdTarget, cmdSelect } from './route';
import { cmdEmit, sinewaveEmit, stopEmit } from './cmd';
import { charProcess } from './cmd'
import { streamEmit } from './stream';
import { states, chat_web } from './states'

import { buffStateType } from '../types/global';

// face
import { faceState } from './states';
import { sevenSinsType } from '../types/global';

//https鍵読み込み
const options = {
  key: fs.readFileSync(path.join(__dirname,'../../..','keys/chat/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname,'../../..', 'keys/chat/cert.pem'))
}


const app = Express();

app.use(Express.static(path.join(__dirname, '..', 'client')));
app.use(favicon(path.join(__dirname, '../..' ,'lib/favicon.ico')));

app.get('/', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'client.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})

app.get('/snowleopard', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'snowLeopard.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})

app.get('/env', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'env.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})


app.get('/audioWorklet', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'audioWorkletClient.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})

app.get('/main', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'main.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})

app.get('/ctrl', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'ctrl.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})


app.get('/three', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'three.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})

/*
app.get('/orientation', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'orientation.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})
*/
app.get('/face', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'face.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})

app.get('/vosk', function(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'vosk.html'));
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Something went wrong" });
  }
})


const port = 8888;
const httpsserver = Https.createServer(options,app).listen(port);
const io = new Server(httpsserver)

if("en0" in os.networkInterfaces()){
  console.log("server start in " + os.networkInterfaces().en0[0]["address"] + ":" + String(port));
} else {
  console.log("server start in localhost:8888")
//  statusList.ipAddress = "localhost:8888"
}

let strings = "";
const previousFace = {x: 0, y: 0}

io.sockets.on('connection',(socket)=>{
  socket.on("connectFromClient", (data) => {
    if(data === 'client') {
      if(!states.stream.timelapse) states.stream.timelapse = true 
      const sockId = String(socket.id);
      console.log('socket.on("connectFromClient", (data) => {data:' + data + ', id:' + sockId + '}')
      if(!states.client.includes(sockId)) states.client.push(sockId)    
      states.client = states.client.filter((id) => {
        //console.log(io.sockets.adapter.rooms.has(id))
        if(io.sockets.adapter.rooms.has(id)) {
          return id
        }
      })
      // METRONOMEは接続時に初期値を作る
      states.cmd.METRONOME[sockId] = 1000
      console.log(states.client)
      socket.emit('debugFromServer')
    } else if(data === 'env') {
      const sockId = String(socket.id);
      console.log('socket.on("connectFromClient", (data) => {data:' + data + ', id:' + sockId + '}')
      if(!states.env.includes(sockId)) states.env.push(sockId)    
      states.env = states.env.filter((id) => {
        //console.log(io.sockets.adapter.rooms.has(id))
        if(io.sockets.adapter.rooms.has(id)) {
          return id
        }
      })
      // METRONOMEは接続時に初期値を作る
      states.cmd.METRONOME[sockId] = 1000
      console.log(states.client)
      socket.emit('connectAckFromServer')
    }

  });
  socket.on('charFromClient', (character) =>{
    strings = charProcess(character,strings, socket.id, io, states);
  });
  socket.on('chatFromClient', (buffer: buffStateType)=>{
    console.log(states.current.stream)
    chatReceive(buffer, io)
  });
  socket.on('streamReqFromClient', (source:string) => {
    console.log(source)
    if(states.current.stream[source]) {
      streamEmit(source, io, states)
    }
  })

  socket.on('connectFromCtrl', () => {
    io.emit('gainFromServer', states.cmd.GAIN)
  })

  socket.on('gainFromCtrl', (gain: {target: string, val: number}) => {
    console.log(gain)
    states.cmd.GAIN[gain.target] = gain.val
    io.emit('gainFromServer', states.cmd.GAIN)
  })

  /*
  socket.on('orientationFromClient', (deviceorientation) => {
    console.log(deviceorientation)
    io.emit('orientationFromServer', deviceorientation)
  })
  */


  // face
  socket.on('faceFromClient', (data) => {
    console.log(data)
    //cmdEmit("CLICK", io, states)
    if(data.detection) {
      //if(!faceState.flag) faceState.flag = true
      const speed = (data.box._x - faceState.previousFace.x)^2 + (data.box._y - faceState.previousFace.y)^2
      faceState.previousFace.x = data.box._x
      faceState.previousFace.y = data.box._y
      console.log(previousFace)
      console.log("speed :" + String(speed))
      // console.log(speed)
      const targetClient = states.client[0]
      console.log(targetClient)
      switch(faceState.expression) {
        case "no expression":
          if(!faceState.flag) {
            streamEmit("EMPTY", io, states)
            // send empty
            faceState.flag = true
          }
          break
        case "gluttony":
          console.log('whitenoise')
          cmdEmit("WHITENOISE", io, states)
          break
        case "greed":
          console.log('click')
          cmdEmit("CLICK", io, states)
          break
        case "envy":
          if(!faceState.flag) {
            sinewaveEmit(String(data.box._x + data.box._y), io, states)
            /*
            console.log('chat')
            streamEmit("CHAT", io, states)
            */
            faceState.flag = true
          }
          break
        case "lust":
          if(!faceState.flag) {
            console.log('bass')
            cmdEmit("BASS", io, states)
            faceState.flag = true
          }
          break
        case "wrath":
          console.log('sinewave')
          // send sinewave(frequency: speed)
          break
        case "pride":
          if(!faceState.flag) {
            console.log('feedback')
            cmdEmit("FEEDBACK", io, states)
            faceState.flag = true
          }
          break
        case "sloth":
          if(!faceState.flag) {
            // send playback
            streamEmit("PLAYBACK", io, states)
            faceState.flag = true
          }
          break
      }
      //io.to(states.client[0]).emit('squareFromServer', speed)  
    } else {
      if(faceState.expression !== 'greed') {
        stopEmit(io, states)
      }
      faceState.previousFace.x = 0
      faceState.previousFace.y = 0
      faceState.flag = false
    }
  })
  socket.on('expressionFromClient', (data: sevenSinsType) => {
    console.log(data)
    faceState.expression = data
    faceState.flag = false
    // strings = charProcess(data,strings, socket.id, io, states);

    /*
    states.cmd.VOICE.forEach((element) => {
      io.to(element).emit('voiceFromServer', {text: data, lang: states.cmd.voiceLang})
    })
    */
      

  })

  socket.on("disconnect", () =>{
    console.log('disconnect: ' + String(socket.id));
    let sockId = String(socket.id);
    states.client = states.client.filter((id) => {
      if(io.sockets.adapter.rooms.has(id) && id !== sockId) {
        console.log(id)
        return id
      }
    })
    console.log(states.client)
    io.emit("statusFromServer",statusList);
  });
});

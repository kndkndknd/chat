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
import { charProcess } from './cmd'
import { streamEmit } from './stream';
import { states, chat_web } from './states'

import { buffStateType } from '../types/global';

// websocket
/*
import { WebSocket } from 'ws'
if(states.web.flag && states.web.type === 'websocket') {
  const ws = new WebSocket(states.web.url)  
}
*/


//https鍵読み込み
const options = {
  key: fs.readFileSync(path.join(__dirname,'../../..','keys/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname,'../../..', 'keys/cert.pem'))
  // key: fs.readFileSync(process.env.HOME + '/keys/privkey.pem'),
  // cert: fs.readFileSync(process.env.HOME + '/keys/cert.pem')
}


const app = Express();
/*
app.set('views', path.join(__dirname, '../..', 'views'));
app.engine('html', require('ejs').renderFile);
*/
app.use(Express.static(path.join(__dirname, '..', 'client')));
app.use(favicon(path.join(__dirname, '../..' ,'lib/favicon.ico')));

app.get('/', function(req, res, next) {
  //res.render('ts.html')
  try {
    res.sendFile(path.join(__dirname, '../client/static', 'client.html'));
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
io.sockets.on('connection',(socket)=>{
  socket.on("connectFromClient", (data) => {
    if(!states.stream.timelapse) states.stream.timelapse = true 
    let sockId = String(socket.id);
    console.log('socket.on("connectFromClient", (data) => {data:' + data + ', id:' + sockId + '}')
    if(!states.client.includes(sockId)) states.client.push(sockId)
    
    states.client = states.client.filter((id) => {
      //console.log(io.sockets.adapter.rooms.has(id))
      if(io.sockets.adapter.rooms.has(id)) {
        return id
      }
    })
    console.log(states.client)
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

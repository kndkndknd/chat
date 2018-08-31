const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const favicon = require('serve-favicon');
const dateUtils = require('date-utils');

//const routes = require('./routes/index');
//const users = require('./routes/users');

//const pcm = require('pcm');
const exec = require('child_process').execSync;
const os = require('os');
const request = require('request');
const http = require('http');
const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(favicon(path.join(__dirname, 'lib/favicon.ico')));

// arduino control
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


//app.use('/', routes);
// let cli_no = 0;
/* GET home page. */

let osInfo =String(os.type());
console.log(osInfo)

const gainGet = (os) =>{
  if(os === "Darwin" || os.indexOf("Mac") > -1){
    let stdarr = exec('osascript -e "get volume settings"').toString().split(",")
    let rtnHash = {
      "input": Number(stdarr[1].split(":")[1]),
      "output": Number(stdarr[0].split(":")[1]),
    }
    return rtnHash
  } else if(os.indexOf("Linux") > -1) {
    let stdout = exec('amixer sget Mic').toString().split("[")[1].replace("%] ","")
    let rtnHash = {
    "input":Number(stdout)
    }
    stdout = exec('amixer sget Master').toString().split("[")[1].replace("%] ","")
    rtnHash["output"] = Number(stdout)
    return rtnHash
  }
}

const gainSet = (os, type, value) =>{
  if(os === "Darwin" || os.indexOf("Mac") > -1){
    if(value > 100) {
      value = 100
    } else if(value < 0){
      value = 0
    }
    let stdout = exec('osascript -e "set volume ' + type + ' volume ' + String(value) + '"').toString();
    return stdout
  } else if(os.indexOf("Linux") > -1){
    if(value > 100) {
      value = 100
    } else if(value < 0){
      value = 0
    //} else {
     // value = Math.round(64 * (value / 100))
    } 
    if(type === "input") {
      let stdout = exec('amixer sset Mic ' + String(value) + '%');
      return stdout
    }
  }
}

let pcGain = gainGet(osInfo)
console.log(pcGain)
/*gainSet("input", pcGain.input - 10)
pcGain = gainGet()
console.log(pcGain)
*/

app.get('/', (req, res) =>{
  res.render('check');
})

app.post('/', function(req, res){
  console.log(req.body);
  console.log(req.headers.host.split(":")[0]);
  res.send('POST is sended')
  let rtn = {}
  switch(req.body.type) {
    case "SWITCH":
      if(board.isReady){
        let relay = new five.Led(13);
        if(boardSwitch) {
          boardSwitch = false;
          relay.off();
          console.log("switch off")
        } else {
          boardSwitch = true;
          relay.on();
          console.log("stitch on");
        }
      } else {
        console.log("arduino not ready");
      }
      break;
    case "MIC":
    case "INPUT":
      rtn.stdout = gainSet(osInfo,"input",req.body.value)
      pcGain = gainGet(osInfo)
      rtn = pcGain
      break;
    case "SPEAKER":
    case "OUTPUT":
      rtn.stdout = gainSet(osInfo,"output",req.body.value)
      pcGain = gainGet(osInfo)
      rtn = pcGain
      break;
    case "GAIN":
      switch(req.body.value){
        case "UP":
          rtn["stdout"] = gainSet(osInfo,"input",pcGain.input + 10)
          break;
        case "DOWN":
          rtn["stdout"] = gainSet(osInfo,"input",pcGain.input - 10)
          break;
      }
      pcGain = gainGet(osInfo)
      rtn = pcGain
      break;
  }
  console.log(rtn)

});
/*
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
*/

module.exportComponent = app;
let httpPort = 7777;
let httpServer = http.createServer(app).listen(httpPort);
if("en0" in os.networkInterfaces()){
  console.log("server start in " + os.networkInterfaces().en0[0]["address"] + ":" + String(httpPort));
  console.log("server start in " + os.networkInterfaces().en0[1]["address"] + ":" + String(httpPort));
} else {
  for(let key in os.networkInterfaces()){
    console.log("server start in " + os.networkInterfaces()[key][0]["address"] + ":" + String(httpPort))
    console.log("server start in " + os.networkInterfaces()[key][1]["address"] + ":" + String(httpPort))
  }
}

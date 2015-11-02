
/**
 * Module dependencies.
 */
var express = require ('express'),
    http = require('http'),
    path = require('path');
var fs = require('fs');
var expo = require('./export.js');
var pcm = require('pcm');
var images = require('./public/images/image.json');

var emittype = 2;
var speak_flag = false,
    sampleRate = 22050,
    bufferSize = 8192,
    jumpBit = 2;
var speedMode = "slow";
var emitMode = "no_emit";
var receiveMode = false;
var playMode = false;
var streamConsole = false;
var buffMode = false;
var mobileBPM = 100;
var mobiSwitch = true;
var streamBuff = {"stream":[], "video":[]};
var recordedBuff = {1:{"name": "none", "arr":[], "video":"spectrum"},2:{"name": "none", "arr":[], "video":"spectrum"},3:{"name": "none", "arr":[], "video":"spectrum"}, 4:{"name": "none", "arr":[], "video":"spectrum"}};
var fader = {"1":0, "2":0, "3":0, "4":0, "stream":1, "buff":0, "empty":0};
var transroom = {},
    mobileroom = {},
    ctrlroom = {};
var oscroom = {};
var loadBuff = [];
var recordedFile = [];


var app = express();

// all environments
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


app.get('/ctrl', function(req, res){
  var arr = [""];

  fs.readdir('./public/files', function(err, files){
    if (err) throw err;
    files.forEach(function (file) {
      arr.push(file);
      console.log(file);
    });
  res.render('ctrl', {
    title: 'ctrl',
    recordedFile: arr
  });

  });
});

app.get('/rec', function(req, res){
  res.render('rec',{
    title: 'wav recording',
    buff: recordedBuff["arr"].shift()
  });
});


app.get('/', function(req, res){
  res.render('client',{
    title: 'client', 
    init_speak: speak_flag,
    init_rate: sampleRate,
    init_jump: jumpBit,
    init_size: bufferSize,
    speedMode: speedMode,
    emitMode: emitMode,
    receiveMode: receiveMode,
    playMode: playMode,
    init_osc_vol: 0.5,
    init_osc_pitch: 440, 
    init_osc_portament: 0.1,
    init_osc_difftype: "none",
    init_osc_diffval: 0
  });
});

app.get('/mobile', function(req, res){
  res.render('mobile',{
    title: 'mobile',
    BPM: mobileBPM,
    sw: mobiSwitch
  });
});
var port = process.env.PORT || 3000;
var server = http.createServer(app).listen(port);

//socket.io
var io = require('socket.io').listen(server);


io.sockets.on('connection', function(socket) {
  //for wav import
  socket.on('importReq_from_client', function(data) {
    recordedBuff[data.target]["name"] = data.url.slice(15);
    recordedBuff[data.target]["arr"] = expo.sndImp(data.url,pcm,recordedBuff[data.target]["name"],bufferSize,io, data.target);
  });


  //for trans feedback
  socket.on('stream_from_client', function(data) {
    if(buffMode){
      streamBuff["stream"].push(data.stream);
      streamBuff["video"].push(data.video);
    }
    var strm = expo.slctCtrl(fader, data.stream, streamBuff, recordedBuff, data.video);
    expo.emtCtrl(socket.id, strm[0], data.emitMode, transroom[socket.id]["mobileMode"],io, socket, strm[1], transroom[socket.id]["selfMode"], strm[2]);
    if(streamConsole) {
      console.log(strm[0]);
      console.log(strm[1]);
    }
  });


  socket.on('modeCtrl_from_client', function(data){
    console.log(data);
    if(data.type ==="buff") {
      buffMode = data.mode;
      console.log("buffMode:" + String(data.mode) + "(length:" + String(streamBuff.length) + ")");
      io.sockets.to('ctrl').emit('status_from_server', {
        buffer: {
          "streamBuff_length": streamBuff.length, 
          "1_name": recordedBuff[1]["name"], 
          "1_length": recordedBuff[1]["arr"].length,
          "2_name": recordedBuff[2]["name"], 
          "2_length": recordedBuff[2]["arr"].length,
          "3_name": recordedBuff[3]["name"], 
          "3_length": recordedBuff[3]["arr"].length,
          "4_name": recordedBuff[4]["name"], 
          "4_length": recordedBuff[4]["arr"].length
        }
      });
    } else if(data.type ==="buffClear") {
      console.log("buff clear(length:" + String(streamBuff.length) + ")");
      streamBuff = [];
      io.sockets.to('ctrl').emit('status_from_server', {
        buffer: {
          "streamBuff_length": streamBuff.length, 
          "1_name": recordedBuff[1]["name"], 
          "1_length": recordedBuff[1]["arr"].length,
          "2_name": recordedBuff[2]["name"], 
          "2_length": recordedBuff[2]["arr"].length,
          "3_name": recordedBuff[3]["name"], 
          "3_length": recordedBuff[3]["arr"].length,
          "4_name": recordedBuff[4]["name"], 
          "4_length": recordedBuff[4]["arr"].length
        }
      });
    } else if(data.type ==="audioClear") {
      recordedBuff = {"name": "none", "arr": []};
      io.sockets.to('ctrl').emit('status_from_server', {
        buffer: {
          "streamBuff_length": streamBuff.length, 
          "1_name": recordedBuff[1]["name"], 
          "1_length": recordedBuff[1]["arr"].length,
          "2_name": recordedBuff[2]["name"], 
          "2_length": recordedBuff[2]["arr"].length,
          "3_name": recordedBuff[3]["name"], 
          "3_length": recordedBuff[3]["arr"].length,
          "4_name": recordedBuff[4]["name"], 
          "4_length": recordedBuff[4]["arr"].length
        }
      });
    } else if(data.type === "mobi") {
      if(data.target === "all"){
	for (key in transroom) {
	  transroom[key]["mobileMode"] = data.mode;
	}
      } else {
	transroom[data.target]["mobileMode"] = data.mode;
      }

    } else if(data.type === "mbsw") {
      if(data.target === "all") {
	      for (key in mobileroom) {
	        mobileroom[key]["switch"] = data.mode;
	      }
        io.sockets.to('mobile').emit('mobiCtrl_from_server',{
          mode: "sw",
          val: data.mode
        });
        mobiSwitch = data.mode;
      }    
    } else {
      expo.ctrlCtrl(socket, io, transroom, data.target, data.mode, data.type, fader);
    }
  });

  socket.on('faderCtrl_from_client', function(data){
    fader[data.target] = Number(data.val);
    console.log(fader);
  });
  socket.on('rangeCtrl_from_client', function(data){
    console.log(data);
    if(data.mode==="fader"){
    fader[data.target] = Number(data.val);
    console.log(fader);
    } else if(data.mode === "mobiBPM") {
      if(data.val === 0) {
        var sendval = 0;
      } else {
        var sendval = Math.floor(15000/data.val);
      }
      io.sockets.to('mobile').emit('mobiCtrl_from_server', {
        mode: "BPM",
        val: sendval
      });
    }
  });
  socket.on('audioCtrl_from_client', function(data){
    console.log(data);
    if(data.type = "rate") {
      if(data.target === "all") {
        for ( key in transroom) {
          transroom[key]["sampleRate"] = data.mode;
          io.sockets.emit('rateCtrl_from_server', data.mode);
        }
      } else {
        transroom[data.target]["sampleRate"] = data.mode;
        socket.to(data.target).json.emit('rateCtrl_from_server', data.mode);
      }
    } else if(data.type = "buff") {
      if(data.target === "all") {
        for ( key in transroom) {
          transroom[key]["bufferSize"] = data.mode;
          io.sockets.emit('buffCtrl_from_server', data.mode);
        }
      } else {
        transroom[data.target]["bufferSize"] = data.mode;
        socket.to(data.target).json.emit('buffCtrl_from_server', data.mode);
      }
    }

    console.log(transroom);
    io.sockets.to('ctrl').emit('status_from_server', {
      transroom: transroom,
      fader: fader,
      buffer: {"streamBuff_length": streamBuff.length, "recordedBuff_name": recordedBuff[1]["name"], "recordedBuff_length": recordedBuff[1]["arr"].length}
    });
  });

  socket.on('oneshotCtrl_from_client', function(data) {
    if(data.type==="load"){
      if(data.src === "recorded") {
        var start = Math.floor(Math.random() * (recordedBuff[1]["arr"].length - 10));
        loadBuff = recordedBuff[1]["arr"].slice(start,start + 10);
      } else if(data.src === "buff"){
        var start = Math.floor(Math.random() * (streamBuff.length - 10));
        loadBuff = streamBuff.slice(start,start + 10);
      }

      console.log("start point:" + String(start));
      socket.to(data.target).json.emit('oneshotCtrl_from_server', {
        type: data.type,
        loadBuff: loadBuff
      });
    } else if(data.type === "trig") {
      if(data.target === 'all') {
        io.sockets.emit('oneshotCtrl_from_server', {
          type: data.type
        });
      } else {
        socket.to(data.target).json.emit('oneshotCtrl_from_server', {
          type: data.type
        });
      }
    } else if(data.type === "notice_load") {
      console.log('oneshotBuffer loaded');
      io.sockets.to('ctrl').emit('oneshotCtrl_from_server', {
        type: data.type,
        from: socket.id
      });
    }
  });
  socket.on('oscCtrl_from_client', function(data) {
    console.log(data);
    if(data.type == "frd"){
      var arr = [];
      for(key in oscroom) {
        arr.push(key);
      }
      var basefrq = oscroom[arr[0]]["frequency"];
      if (data.diffmode === 'mod') {
        if(data.val < 5){
          var beki = Math.pow(10,data.val-3);
        } else {
          var beki = 110;
        }
        for(var i=0;i<arr.length;i++){
          var frq = basefrq + ((i + 1) * beki);
          oscroom[arr[i]]['frequency'] = frq;
          socket.to(arr[i]).json.emit('oscCtrl_from_server', {
            type: 'diff',
            val: frq
          });
        }
      } else if(data.diffmode === 'hrmn') {
        if(data.val < 4) {
          for(var i=0;i<arr.length;i++){
            var frq = basefrq * Math.pow(2, ((i*data.val) / 12));
            oscroom[arr[i]]['frequency'] = frq;
            socket.to(arr[i]).json.emit('oscCtrl_from_server', {
              type: 'diff',
              val: frq
            });
          }
        } else {
          var n = (data.val-3)/2;
          for(var i=0;i<arr.length;i++){
            var frq = basefrq * n * (i+1);
            oscroom[arr[i]]['frequency'] = frq;
            socket.to(arr[i]).json.emit('oscCtrl_from_server', {
              type: 'diff',
              val: frq
            });
          }
        }
      }
    } else if(data.type === "ltc") {
      var val = data.val;
      for(key in oscroom) {
        if(data.random) 
          val = (val * 0.5) + (val * Math.random());
        socket.to(key).json.emit('oscCtrl_from_server', {
          type: 'latency',
          val: val
        });
      }
      if(data.mode === "random") 
        val = val + (val * Math.random());
    } else {
      if(data.target === "all") {
        io.sockets.emit('oscCtrl_from_server', data);
        if(data.type == "vol"){
          for(key in oscroom) {
            oscroom[key]["volume"] = data.val;
          }
        }
      } else {
        socket.to(data.target).json.emit('oscCtrl_from_server',data);
      }
    }


  });

  socket.on('recorderCtrl_from_client', function(data) {
    console.log(data);
    io.sockets.emit('recorderCtrl_form_server', data);
  });

  socket.on('recordedURL_from_client', function(data){
    console.log(data);
    io.sockets.emit('recordedURL_from_server', data);
  });
  //for all client(status check)
  socket.on('status_from_client', function(data) {
    expo.sttsCtrl(data, socket, io, transroom, ctrlroom, mobileroom,fader, streamBuff, recordedBuff);

    if(data.type==="trans")
      expo.oscStts(socket, io, oscroom);
  });

  //for debug
  socket.on('debugCtrl_from_client', function(data) {
    if (data.type==="allClear") {
      console.log(data);
      for (key in transroom) {
        transroom[key]["emitMode"] = "no_emit";
        transroom[key]["receiveMode"] = false;
        transroom[key]["playMode"] = false;
      }
      io.sockets.emit('clear_from_server',data);
    } else if (data.type==="buffClear") {
      console.log(data);
      io.sockets.emit('clear_from_server',data);
    } else if (data.type==="valueCheck") {
      console.log("transroom:");
      console.log(transroom);
      console.log("fader:" + JSON.stringify(fader));
      console.log("streamBuff:" + String(streamBuff.length));
      console.log("1:" + recordedBuff[1]["name"] + "..." + String(recordedBuff[1]["arr"].length));
    } else if (data.type==="streamconsole") {
      console.log(data.consoleCtrl);
      streamConsole = data.consoleCtrl;
    } else if (data.type==="result") {
      console.log(data);
    }
  });
  socket.on("disconnect", function () {
    console.log("disconnect: " + socket.id);
    if (socket.id in transroom) {
      delete transroom[socket.id];
    }
    io.sockets.to('ctrl').emit('status_from_server',{
      transroom: transroom,
      fader: fader,
      buffer: {
        "streamBuff_length": streamBuff.length, 
        "1_name": recordedBuff[1]["name"], 
        "1_length": recordedBuff[1]["arr"].length,
        "2_name": recordedBuff[2]["name"], 
        "2_length": recordedBuff[2]["arr"].length,
        "3_name": recordedBuff[3]["name"], 
        "3_length": recordedBuff[3]["arr"].length,
        "4_name": recordedBuff[4]["name"], 
        "4_length": recordedBuff[4]["arr"].length
      }
    });
  });
});

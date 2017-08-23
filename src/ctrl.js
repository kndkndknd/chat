// canvas関連
let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let buffer;
let bufferContext;
let stringsClient = "";
let modules = require('./module.js');

const sizeCtrl = () =>{
  $("#cnvs").attr({ height: $(window).height()/4 });
  $("#cnvs").attr({ width: $(window).width()/4 });
}


$(() => {
  sizeCtrl();
//  draw();
  $(window).resize(() =>{
    sizeCtrl();
//    draw();
  });
});


$(() =>{
  $(document).on("keydown", (e)=> {
    // let charCode = keycodeMap[String(e.keyCode)];
    // let charCode = modules.keycodeMap(String(e.keyCode));
    stringsClient = modules.keyDownFunc(e.keyCode, stringsClient, socket);
    modules.whitePrint(ctx, canvas);
    modules.textPrint(ctx, canvas, stringsClient);
    if(e.keyCode === 13){
      modules.whitePrint(ctx, canvas);
      stringsClient = "";
    }
  });
});

socket.emit('connectFromClient', title);

socket.on("statusFromServer", (data) =>{
  console.log("statusFromServer");
  connectedClientView(data["clients"]);
  connectedCtrlView(data["connected"]);
  sampleRateView(data["sampleRate"]);
  gainView(data["gain"]);
  cmdView(data["cmd"]);
});


// アロー関数にしない
$(function() {
  $(document).on('change', '.route', function(){
    let property = {
      "target" : $(this).attr('name'),
      "stream" : $(this).attr('id').split("_")[0],
      "val" : $(this).prop('checked')
    };
    console.log(property);
    socket.emit('cmdFromCtrl',{
      "cmd": $(this).attr('id').split("_")[1],
      "property": property
    });
  });
});

// ゲイン操作
$(function() {
  $(document).on('change', '.range', function(){
    // console.log("range change");
    let cmd;
    let property;
    if($(this).attr('id') != "CHATRATE"){
      cmd = $(this).attr('name');
      property = {
        "target" : $(this).attr('id'),
        "val" : $(this).val()
      };
      $('#' + cmd + property["target"] + 'Label').text(String(property["val"]));
    } else {
      cmd = "CHATRATE"
      property ={
        "target": $(this).attr('name'),
        "val" : $(this).val()
      };
    }
    // console.log(property);
    socket.emit('cmdFromCtrl',{
      "cmd": cmd,
      "property": property
    });
  });
});

$(function() {
  $(document).on("click", "#shutter", function(){
    socket.emit('cmdFromCtrl', {
      "cmd" : $(this).attr('id'),
      "property": "oneshot"
    });
  });
});



$(function() {
  $(document).on('change', '#uploadSubmit', () =>{
    let file = $("#uploadFile").val();
    console.log(file);
    socket.emit('uploadReqFromClient', file);
    $('#uploadSubmit').prop("checked",false);
    modules.textPrint(ctx, canvas, "upload");
  });
});


const sampleRateView = (sampleRate) => {
  $('#sampleRateList li').remove();
  for(let key in sampleRate){
    let sampleRateDetail = '<li>' + key + ': <label class="sampleRateLabel" id="sampleRate' + key + 'Label">' + String(sampleRate[key]) + '</label><input type="range" class="range" name="sampleRate" id="' + key + '" min="11025" max="88200" step="11025" value="' + sampleRate[key] + '" /></li>'
    $('#sampleRateList').append(sampleRateDetail);
  }
}


const cmdView = (cmdStatus) => {
  //現状の実施コマンド記載
  $('#cmd li').remove();
  for(let key in cmdStatus["now"]){
    //liをappendしていく。key: valueの形で
    if(key === "unmute"){
    } else {
      if(cmdStatus["now"][key]){
        $('#cmd').append('<li>' + key + ': <b>' + cmdStatus["now"][key] + '</b></li>');
      } else {
        $('#cmd').append('<li>' + key + ': ' + cmdStatus["now"][key] + '</li>');
      }
    }
  }
  //前回コマンド記載
  $('#prevCmd').text(cmdStatus["prevCmd"]);
  $('#cmdTimeLine').text(cmdStatus["prevTime"]);
}

const connectedClientView = (clients) =>{
  $('#clientList').find("tr:gt(0)").remove();
  for(let key in clients){
    console.log(clients[key]);
    var lastRow = $('#clientList tbody > tr:last').after('<tr id="clientTd"><td>'+ clients[key]["type"] + '</td><td id="IdTd">' + key + '</td><td><input type="checkbox" id="CHAT_FROM" class="route" name="' + key
    + '"></td><td><input type="checkbox" id="CHAT_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="RECORD_FROM" class="route" name="'
    + key + '"></td><td><input type="checkbox" id="PLAYBACK_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="TIMELAPSE_TO" class="route" name="'
    + key + '"></td><td><input type="checkbox" id="DRUM_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="SILENCE_TO" class="route" name="'
    + key + '"></td><td><input type="checkbox" id="SECBEFORE_TO" class="route" name="' + key + '"></td><td><label class="sampleRateLabel" id="CHATRATELabel" name="' + key + '">'
    + String(clients[key]["CHATRATE"]) + '</label><input type="range" class="range" id="CHATRATE" name="' + key + '" min="11025" max="88200" step="11025" value="'
    + clients[key]["CHATRATE"] + '" /></td></tr>');
    for(let status in clients[key]){
      console.log
      let toString = Object.prototype.toString;
      if(toString.call(clients[key][status]) === "[object Object]"){
        if("FROM" in clients[key][status] && clients[key][status]["FROM"]){
          $('input[name="' + key + '"]#' + status + '_FROM').prop("checked", true)
        }
        if("TO" in clients[key][status] && clients[key][status]["TO"]){
          $('input[name="' + key + '"]#' + status + '_TO').prop("checked", true)
        }
      }
    }
    /*
    if(clients[key]["CHAT"]["FROM"]){
      $('input[name="' + key + '"]#CHAT_FROM').prop("checked",true);
    }
    if(clients[key]["CHAT"]["TO"]){
      $('input[name="' + key + '"]#CHAT_TO').prop("checked",true);
    }
    */
  }
}

const connectedCtrlView = (connected) => {
  $("#status li").remove();
  if("ctrl" in connected){
    let connectedCtrl = "ctrl:";
    for(let key in connected["ctrl"]){
      connectedCtrl = connectedCtrl + " " + key;
    }
    $("#status").append("<li>" + connectedCtrl + "</li>");
  }
}

const gainView = (gain) => {
  $("#gainList li").remove();
  for(let key in gain) {
    let gainInfo = '<li>' + key.substr(0,key.length-4).toUpperCase() + ': <input type="range" name="gain" class="range" id="' + key + '" min="0" max="1" value="' + String(gain[key]) + '" step="0.05" /> <label id="gain' + key + 'Label" class="gainLabel">' + String(gain[key]) + '</label></li>';
    console.log(gainInfo);
    $("#gainList").append(gainInfo);
  }
}

const joinDetail = (hsh, detail) => {
  let connectedString = "";
  for(let key in hsh){
    connectedString = connectedString + " " + key;
    for(let item in detail){
      if(key === item){
        connectedString = connectedString + "(" + detail[item]["type"] + ")";
      }
    }
  }
  return connectedString;
}

const joinIds = (hsh, detail) => {
  let connectedString = "";
  for(let key in hsh) {
    if(hsh[key]) {
      connectedString = connectedString + key + " ";
    }
  }
  return connectedString;
}
/*
const textPrint = (str) => {
  console.log("text print");
  ctx.fillStyle = "black";
    if(str.length > 2) {
      ctx.font = "bold " + String(Math.floor((canvas.width * 4 / 3) / str.length)) + "px 'Arial'";
    } else {
      ctx.font = "bold " + String(Math.floor((canvas.height * 5 / 4) / str.length)) + "px 'Arial'";
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

const whitePrint = () => {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

*/

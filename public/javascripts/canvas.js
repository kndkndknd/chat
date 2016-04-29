var scrnMode = "video";
var canvas = document.getElementById('cnvs');
var ctx = canvas.getContext('2d');

$(function (){
  sizing();
  draw();
  $(window).resize(function(){
    sizing();
    draw();
  });
});

function draw() {
  if (!canvas || !canvas.getContext) return false;
  
  ctx.fillRect(0,0,canvas.width, canvas.height);
}

function sizing(){
  $("#cnvs").attr({height:$(window).height()});
  $("#cnvs").attr({width:$(window).width()});
}

function redraw(r,g,b) {
  ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";

  ctx.fillRect(0,0,canvas.width,canvas.height);
  setTimeout(function(){
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
  },400);
}

function renderStart() {
  video = document.getElementById('video');
  buffer = document.createElement('canvas');
  //var canvas_src = document.getElementById('canvas_src');
  bufferContext = buffer.getContext('2d');
  //var srcContext = canvas_src.getContext('2d');

  var render = function() {
    requestAnimationFrame(render);
    var width = video.videoWidth;
    var height = video.videoHeight;
    if(width == 0 || height ==0) {return;}
    //buffer.width = canvas_src.width = width;
    //buffer.height = canvas_src.height = height;
    buffer.width = width;
    buffer.height = height;
    bufferContext.drawImage(video, 0, 0);

    //socket.emit('video_from_client', 'fuck');
  }
  render();
    /*
  video.addEventListener("playing", function() {
    debug = buffer.toDataURL("image/webp");
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
    setInterval(sendVideo,1000);
  });*/
}

function sendVideo(){
//var sendVideo = function(){
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  //socket.emit("video_from_client", buffer.toDataURL("image/webp"));
  return buffer.toDataURL("image/webp");
}

var playVideo = function(video){
  if(video === "spectrum") {
    onScreenProcess();
  } else if(video != "none"){
    image = new Image();
    image.src = video;
    var wdth;
    var hght;
    if(receive.width > (receive.height*3/4)) {
      hght = receive.height;
      wdth = hght * 4 / 3;
    } else {
      wdth = receive.width;
      hght = wdth * 3 / 4;
    }
    image.onload = function(){
      receive_ctx.drawImage(image, 0, 0, wdth, hght);
      if(scrnMode === "flash") {
        setTimeout(function(){
          receive_ctx.fillStyle = "black";
          receive_ctx.fillRect(0,0,receive.width,receive.height);
        },400);
      }
    }
  } else {
        receive_ctx.fillStyle = "black";
        receive_ctx.fillRect(0,0,receive.width,receive.height);

  }
}

var animation;

var animationSelf = function(){
  var data = new Uint8Array(256);
  analyser.getByteFrequencyData(data);
  var r = data[148];
  var g = data[104];
  var b = data[44];
  ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  console.log("r:" + String(r));
  console.log("g:" + String(g));
  console.log("b:" + String(b));
  animation = requestAnimationFrame(animationSelf);
};
//animation();

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let buffer;
let bufferContext;

$(() => {
  sizing();
//  draw();
  $(window).resize(() =>{
    sizing();
//    draw();
  });
});

const draw=() =>{
  if (!canvas || !canvas.getContext) return false;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

const sizing=() =>{
  $("#cnvs").attr({ height: $(window).height() });
  $("#cnvs").attr({ width: $(window).width() });
}

const playVideo = (video) => {
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
    }
}
const renderStart=()=> {
  video = document.getElementById('video');
  buffer = document.createElement('canvas');
  bufferContext = buffer.getContext('2d');

  var render = function() {
    requestAnimationFrame(render);
    var width = video.videoWidth;
    var height = video.videoHeight;
    if(width == 0 || height ==0) {return;}
    buffer.width = width;
    buffer.height = height;
    bufferContext.drawImage(video, 0, 0);
  }
  render();
}

const sendVideo = () => {
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/webp");
}


const textPrint = (str) => {
  console.log("text print");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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

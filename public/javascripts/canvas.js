$(function (){
  sizing();
  draw();
  $(window).resize(function(){
    sizing();
    draw();
  });
});

  var canvas = document.getElementById('cnvs');
  var ctx = canvas.getContext('2d');
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
  },decay);
}

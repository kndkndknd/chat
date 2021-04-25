import {textPrint, erasePrint} from './imageEvent.js'
let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let buffer;
let bufferContext;

const halfSizing=() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight / 2) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
}

halfSizing;

socket.on('textFromServer', (data) => {
  console.log(data)
  erasePrint(ctx,canvas)
  textPrint(ctx,canvas,String(data.text))
})

let textListner = document.getElementById("text")
textListner.addEventListener('input', ((e) => {
  socket.emit("textFromClient", e.target.value)
}))

document.addEventListener('keydown', (e) => {
  if(e.key === "Enter"){
    textListner.value = ""
  }
})

// let eListener = document.getElementById("wrapper")
// eListener.addEventListener("click", initialize, false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  halfSizing()
})
// textPrint(ctx,canvas,"CLICK SCREEN")
import { io, Socket } from 'socket.io-client';
const socket: Socket = io();

socket.emit('connectFromCtrl')

socket.on('gainFromServer',(data) => {
  console.log(data)
  for(let key in data) {
    // const labelElement = document.getElementById(key + '_Label')
    // labelElement.innerText = String(data[key])
    const rangeElement = <HTMLInputElement> document.getElementById(key)
    rangeElement.value = data[key]
  }
})


const rangeChange = (e)=>{
  //const e = {"id":"dummy"}
  console.log(e.target.id)
  console.log("range change")

//  const ctrlCmd = e.target.eventParam.name
  const ctrlProperty = {
    "target" : e.target.id,
    "val" : e.target.value
  }
  const labelElement = document.getElementById(ctrlProperty.target + '_Label')
  labelElement.innerText = String(ctrlProperty.val)

  console.log(ctrlProperty);
  socket.emit('gainFromCtrl', ctrlProperty)
}

let rangeClass = document.getElementsByClassName("range")
for(let i=0;i<rangeClass.length;i++){
  rangeClass[i].addEventListener("change", rangeChange)
}

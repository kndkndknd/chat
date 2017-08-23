exports.instructionInterval = function instructionInterval(io, instructionArr, instructionDuration){
  io.emit("instructionFromServer", {
    "text": instructionArr[Math.floor(Math.random() * instructionArr.length)],
    "duration": instructionDuration[Math.floor(Math.random() * instructionDuration.length)]
  });
  /*
  console.log("instruction");
  //coding later
  io.emit('instructionFromServer', intervalValue);
  */
}
exports.chunkEmit = function chunkEmit(io, audiovisualChunk){
  console.log('chunkEmit')
  if(audiovisualChunk.length > 0) {
    io.emit('chunkFromServer', audiovisualChunk.shift());
  }
}

exports.pickupTarget = function pickupTarget(room, list, target, order){
  let idArr = [];
  for(let key in list){
    for(let id in room){
      if(String(id) === key){
        if(list[key][target][order]){
          idArr.push(id);
        }
      }
    }
  }
  return idArr;
}

exports.roomEmit = function roomEmit(io, name, data, target){
  for(let key in target){
    if(key in io.sockets.adapter.rooms){
      console.log(key);
      io.to(key).emit(name,data);
    } else if(key === "all"){
      io.emit(name,data);
    }
  }
  io.to("ctrl").emit(name,data);
}

exports.randomIdEmit = function randomIdEmit(io,ids, target, name, data){
  let idList = [];
  for(let room in ids){
    if(target[room] && room != "ctrl"){
      for(let key in ids[room]){
        idList.push(key);
      }
    }
  }
  io.to(idList[Math.floor(Math.random() * idList.length)]).emit(name, data);
}

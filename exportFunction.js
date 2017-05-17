exports.instructionInterval = function instructionInterval(io, instructionArr, instructionDuration){
  io.emit("instructionFromServer", {
    "text": instructionArr[Math.floor(Math.random() * instructionArr.length)],
    "duration": instructionDuration[Math.floor(Math.random() * instructionDuration.length)]
  });
}
exports.chunkEmit = function chunkEmit(io, audiovisualChunk){
  console.log('chunkEmit')
  if(audiovisualChunk.length > 0) {
    io.emit('chunkFromServer', audiovisualChunk.shift());
  }
}

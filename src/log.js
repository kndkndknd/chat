console.log(socket)

socket.emit('connectFromClient', "log")

socket.on('logFromServer', (data) =>{
//alert(data)
  $('#logs').empty()
  data.reverse()
  data.forEach((value) =>{
    $('#logs').append(value + '<br>')
  })
})

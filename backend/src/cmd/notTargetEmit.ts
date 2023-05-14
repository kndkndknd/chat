import SocketIO from 'socket.io'

export const notTargetEmit = (targetId: string, idArr: string[], io: SocketIO.Server) => {
  idArr.forEach((id) => {
//    console.log(id)
    if(id !== targetId) io.to(id).emit('erasePrintFromServer')
  })
}

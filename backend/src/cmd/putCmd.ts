import SocketIO from 'socket.io'
import { cmdStateType } from '../types/global'

export const putCmd = (io: SocketIO.Server, id: string, cmd: {
  cmd: string,
  value?: number,
  flag?: boolean,
  fade?: number,
  portament?: number,
  gain?: number
},
state: cmdStateType) => {
  io.to(id).emit('cmdFromServer', cmd)
  /*
  if(state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
      io.to(element).emit('voiceFromServer', cmd.cmd)
    })
  }
  */
}
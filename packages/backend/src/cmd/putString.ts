import SocketIO from 'socket.io'
import { cmdStateType } from '../types/global'

export const putString = (io: SocketIO.Server, strings: string, state: cmdStateType) => {
  io.emit('stringsFromServer',{strings: strings, timeout: true})
  /*
  if(state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
      io.to(element).emit('voiceFromServer', strings)
    })
  }
  */
}

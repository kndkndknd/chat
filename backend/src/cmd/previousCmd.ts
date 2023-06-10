import SocketIO from 'socket.io'
import { cmdStateType } from '../types/global'
import { cmdEmit } from './cmdEmit'
import { streamEmit } from '../stream/streamEmit'
import { sinewaveEmit } from './sinewaveEmit'

export const previousCmd = (io: SocketIO.Server, state: cmdStateType) => {
  for(let cmd in state.previous.cmd){
    state.previous.cmd[cmd].forEach(target => {
      cmdEmit(cmd, io, state, target)  
    });
  }
  for(let stream in state.previous.stream){
    if(state.previous.stream[stream]){
      streamEmit(stream, io, state)
    }
  }
  for(let target in state.previous.sinewave){
    sinewaveEmit(String(state.previous.sinewave[target]), io, state, target)
  }
}


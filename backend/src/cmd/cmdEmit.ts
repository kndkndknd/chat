import SocketIO from 'socket.io'
import { cmdStateType } from '../types/global'
import { cmdList } from '../states'

import { stopEmit } from './stopEmit'
import { putCmd } from './putCmd'
import { notTargetEmit } from './notTargetEmit'


export const cmdEmit = (cmdStrings: string, io: SocketIO.Server, state: cmdStateType, target?: string) => {
  let targetId = ''
  let cmd: {
    cmd: string,
    property?: string,
    value?: number,
    flag?: boolean,
    fade?: number,
    gain?: number
  }
  switch(cmdStrings){
    case 'STOP':
      stopEmit(io, state)
      break;
    case 'WHITENOISE':
    case 'FEEDBACK':
    case 'BASS':
      const cmdKey = cmdStrings as keyof typeof cmdList
      cmd =  {
        cmd: cmdList[cmdKey]
      }
      state.previous.cmd[cmd.cmd] = state.current.cmd[cmd.cmd]
      if(target) {
        targetId = target
        console.log(targetId)
        if(state.current.cmd[cmd.cmd].includes(targetId)) {
          cmd.flag = false
          cmd.fade = state.cmd.FADE.OUT
          for(let id in state.current.cmd[cmd.cmd]) {
            if(targetId === state.current.cmd[cmd.cmd][id]) {
              delete state.current.cmd[cmd.cmd][id]
            }
          }
          console.log(state.current.cmd[cmd.cmd])
        } else {
          cmd.flag = true
          cmd.fade = state.cmd.FADE.IN
          state.current.cmd[cmd.cmd].push(targetId)
        }
        cmd.gain = state.cmd.GAIN[cmd.cmd]
      } else {
        if(state.current.cmd[cmd.cmd].length === 0 ) {
          cmd.flag = true
          cmd.fade = state.cmd.FADE.IN
          cmd.gain = state.cmd.GAIN[cmd.cmd]
          targetId = state.client[Math.floor(Math.random() * state.client.length)]
          state.current.cmd[cmd.cmd].push(targetId)
        } else {
          cmd.flag = false
          cmd.fade = state.cmd.FADE.OUT
          cmd.gain = state.cmd.GAIN[cmd.cmd]
          targetId = state.current.cmd[cmd.cmd].shift()
        }
      }
      // io.to(targetId).emit('cmdFromServer', cmd)
      putCmd(io, targetId, cmd, state)
      notTargetEmit(targetId, state.client, io)        
      break
    case 'CLICK':
      console.log(state.cmd.GAIN.CLICK)
      cmd = {
        cmd: 'CLICK',
        gain: state.cmd.GAIN.CLICK
      }
      // cmd.gain = state.cmd.GAIN.CLICK
      if(target) {
        targetId = target
      } else {
        targetId = state.client[Math.floor(Math.random() * state.client.length)]
      }
      // io.to(targetId).emit('cmdFromServer', cmd)
      putCmd(io, targetId, cmd, state)
      notTargetEmit(targetId, state.client, io)
      break
    case 'SIMULATE':
      console.log(state.cmd.GAIN.SIMULATE)
      cmd = {
        cmd: 'SIMULATE',
        gain: state.cmd.GAIN.SIMULATE
      }
      if(target) {
        targetId = target
      } else {
        targetId = state.client[Math.floor(Math.random() * state.client.length)]
      }
      putCmd(io, targetId, cmd, state)
      notTargetEmit(targetId, state.client, io)
      break
    case 'METRONOME':
      cmd =  {
        cmd: 'METRONOME'
      }
      
      if(target) {
        if(state.current.cmd[cmd.cmd].includes(target)) {
          cmd.flag = false
          cmd.gain = state.cmd.GAIN.METRONOME
          for(let id in state.current.cmd.METRONOME) {
            if(target === state.current.cmd.METRONOME[id]) {
              cmd.value = state.cmd.METRONOME[target]
              delete state.current.cmd[cmd.cmd][id]
            }
          }
          console.log(state.current.cmd.METRONOME)
        } else {
          cmd.flag = true
          cmd.gain = state.cmd.GAIN.METRONOME
          state.current.cmd.METRONOME.push(target)
          cmd.value = state.cmd.METRONOME[target]
        }
      } else {
        if(state.current.cmd.METRONOME.length === 0 ) {
          cmd.flag = true
          cmd.gain = state.cmd.GAIN.METRONOME
          target = state.client[Math.floor(Math.random() * state.client.length)]
          state.current.cmd[cmd.cmd].push(target)
          cmd.value = state.cmd.METRONOME[target]
        } else {
          cmd.flag = false
          cmd.gain = state.cmd.GAIN.METRONOME
          target = state.current.cmd.METRONOME.shift()
          cmd.value = state.cmd.METRONOME[target]
        }
      }
      putCmd(io, target, cmd, state)
      notTargetEmit(target, state.client, io)
      console.log('metronome')
    break
      /*
    case 'RECORD':
      // console.log("debug")
      if(!state.current.RECORD) {
        console.log("debug cmd ts")
        state.current.RECORD = true
        io.emit('recordReqFromServer', {target: 'PLAYBACK', timeout: 10000})
      } else {
        state.current.RECORD = false
      }
      break
      */
  }
  cmdStrings = '';
}







import SocketIO from 'socket.io'
import { cmdStateType, gridType } from '../types/global'
import { cmdList, streamList, parameterList, states } from './states'
import { uploadStream } from './upload'
import { streamEmit } from './stream'
import e from 'express'

import { newWindowReqType } from '../types/global'

export function charProcess(character:string, strings: string, id: string, io: SocketIO.Server, state: cmdStateType) {
  //console.log(character)
  if(character === 'Enter') {
    receiveEnter(strings, id, io, state)
    strings = '';
  } else if(character === 'Tab' || character === 'ArrowRight' || character === 'ArrowDown') {
    io.emit('erasePrintFromServer', '')
    strings =  '';
  } else if(character === 'ArrowLeft' || character === 'Backspace') {
    strings = strings.slice(0,-1)
    io.emit('stringsFromServer',{strings: strings, timeout: false})
  } else if(character === 'Escape'){
    stopEmit(io, state);
    strings =  '';
  } else if(character === 'BASS') {
    console.log('io.to(' + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"LOW"})')
    io.to(id).emit('cmdFromServer',{'cmd':'BASS','property':'LOW'})
  } else if(character === 'BASSS'){
    console.log('io.to(' + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"HIGH"})')
    io.to(id).emit('cmdFromServer',{'cmd':'BASS','property':'HIGH'})
  } else if(character === 'ArrowUp'){
    io.emit('stringsFromServer',{strings: strings, timeout: false})
  } else if(character != undefined) {
    strings =  strings + character;
    io.emit('stringsFromServer',{strings: strings, timeout: false})
  }
  console.log(strings)
  return strings
}

const notTargetEmit = (targetId: string, idArr: string[], io: SocketIO.Server) => {
  idArr.forEach((id) => {
//    console.log(id)
    if(id !== targetId) io.to(id).emit('erasePrintFromServer')
  })
}


export const receiveEnter = (strings: string, id: string, io: SocketIO.Server, state: cmdStateType) => {
  //VOICE
  emitVoice(io, strings, state)

if(strings === 'MACBOOK' || strings === 'THREE') {
    console.log('debug')
    io.emit('threeSwitchFromServer', true)
  } else if(strings === 'CHAT') {
    if(!state.current.stream.CHAT) {
      console.log(state.client)
      state.current.stream.CHAT = true
      const targetId = state.client[Math.floor(Math.random() * state.client.length)]
      io.to(targetId).emit('chatReqFromServer')
      if(state.cmd.VOICE.length > 0) {
        state.cmd.VOICE.forEach((element) => {
          io.to(element).emit('voiceFromServer', 'CHAT')
        })
      }
    } else {
      state.current.stream.CHAT = false
    }
  } else if(strings === "RECORD" || strings === "REC") {
    if(!state.current.RECORD) {
      state.current.RECORD = true
      io.emit('recordReqFromServer', {target: 'PLAYBACK', timeout: 10000})
      if(state.cmd.VOICE.length > 0) {
        state.cmd.VOICE.forEach((element) => {
//          io.to(element).emit('voiceFromServer', 'RECORD')
          io.to(element).emit('voiceFromServer', {text: 'RECORD', lang: state.cmd.voiceLang})
        })
      }
    } else {
      state.current.RECORD = false
    }
  } else if(strings.includes(' ') && strings.split(' ').length < 4) {
    splitSpace(strings.split(' '), io, state)
  } else if(streamList.includes(strings)) {
    console.log('in stream')
    state.current.stream[strings] = true
    streamEmit(strings, io, state)
  } else if(Object.keys(cmdList).includes(strings)) {
    console.log('in cmd')
    cmdEmit(cmdList[strings], io, state)
  } else if (Number.isFinite(Number(strings))) {
    console.log('sinewave')
    sinewaveEmit(strings, io, state)
  } else if (strings === 'TWICE' || strings === 'HALF') {
    sinewaveChange(strings, io, state)
  } else if (strings === 'PREVIOUS' || strings === 'PREV') {
    previousCmd(io, state)
  } else if (strings === 'STOP') {
    stopEmit(io, state);
  } else if(Object.keys(parameterList).includes(strings)) {
    parameterChange(parameterList[strings], io, state, {source: id})
  } else if(strings === 'NO' || strings === 'NUMBER') {
    state.client.forEach((id, index) => {
      console.log(id)
      io.to(id).emit('stringsFromServer',{strings: String(index), timeout: true})
      //putString(io, String(index), state)
    })
  }

}

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

export const stopEmit = (io: SocketIO.Server, state: cmdStateType) => {
  io.emit('stopFromServer', state.cmd.FADE.OUT)
  // STOPは個別の関数があるのでVOICEはそこに相乗り
  if(state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
//      io.to(element).emit('voiceFromServer', "STOP")
      io.to(element).emit('voiceFromServer', {text: 'STOP', lang: state.cmd.voiceLang})
    })
  }

  // current -> previous && current -> stop
  for(let cmd in state.current.cmd) {
    state.previous.cmd[cmd] = state.current.cmd[cmd]
    state.current.cmd[cmd] = []
  }
  for(let stream in state.current.stream) {
    state.previous.stream[stream] = state.current.stream[stream]
    state.current.stream[stream] = false
  }
  state.previous.sinewave = state.current.sinewave
  state.current.sinewave = {}
}


export const sinewaveEmit = (frequencyStr: string, io: SocketIO.Server, state: cmdStateType, target?: string) => {
  // サイン波の処理
  let cmd: {
    cmd: string,
    value: number,
    flag: boolean,
    fade: number,
    portament: number,
    gain: number
  } = {
    cmd: 'SINEWAVE',
    value: Number(frequencyStr),
    flag: true,
    fade: 0,
    portament: state.cmd.PORTAMENT,
    gain: state.cmd.GAIN.SINEWAVE
  }
  state.previous.sinewave = state.current.sinewave
  let targetId = 'initial'
  if(target) {
    targetId = target
    if(Object.keys(state.current.sinewave).includes(targetId)) {
      // 送信先が同じ周波数で音を出している場合
      if(state.current.sinewave[targetId] === cmd.value) {
        cmd.flag = false
        cmd.fade = state.cmd.FADE.OUT
        delete state.current.sinewave[targetId]  
      // 送信先が違う周波数で音を出している場合
      } else {
        cmd.flag = true
        cmd.fade = 0
        state.current.sinewave[targetId] = cmd.value
      }
    } else {
      // 送信先が音を出していない場合
      cmd.fade = state.cmd.FADE.IN
      state.current.sinewave[targetId] = cmd.value
    }
  } else {
    // どの端末も音を出していない場合
    if(Object.keys(state.current.sinewave).length === 0) {
      cmd.fade = state.cmd.FADE.IN
      targetId = state.client[Math.floor(Math.random() * state.client.length)]
      console.log("debug: " + targetId)
      state.current.sinewave[targetId] = cmd.value
      // state.previous.sinewave = {}
    } else {
      //同じ周波数の音を出している端末がある場合
      for(let id in state.current.sinewave) {
        if(cmd.value === state.current.sinewave[id]) {
          targetId = id
          cmd.flag = false
          cmd.fade = state.cmd.FADE.OUT
          delete state.current.sinewave[targetId]
        }
      }
      // 同じ周波数の音を出している端末がない場合
      if(targetId === 'initial') {
        for(let i = 0; i < state.client.length; i++) {
          if(Object.keys(state.current.sinewave).includes(state.client[i])) {
            continue
          } else {
            targetId = state.client[i]
          }
        }
        if(targetId === 'initial') {
          targetId = Object.keys(state.current.sinewave)[Math.floor(Math.random() * Object.keys(state.current.sinewave).length)]
        }
        state.current.sinewave[targetId] = cmd.value
      }
    }
  }
  console.log(state.current.sinewave)
  console.log(targetId)
  // io.to(targetId).emit('cmdFromServer', cmd)
  putCmd(io, targetId, cmd, state)
  //io.emit('cmdFromServer', cmd)
  notTargetEmit(targetId, state.client, io)
}

const sinewaveChange = (cmdStrings: string, io: SocketIO.Server, state: cmdStateType, value?: number) => {
  if(cmdStrings === 'TWICE') {
      for(let id in state.current.sinewave) {
        state.previous.sinewave[id] = state.current.sinewave[id]
        state.current.sinewave[id] = state.current.sinewave[id] * 2
        const cmd: {
          cmd: string,
          value: number,
          flag: boolean,
          fade: number,
          portament: number,
          gain: number
        } = {
          cmd: 'SINEWAVE',
          value: state.current.sinewave[id],
          flag: true,
          fade: 0,
          portament: state.cmd.PORTAMENT,
          gain: state.cmd.GAIN.SINEWAVE
        }
        putCmd(io, id, cmd, state)
        // io.to(id).emit('cmdFromServer', cmd)
      }

  } else if (cmdStrings === 'HALF') {
    for(let id in state.current.sinewave) {
      state.previous.sinewave[id] = state.current.sinewave[id]
      state.current.sinewave[id] = state.current.sinewave[id] / 2
      const cmd: {
        cmd: string,
        value: number,
        flag: boolean,
        fade: number,
        portament: number,
        gain: number
      } = {
        cmd: 'SINEWAVE',
        value: state.current.sinewave[id],
        flag: true,
        fade: 0,
        portament: state.cmd.PORTAMENT,
        gain: state.cmd.GAIN.SINEWAVE
      }
      //io.to(id).emit('cmdFromServer', cmd)
      putCmd(io, id, cmd, state)
    }

  }
}

export const parameterChange = (param: string, io: SocketIO.Server, state: cmdStateType, arg?: {source?: string, value?: number, property?:string}) => {
  switch(param) {
    case 'PORTAMENT':
      if(arg && arg.value && isFinite(Number(arg.value))) {
        state.cmd.PORTAMENT = arg.value
      } else {
        if(state.cmd.PORTAMENT > 0) {
          state.cmd.PORTAMENT = 0
        } else {
          state.cmd.PORTAMENT = 5
        }
      }
      // io.emit('stringsFromServer',{strings: 'PORTAMENT: ' + String(state.cmd.PORTAMENT) + 'sec', timeout: true})
      putString(io, 'PORTAMENT: ' + String(state.cmd.PORTAMENT) + 'sec', state)
      break
    case 'SAMPLERATE':
      for(let key in state.stream.randomrate) {
        if(state.stream.randomrate[key]) state.stream.randomrate[key] = false
      }
      let sampleRate = 44100
      if(arg && isFinite(Number(arg.value))) { 
        sampleRate = arg.value
      } else {
        const sampleArr = Object.values(state.stream.sampleRate)
        const sum = sampleArr.reduce((accumulator, currentValue) => {
          return accumulator + currentValue
        })
        const average = sum / sampleArr.length
        if(average < 11025 || average >= 88200) {
          sampleRate = 11025
        } else if(average < 22050) {
          sampleRate = 22050
        } else if(average < 44100) {
          sampleRate = 44100
        } else {
          sampleRate = 88200
        }
      }
      if(arg && arg.property) {
        console.log('hit source')
        state.stream.sampleRate[arg.property] = sampleRate
        // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(state.stream.sampleRate[arg.source]) + 'Hz', timeout: true})
        putString(io, 'SampleRate: ' + String(state.stream.sampleRate[arg.property]) + 'Hz', state)
      } else {
        console.log(arg)
        for(let source in state.stream.sampleRate) {
          state.stream.sampleRate[source] = sampleRate
        }
        // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(state.stream.sampleRate.CHAT) + 'Hz', timeout: true})
        putString(io, 'SampleRate: ' + String(state.stream.sampleRate.CHAT) + 'Hz', state)
      }
      break
    case 'GLITCH':
      if(arg && arg.property) {
        state.stream.glitch[arg.source] = !state.stream.glitch[arg.source]
        // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(state.stream.glitch[arg.source]), timeout: true})
        putString(io, 'GLITCH: ' + String(state.stream.glitch[arg.source]), state)
      } else {
        let flag = false
        if(Object.values(states.stream.glitch).includes(false)) {
          flag = true
        }
        for(let source in state.stream.glitch) {
          state.stream.glitch[source] = flag
        }  
        // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(state.stream.glitch.CHAT), timeout: true})
        putString(io, 'GLITCH: ' + String(state.stream.glitch.CHAT), state)
      }
      break
    case 'GRID':
      if(arg && arg.property) {
        if(state.stream.grid[arg.property] === 'grid') {
          state.stream.grid[arg.property] = 'no grid'
        } else {
          state.stream.grid[arg.property] = 'grid'
        }
        // io.emit('stringsFromServer',{strings: 'GRID: ' + String(state.stream.grid[arg.property]) + '(' + arg.property + ')', timeout: true})
        putString(io, 'GRID: ' + String(state.stream.grid[arg.property]) + '(' + arg.property + ')', state)
      } else {
        let flag: gridType = 'no grid'
        if(Object.values(states.stream.grid).includes('no grid')) {
          flag = 'grid'
        }
        for(let source in state.stream.grid) {
          state.stream.grid[source] = flag
        }
        // io.emit('stringsFromServer',{strings: 'GRID: ' + String(state.stream.grid.CHAT), timeout: true})
        putString(io, state.stream.grid.CHAT, state)
      }
      break
    case 'BPM':
      if(arg && arg.value) {
        const latency = 60 * 1000 / arg.value
        if(arg.property) {
          // propertyがSTREAMを指定している場合
          if(Object.keys(state.stream.latency).includes(arg.property)) {
            state.stream.latency[arg.property] = latency
            putString(io, 'BPM: ' + String(arg.value)  + '(' + arg.property + ')', state)
          // propertyが端末番号を指定している場合
          } else if(/^([1-9]\d*|0)(\.\d+)?$/.test(arg.property)){
            const target = state.client[Number(arg.property)]
            if(Object.keys(state.cmd.METRONOME).includes(target)){
              state.cmd.METRONOME[target] = latency
              putString(io, 'BPM: ' + String(arg.value)  + '(client ' + arg.property + ')', state)
            }
            if(state.current.cmd.METRONOME.includes(target)) {
              const cmd: {
                cmd: string,
                property?: string,
                value?: number,
                flag?: boolean,
                fade?: number,
                gain?: number
              } = {
                cmd: 'METRONOME',
                flag: true,
                gain: state.cmd.GAIN.METRONOME,
                value: latency
              }
              putCmd(io, target, cmd, state)
          }
  

          }
          // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value)  + '(' + arg.property + ')', timeout: true})
        } else {
          for(let target in state.stream.latency) {
            state.stream.latency[target] = latency
          }
          for(let target in state.cmd.METRONOME) {
            state.cmd.METRONOME[target] = latency
          }
          if(state.current.cmd.METRONOME.length > 0) {
            state.current.cmd.METRONOME.forEach((target) => {
              const cmd: {
                cmd: string,
                property?: string,
                value?: number,
                flag?: boolean,
                fade?: number,
                gain?: number
              } = {
                cmd: 'METRONOME',
                flag: true,
                gain: state.cmd.GAIN.METRONOME,
                value: latency
              }
              putCmd(io, target, cmd, state)
    
            })
          }
          putString(io, 'BPM: ' + String(arg.value), state)
          // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value), timeout: true})
        }
      }
      break
    case 'RANDOM':
      if(arg && arg.source) {
        state.stream.random[arg.source] = !state.stream.random[arg.source]
        // io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(state.stream.random[arg.source]), timeout: true})
        putString(io, 'RANDOM: ' + String(state.stream.random[arg.source]), state)
      } else {
        let flag = false
        if(Object.values(states.stream.random).includes(false)) {
          flag = true
        }
        for(let target in state.stream.random) {
          state.stream.random[target] = flag
        }
        //io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(state.stream.random.CHAT), timeout: true})
        putString(io, 'RANDOM: ' + String(state.stream.random.CHAT), state)
      }
      break
    case 'VOICE':
      if(arg && arg.source) {
        let flag = false
        if(state.cmd.VOICE.includes(arg.source)) {
          const arr = []
          for(let i = 0; i < state.cmd.VOICE.length; i++) {
            if(state.cmd.VOICE[i] === arg.source) {
              continue
            } else {
              arr.push(state.cmd.VOICE[i])
            }
          }
          state.cmd.VOICE = arr
          // state.cmd.VOICE.filter((id) => {
          // })
          console.log(state.cmd.VOICE)
        } else {
          state.cmd.VOICE.push(arg.source)
          flag = true
        }
        // io.emit('stringsFromServer',{strings: 'VOICE: ' + String(flag), timeout: true})
        putString(io, 'VOICE: ' + String(flag), state)
      }
      break
  }  
}

const splitSpace = (stringArr: Array<string>, io: SocketIO.Server, state: cmdStateType) => {
  const arrTypeArr = stringArr.map((string) => {
    if(/^([1-9]\d*|0)(\.\d+)?$/.test(string)) {
      return 'number'
    } else if(/^[A-Za-z]*$/.test(string)) {
      return 'string'
    } else {
      return 'other'
    }
  })
  // console.log(arrTypeArr)
  // console.log(stringArr)

  if(arrTypeArr[0] === 'number' && stringArr.length === 2) {
    // 送信先を指定したコマンド/SINEWAVE
    const target = state.client[Number(stringArr[0])]
    console.log(target)
    if(arrTypeArr[1] === 'string') {
      cmdEmit(stringArr[1], io, state, target)
    } else if(arrTypeArr[1] === 'number') {
      sinewaveEmit(stringArr[1], io, state, target)
    }
  } else if(Object.keys(parameterList).includes(stringArr[0])) {
    // RANDOMのみRATEとSTREAMがあるので個別処理
    if(stringArr[0] === 'RANDOM') {
      if(stringArr[1] === 'RATE') {
        // SAMPLERATEのランダマイズ
        console.log('random rate')
        if(stringArr.length === 2) {
          for(let key in state.stream.randomrate) {
            state.stream.randomrate[key] = !state.stream.randomrate[key]
          }
          // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), timeout: true})
          putString(io, 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), state)
        } else if(stringArr.length === 3 && Object.keys(state.stream.randomrate).includes(stringArr[2])) {
          state.stream.randomrate[stringArr[2]] = !state.stream.randomrate[stringArr[2]]
          //io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(state.stream.randomrate[stringArr[2]]), timeout: true})
          putString(io, 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(state.stream.randomrate[stringArr[2]]), state)
        }
        console.log(state.stream.randomrate)
      } else if(stringArr[1] === 'GRID') {
        // SAMPLERATEのランダマイズ
        console.log('random grid')
        if(stringArr.length === 2) {
          for(let key in state.stream.grid) {
            state.stream.grid[key] = 'random'
          }
          // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), timeout: true})
          putString(io, state.stream.grid.CHAT, state)
        } else if(stringArr.length === 3 && Object.keys(state.stream.randomrate).includes(stringArr[2])) {
          state.stream.grid[stringArr[2]] = 'random'
          //io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(state.stream.randomrate[stringArr[2]]), timeout: true})
          putString(io, stringArr[2] + ' GRID: ' + state.stream.grid[stringArr[2]], state)
        }
        console.log(state.stream.grid)

      }
    } else if (stringArr[0] === 'VOICE') {
      //  } else if (stringArr[0] === 'VOICE' && stringArr.length === 2 && arrTypeArr[1] === 'string') {
      console.log('debt')
      if(stringArr[1] === "JA" || stringArr[1] === "JP") {
        state.cmd.voiceLang = 'ja-JP'
        putString(io, 'VOICE: ja-JP', state)
      } else if(stringArr[1] === "EN" || stringArr[1] === "US") {
        state.cmd.voiceLang = 'en-US'
        putString(io, 'VOICE: en-US', state)
      }
    } else {
      let argVal: number
      let argProp: string
      console.log(stringArr)
      console.log(arrTypeArr)
      if(stringArr.length === 2 && arrTypeArr[1] === 'number') {
        argVal = Number(stringArr[1])
      } else if (stringArr.length === 2 && arrTypeArr[1] === 'string'){
        argProp = stringArr[1]
      } else if (stringArr.length === 3) {
        if(arrTypeArr[1] === 'string' && arrTypeArr[2] === 'number') {
          argProp = stringArr[1]
          argVal = Number(stringArr[2])  
        } else if(stringArr[0] === 'BPM' && arrTypeArr[1] === 'number' && arrTypeArr[2] === 'number') {
          argProp = stringArr[1]
          argVal = Number(stringArr[2])  
        }
      }
      parameterChange(parameterList[stringArr[0]], io, state, {value: argVal, property: argProp})
      putString(io, stringArr[0] + ' ' + stringArr[1], state)
    }
  } else if(stringArr[0] === 'STOP') {
    if(stringArr.length === 2 && Object.keys(state.current.stream).includes(stringArr[1])) {
      state.current.stream[stringArr[1]] = false
      putString(io, stringArr[0] + ' ' + stringArr[1], state)
    }
  } else if(stringArr[0] === 'FADE') {
    if((stringArr[1] === 'IN' || stringArr[1] === 'OUT') && stringArr.length === 2) {
      if(state.cmd.FADE[stringArr[1]] === 0) {
        state.cmd.FADE[stringArr[1]] = 5
      } else {
        state.cmd.FADE[stringArr[1]] = 0
      }
      // io.emit('stringsFromServer',{strings: 'FADE ' + stringArr[1] +  ': ' + String(state.cmd.FADE[stringArr[1]]), timeout: true})
      putString(io, 'FADE ' + stringArr[1] +  ': ' + String(state.cmd.FADE[stringArr[1]]), state)
    } else if(stringArr.length === 3 && (stringArr[1] === 'IN' || stringArr[1] === 'OUT') && arrTypeArr[2] === 'number') {
      if(state.cmd.FADE[stringArr[1]] !== Number(stringArr[2])) {
        state.cmd.FADE[stringArr[1]] = Number(stringArr[2])
      } else {
        state.cmd.FADE[stringArr[1]] = 0
      }
      putString(io, 'FADE ' + stringArr[1] +  ': ' + String(state.cmd.FADE[stringArr[1]]), state)
      
    }
  } else if(stringArr[0] === 'UPLOAD' && stringArr.length == 2) {
    uploadStream(stringArr, io)
  } else if (stringArr[0] === 'GAIN' && stringArr.length === 3 && Object.keys(state.cmd.GAIN).includes(stringArr[1]) && arrTypeArr[2] === 'number') {
    state.cmd.GAIN[stringArr[1]] = Number(stringArr[2])
    console.log(state.cmd.GAIN)
    putString(io, stringArr[1] +  ' GAIN: ' + stringArr[2], state)
  }

}

const previousCmd = (io: SocketIO.Server, state: cmdStateType) => {
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

const putCmd = (io: SocketIO.Server, id: string, cmd: {
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

const putString = (io: SocketIO.Server, strings: string, state: cmdStateType) => {
  io.emit('stringsFromServer',{strings: strings, timeout: true})
  /*
  if(state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
      io.to(element).emit('voiceFromServer', strings)
    })
  }
  */
}

const emitVoice = (io: SocketIO.Server, strings: string, state: cmdStateType) => {
  if(state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
      io.to(element).emit('voiceFromServer', {text: strings, lang: state.cmd.voiceLang})
    })
  }
}
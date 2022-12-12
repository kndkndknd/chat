import SocketIO from 'socket.io';
import { cmdStateType, buffStateType } from '../types/global'
import { streams, states, basisBufferSize } from './states'


export const streamEmit = (source: string, io: SocketIO.Server, state: cmdStateType) => {
  // if(streams[source].length > 0) {
    console.log(state.client)
    const targetId = state.client[Math.floor(Math.random() * state.client.length)]
    let buff: buffStateType
    if(source === 'PLAYBACK') {
      if(streams[source].length > 0) {
        if(!state.stream.random[source]) {
          buff = streams[source].shift()
          streams[source].push(buff)
        } else {
          // RANDOM
          buff = streams[source][Math.floor(Math.random() * streams[source].length)]
        }
      } else {
        io.emit('stringsFromServer',{strings: "NO BUFFER", timeout: true})
      }
    } else if(source === 'EMPTY') {
      let audioBuff = new Float32Array(basisBufferSize)
      for(let i = 0; i < basisBufferSize; i++){
        audioBuff[i] = 1.0
      }    
      buff = {
        target: source,
        bufferSize: basisBufferSize,
        audio: audioBuff,
        video: streams[source].video.shift(),
        duration: basisBufferSize / 44100
      }
      /*
    } else if(source === 'TIMELAPSE') {
      if(streams.TIMELAPSE.audio.length > 0 && streams.TIMELAPSE.video.length > 0) {
        buff = {
          target: source,
          bufferSize: streams[source].bufferSize,
          audio: streams[source].audio.shift(),
          video: streams[source].video.shift(),
          duration: streams[source].bufferSize / 44100
        }
      }
      */
    } else {
      if(streams[source].audio.length > 0 || streams[source].video.length > 0) {

        if(!state.stream.random[source]) {
          buff = {
            target: source,
            bufferSize: streams[source].bufferSize,
            audio: streams[source].audio.shift(),
            video: streams[source].video.shift(),
            duration: streams[source].bufferSize / 44100
          }
          streams[source].audio.push(buff.audio)
          streams[source].video.push(buff.video)
        } else {
          buff = {
            target: source,
            bufferSize: streams[source].bufferSize,
            audio: streams[source].audio[Math.floor(Math.random() * streams[source].audio.length)],
            video: streams[source].video[Math.floor(Math.random() * streams[source].video.length)],
            duration: streams[source].bufferSize / 44100
          }

        }
      } else {
        io.emit('stringsFromServer',{strings: "NO BUFFER", timeout: true})
      }
    }
    if(buff) {
      const stream = {
        source: source,
        sampleRate: (state.stream.glitch[source] ? state.stream.glitchSampleRate : state.stream.sampleRate[source]), // glicthがtrueならサンプルレートを切替
        glitch: (state.stream.glitch[source] ? state.stream.glitch[source] : false),
        ...buff
      }
      
      if(state.stream.randomrate[source]) {
        stream.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025
      }
      
      if(!stream.video) console.log("not video")
      
      if(state.stream.grid[source] === 'no grid') {
        io.to(targetId).emit('streamFromServer', stream)
      } else if(state.stream.grid[source] === 'grid') {
        const timeOutVal = Math.round(Math.random() * 16) * states.stream.latency[source] / 4
        setTimeout(()=> {
          io.to(targetId).emit('streamFromServer', stream)  
        }, timeOutVal)
      } else {
        const timeOutVal = Math.random() * 16 * states.stream.latency[source] / 4
        console.log('timeoutval: ' + String(timeOutVal))
        setTimeout(()=> {
          io.to(targetId).emit('streamFromServer', stream)  
        }, timeOutVal)

      }
    } else {
      console.log('no buffer')
    }
    /*
  } else {
    io.emit('stringsFromServer',{strings: "NO BUFFER", timeout: true})
  }
  */
}

export const chatReceive = (buffer:buffStateType, io: SocketIO.Server) => {
  switch(buffer.target) {
    case 'CHAT':
      streams.CHAT.push(buffer) 
      if(states.current.stream.CHAT) {
        const chunk = {
          sampleRate: states.stream.sampleRate.CHAT,
          glitch: states.stream.glitch.CHAT,
          ...streams.CHAT.shift()
        }
        if(states.stream.randomrate.CHAT) {
          chunk.sampleRate = 11025 + Math.floor(Math.random() * 10) * 11025
//          console.log(chunk.sampleRate)
        }
        if(states.stream.glitch[buffer.target] && chunk.video) {
          chunk.video = glitchStream(chunk.video)
        }
        console.log(states.client)
        const targetId = states.client[Math.floor(Math.random() * states.client.length)]
        console.log(targetId)
        if(!states.stream.grid[buffer.target]) {
          io.to(targetId).emit('chatFromServer',chunk)
        } else {
          const timeOutVal = Math.round(Math.random() * 16) * states.stream.latency.CHAT / 4
          setTimeout(() => {
            io.to(targetId).emit('chatFromServer',chunk)
          }, timeOutVal)
        }
      } else {
        io.emit('erasePrintFromServer')
      }
      break
    case 'PLAYBACK': //RECORDコマンドからのチャンク受信
      streams.PLAYBACK.push(buffer)
      console.log('PLAYBACK.length:' + String(streams.PLAYBACK.length))
      break
    case 'TIMELAPSE':
      streams.TIMELAPSE.audio.push(buffer.audio)
      streams.TIMELAPSE.video.push(buffer.video)
      // console.log(buffer.audio)
      console.log('TIMELAPSE.length:' + String(streams.TIMELAPSE.audio.length))
      break
  }

}

const glitchStream = (chunk) => {
  let rtnChunk = "data:image/jpeg;base64,";
  let baseImgString = chunk.split("data:image/jpeg;base64,")[1];
  let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  rtnChunk += baseImgString.replace(str[Math.floor(Math.random()*str.length)], str[Math.floor(Math.random()*str.length)]);   
  return rtnChunk.replace(String(Math.floor(Math.random() + 10)), String(Math.floor(Math.random() + 10)));
}
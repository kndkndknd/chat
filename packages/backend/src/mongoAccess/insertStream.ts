import SocketIO from 'socket.io'
import { cmdList, streamList, parameterList, states, streams } from '../states'
import { putString } from '../cmd/putString'

const ipaddress = '100.66.229.75'


export const insertStream = async (type: string, location: string = 'UNDEFINED', io: SocketIO.Server) => {
  //const streamChunk = streams[type].shift();
  streams[type].forEach(async (streamChunk: {audio: Float32Array, video: string}) => {
    const body = {
      'type': type,
      'audio': streamChunk.audio,
      'video': streamChunk.video,
      'location': location
    }
    const options = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      } 
    }
    const res = await fetch('http://' + ipaddress + ':3000/api/stream', options)
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      console.log(value);
    }  
  })
  await io.emit('stringsFromServer',{strings: 'INSERT DONE', timeout: true})


  // return res
}
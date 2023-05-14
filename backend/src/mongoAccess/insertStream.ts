import SocketIO from 'socket.io'
import { cmdList, streamList, parameterList, states, streams } from '../states'
import { putString } from '../cmd/putString'
import dotenv from 'dotenv'

dotenv.config()

const ipaddress = process.env.DB_HOST;


export const insertStream = async (name: string, type: string, location: string = 'UNDEFINED', io: SocketIO.Server) => {
  // const streamChunk = streams[type].shift();
  streams[type].forEach(async (streamChunk: {audio: Float32Array, video: string}) => {
    // const uint8Array = new Uint8Array(streamChunk.audio.buffer)
    const body = {
      'name': name,
      'type': type,
      'video': streamChunk.video,
      'location': location
    }
    const jsonBlob = new Blob([JSON.stringify(body)])
    const audioBlob = new Blob([streamChunk.audio])
    // const jsonBlob = new Blob([JSON.stringify(body)], {type : 'application/json'})
    // const audioBlob = new Blob([streamChunk.audio], {type : 'application/octet-stream'})
    const formData = new FormData()
    formData.append('json', jsonBlob)
    formData.append('binary', audioBlob)

    const options = {
      method: 'POST',
      body: formData,
    }
    /*
    const options = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      } 
    }
    */
    // console.log(body.audio)
    const res = await fetch('http://' + ipaddress + ':3000/api/stream', options)
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      // console.log(value);
    }  
  })
  await io.emit('stringsFromServer',{strings: 'INSERT DONE', timeout: true})

  // return res
}
import SocketIO from 'socket.io';
import { cmdStateType } from '../types/global'
import { receiveEnter } from './receiveEnter'
import { stopEmit } from './stopEmit'

export const timerCmd = (io: SocketIO.Server, state: cmdStateType, stringArr: string[], timeStampArr: string[]) => {
  let dt = new Date();
  let y = String(dt.getFullYear());
  let m = dt.getMonth() < 9 ? "0" + String(dt.getMonth() + 1) : String(dt.getMonth() + 1);
  let d = dt.getDate() < 10 ? "0" + String(dt.getDate()) : String(dt.getDate());
  let today = y + "-" + m + "-" + d;
  let now = Date.now()
  console.log(today)
  let timerVal = 0;
  if (timeStampArr.length === 3) {
    timerVal = Date.parse(today + "T" + stringArr[0] + "+09:00") - now
  } else if (timeStampArr.length === 2) {
    timerVal = Date.parse(today + "T" + stringArr[0] + ":00+09:00") - now
  }
  const cmdString = stringArr.length > 2 ? stringArr.slice(1).join(" ") : stringArr[1]
  const string = cmdString + " SCHEDULED " + String(timerVal) + "ms LATER"
  io.emit('stringsFromServer', { 
    strings: string,
    timeout: true, 
  })
  console.log(string)

  if(timerVal > 0) {
    setTimeout(() => {
      const targetId = state.client[Math.floor(Math.random() * state.client.length)]
      if(Object.keys(state.current.cmd).includes(stringArr[stringArr.length - 1]) || Object.keys(state.current.stream).includes(stringArr[stringArr.length - 1])) {
        receiveEnter(cmdString, targetId, io, state)
      } else if(stringArr[stringArr.length - 1] === 'STOP') {
        stopEmit(io, state);
      } else {
        io.emit('stringsFromServer', {
          strings: cmdString,
          timeout: false,
        })
      }
    }, timerVal)
  }
}
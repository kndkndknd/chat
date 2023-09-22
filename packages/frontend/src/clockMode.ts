// import { Socket } from "socket.io-client";
import { textPrint } from './imageEvent'
import { cnvs, ctx,} from './globalVariable'

let clockModeId = null

export const enableClockMode = () => {
  clockModeId = window.setInterval(() => {
    const date = new Date()
    const hour = date.getHours()
    const min = date.getMinutes()
    const sec = date.getSeconds()
    if(min < 10) {
      if(sec < 10) {
        textPrint(hour + ':0' + min + ':0' + sec, ctx, cnvs)
      } else {
        textPrint(hour + ':0' + min + ':' + sec, ctx, cnvs)
      }
  
    } else {
      if(sec < 10) {
        textPrint(hour + ':' + min + ':0' + sec, ctx, cnvs)
      } else {
        textPrint(hour + ':' + min + ':' + sec, ctx, cnvs)
      }
    }
  }, 1000)
  return clockModeId;
}

export const disableClockMode = (clockModeId) => {
  clearInterval(clockModeId)
  return 0;
}
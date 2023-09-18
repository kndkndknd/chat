import SocketIO from 'socket.io'
import { cmdStateType } from '../types/global'
import { putCmd } from './putCmd'

const metronomeArr: number[] = []

export const metronomeBpmSet = (io: SocketIO.Server, state: cmdStateType, sourceId: string) => {
  if(state.client.includes(sourceId)) {
    if(metronomeArr.length === 3){
      const interval1 = metronomeArr[1] - metronomeArr[0]
      const interval2 = metronomeArr[2] - metronomeArr[1]
      const interval3 = new Date().getTime() - metronomeArr[2]
      const averageInterval = (interval1 + interval2 + interval3) / 3
      state.bpm[sourceId] = 60000 / averageInterval
      // gridをきかせる制御

      metronomeArr.length = 0;
    } else {
      metronomeArr.push(new Date().getTime());
      let tapLength = Number(metronomeArr.length)
      setTimeout(()=>{
        if(metronomeArr.length === tapLength) metronomeArr.length = 0;
      },10000);

    }
  }
}
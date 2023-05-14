import { createSlice } from '@reduxjs/toolkit'
import { buffArrayType } from '../../types/global'
import { buffState as initialState } from './initialState'

export const buffSlice = createSlice({
  name: 'buff',
  initialState,
  reducers: {
    pushBuff: (state, action) => {
      const BuffKey = action.payload.target as keyof typeof state
      state[BuffKey].audio.push(action.payload.audio)
      state[BuffKey].video.push(action.payload.video)
    },
    clearBuff: (state, action) => {
      const BuffKey = action.payload.target as keyof typeof state
      state[BuffKey].audio = []
      state[BuffKey].video = []
      state[BuffKey].index = 0
    },
    incrementIndex: (state, action) => {
      const BuffKey = action.payload as keyof typeof state
      state[BuffKey].index += 1
      if(state[BuffKey].index >= state[BuffKey].audio.length || state[BuffKey].index >= state[BuffKey].video.length){
        state[BuffKey].index = 0
      }
    }
  }
})

export const { pushBuff, clearBuff, incrementIndex } = buffSlice.actions

export default buffSlice.reducer

export const getJsonBuff = (state: buffArrayType, target: string) => {
  const BuffKey = target as keyof typeof state
  let json = <{
    target:string,
    audio:Float32Array,
    video?:string
  }> {}
  json.target = target
  if(state[BuffKey].audio.length > state[BuffKey].index){
    json.audio = state[BuffKey].audio[state[BuffKey].index]
  } else {
    json.audio = new Float32Array
  }
  if(state[BuffKey].video.length > state[BuffKey].index){
    json.video = state[BuffKey].video[state[BuffKey].index]
//  } else {
//    json.video = ""
  }
  return json
};
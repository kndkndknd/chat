import { createSlice } from '@reduxjs/toolkit'
import type { cmdStateType } from "../../types/global";
import { cmdState as initialState } from "./initialState"

export const cmdSlice = createSlice({
  name: 'cmd',
  initialState,
  reducers: {
    setCmdProcess: (state, action) => {
    //process: (state, action: {type:string, payload:string}) => {
      const key = action.payload as keyof typeof state.cmdProcess
      const prevkey = action.payload as keyof typeof state.previousCmd
      state.previousCmd[prevkey] = state.cmdProcess[key]
      state.cmdProcess[key] = !state.cmdProcess[key]
      // console.log(action)
      //state.processCmd[action.payload] = !state.processCmd[action.payload]
    },
    setPortament: (state, action) => {
      state.PORTAMENT = action.payload
    },
    setGrid: (state, action) => {
      const target = action.payload as keyof typeof state.grid
      state.grid[target] = !state.grid[target]
    }
  }
})

export const { setCmdProcess, setPortament, setGrid } = cmdSlice.actions

// export const selectSampleRate = (state) => state.cmd.sampleRate;

export default cmdSlice.reducer

export const getSampleRate = (state: cmdStateType, target: string) => {
  const BuffKey = target as keyof typeof state.sampleRate
  // state.sampleRate
  return state.sampleRate[BuffKey]
}

export const getStreamProcess = (state: cmdStateType, target: string) => {
  const BuffKey = target as keyof typeof state.streamProcess
  return state.streamProcess[BuffKey]
}

export const getPreviousCmd = (state: cmdStateType) => state.prevCmd

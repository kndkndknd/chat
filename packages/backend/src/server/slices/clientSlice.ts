import { createSlice } from '@reduxjs/toolkit'

type clientStateType = {
  No: {
    [key: number]: string
  },
  voice: Array<string>,
  CHATto: Array<string>,
  CHATfrom: Array<string>,
  PLAYBACK: Array<string>,
  TIMELAPSE: Array<string>,
  DRUM: Array<string>
  // インデックスシグネチャ・・string型のキーにstring | number型の値
  // ただし、keyが数値の場合もstringにキャストされる
  // keyの型はstring or numberのみ
}


const initialState = {
  No: {},
  voice: [],
  ChatTo: [],
  ChatFrom: [],
  PLAYBACK: [],
  TIMELAPSE: [],
  DRUM: []
};

export const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    connect: (state, action) => {
    },
    disconnect: (state, action) => {
    }
  }
})

export const { connect, disconnect } = clientSlice.actions

export default clientSlice.reducer
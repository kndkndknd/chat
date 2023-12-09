// import { configureStore } from '@reduxjs/toolkit'
// import { combineReducers } from 'redux';
//import clientReducer, { decrement, increment } from './slices/clientSlice'
// import cmdReducer, { setCmdProcess, setPortament, getSampleRate, getStreamProcess } from './slices/cmdSlice'
// import buffReducer, { pushBuff, clearBuff, getJsonBuff, incrementIndex } from './slices/buffSlice'
import { selectOtherClient } from './route';
import { charProcess } from './cmd/charProcess';

// let rootReducers  = combineReducers({
  // cmds: cmdReducer,
  // buffs: buffReducer
// })
// export const store = configureStore({
  // reducer: rootReducers
// })
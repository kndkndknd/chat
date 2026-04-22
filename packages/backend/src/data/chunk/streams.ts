import { streamState } from '../../state';
import { StreamsType, buffStateType } from '../../../../../types';

export const streams: StreamsType = {
  PLAYBACK: {
    audio: [],
    video: [],
    index: 0,
    bufferSize: streamState.basisBufferSize,
  },
  TIMELAPSE: {
    audio: [],
    video: [],
    index: 0,
    bufferSize: streamState.basisBufferSize,
  },
  INTERNET: {
    audio: [],
    video: [],
    index: 0,
    bufferSize: streamState.basisBufferSize,
  },
  EMPTY: {
    audio: [],
    video: [],
    index: 0,
    bufferSize: streamState.basisBufferSize,
  },
};

export const chats: buffStateType[] = [];


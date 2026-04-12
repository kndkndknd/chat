import { streamState } from '../../state';
import { StreamsType } from '../../../../../types';
import { buffStateType } from '../../../../../types/streamType';

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


import {
  contextState,
  gainState,
  otherNodeState,
  flagState,
  socketState,
  oscState,
  timelapseState,
} from "../../state";

export const initAudioStream = (stream) => {
  let mediastreamsource: MediaStreamAudioSourceNode;
  mediastreamsource = contextState.audioContext.createMediaStreamSource(stream);
  // mediastreamsource.connect(scriptProcessorState.javascriptnode);
  mediastreamsource.connect(gainState.feedbackGain);
  mediastreamsource.connect(gainState.feedbackReverveGain);
  // feedbackGain -> feedbackMixGain -> masterGain は initAudio で接続済み。
  // scriptProcessorState.javascriptnode.onaudioprocess = onAudioProcess;
  // scriptProcessorState.javascriptnode.connect(gainState.masterGain);
  //rec

  //SIMULATE(old)
  // otherNodeState.analyser = contextState.audioContext.createAnalyser();
  // mediastreamsource.connect(otherNodeState.simFilter);
  // otherNodeState.simFilter.connect(otherNodeState.analyser);
};

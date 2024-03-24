import axios from "axios";

export const getTimeLine = async (stringArr, io, state) =>{
  const qWord = stringArr[1]
  try {
    const response = <string[]>await axios.post("http://127.0.0.1:8088/timeline", {
      qWord: qWord,
    });
    return true;
  
  } catch(e) {
    console.log('error', e)
    return false
  }
}
export const bufferSizeChange = (param: number) => {
  if (param <= 256) {
    return 256;
  } else if (param <= 512) {
    return 512;
  } else if (param <= 1024) {
    return 1024;
  } else if (param <= 2048) {
    return 2048;
  } else if (param <= 4096) {
    return 4096;
  } else if (param <= 8192) {
    return 8192;
  } else {
    return 16384;
  }
};

export const videoBufferState: {
  flag: boolean;
  chunkIndex: number;
  EBML_ID: Buffer;
  CLUSTER_ID: Buffer;
} = {
  flag: false,
  chunkIndex: 0,
  EBML_ID: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
  CLUSTER_ID: Buffer.from([0x1f, 0x43, 0xb6, 0x75]),
};

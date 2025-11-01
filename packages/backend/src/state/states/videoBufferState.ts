export const videoBufferState: {
  flag: boolean;
  chunkIndex: number;
  EBML_ID: Buffer | null;
  CLUSTER_ID: Buffer | null;
} = {
  flag: false,
  chunkIndex: 0,
  EBML_ID: null,
  CLUSTER_ID: null,
};

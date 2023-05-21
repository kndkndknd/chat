import { findData } from "./mongo";

const test = async () => {
  const result = await findData("PLAYBACK", "DOUTOR");
  console.log(result);
};

test();

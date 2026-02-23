import { spawn } from "child_process";

const ffprobeGetDuration = async (filePath) => {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffprobe",
      [filePath, "-hide_banner", "-show_entries", "format=duration"]
      // ,{shell: true, stdio: "inherit"}
    );
    let result = "";

    child.stdout.on("data", (data) => {
      result += data.toString();
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`コマンドがエラーコード ${code} で終了しました。`));
        return;
      }
      resolve(result);
    });
  });
};

const ffprobeGetSample = async (filePath) => {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffprobe",
      [filePath, "-hide_banner", "-show_entries", "format=duration"]
      // ,{shell: true, stdio: "inherit"}
    );
    let result = "";

    child.stdout.on("data", (data) => {
      result += data.toString();
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`コマンドがエラーコード ${code} で終了しました。`));
        return;
      }
      resolve(result);
    });
  });
};

export const getDuration = async (mediaDirPath: string, file: string) => {
  const filePath = mediaDirPath + "/" + file;
  try {
    const formatResult = <string>await ffprobeGetDuration(filePath);
    console.log("result");
    const duration = <RegExpMatchArray>(
      formatResult.match(/duration=(\d+\.\d+)/)
    );
    console.log("duration", duration);
    return Number(duration[1]);
  } catch (error) {
    console.error("error: ", error);
    return 0;
  }
};

export const getSample = async (mediaDirPath: string, file: string) => {
  const filePath = mediaDirPath + "/" + file;
  try {
    const formatResult = <string>await ffprobeGetSample(filePath);
    console.log("result");
    const duration = <RegExpMatchArray>(
      formatResult.match(/duration=(\d+\.\d+)/)
    );
    console.log("duration", duration);
    return Number(duration[1]);
  } catch (error) {
    console.error("error: ", error);
    return 0;
  }
};

/*
async function main() {
  const test = await getDuration("/Users/knd/chat_dev/upload/QUMALI.mp4");
  console.log("test", test);
}

main();
*/

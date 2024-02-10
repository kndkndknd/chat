import { spawn } from "child_process";

/*
export const getM3u8 = (url) => {
  const childProcess = spawn("yt-dlp", ["--print", "urls", url]);
  let result = "";
  childProcess.stdout.on("data", (data) => {
    result += data.toString();
  });
  childProcess.on("close", (code) => {
    console.log(`プロセスが終了しました。終了コード: ${code}`);
    console.log("結果:", result);
    return result;
  });

  const childProcess = spawn("yt-dlp", ["--print", "urls", url], {
    stdio: "inherit",
  });
  // イベントハンドリング
  childProcess.on("close", (code) => {
    console.log(`プロセスが終了しました。終了コード: ${code}`);
    return { success: true, result: code };
  });

  childProcess.on("error", (err) => {
    console.error(`エラーが発生しました: ${err.message}`);
    return { success: false, result: err.message };
  });
};
*/
export async function getM3u8(url) {
  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", ["--print", "urls", url]);
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
}

const main = async () => {
  try {
    const test = await getM3u8("https://www.showroom-live.com/r/dfc7a5256716");
    console.log("result", test);
  } catch (error) {
    console.error("error: ", error);
  }
};

main();

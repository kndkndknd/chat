import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

const defaultEnvPath = path.resolve(__dirname, "../../..", ".env");

/**
 * .env を読み込む。app.ts から最初に import し、Redis などの
 * モジュールが環境変数を読む前に実行する。
 */
export const loadEnv = (envPath: string = defaultEnvPath): void => {
  if (!fs.existsSync(envPath)) {
    return;
  }
  console.log("Loading .env file from:", envPath);
  dotenv.config({ path: envPath });
};

loadEnv();

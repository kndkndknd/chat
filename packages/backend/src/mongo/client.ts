import { MongoClient, Db } from "mongodb";

// NOTE: 接続情報はモジュール読み込み時ではなく、最初の接続時に読む。
// app.ts の dotenv.config() より先に本モジュールが import されるため、
// トップレベルで process.env を参照すると .env の値を取り逃がして
// 認証なしのフォールバックURLを掴んでしまう。
let client: MongoClient | null = null;
let connected: Promise<void> | null = null;
let dbName = "itsuki";

export const getMongoDb = async (): Promise<Db> => {
  if (connected === null) {
    const url = process.env.MONGO_URL || "mongodb://localhost:27017";
    dbName = process.env.MONGO_DB || "itsuki";
    client = new MongoClient(url);
    connected = client.connect().then(() => {
      console.log("Mongo connected:", url, "db:", dbName);
    });
  }
  await connected;
  return client!.db(dbName);
};

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPw = process.env.DB_PW;

// MongoDB接続情報
const uri = "mongodb://" + dbUser + ":" + dbPw + "@" + dbHost + ":27017";
const dbName = "chat";
const collectionName = "stream";

type streamType = {
  type: string;
  audio: string;
  video: string;
  location: string;
  createdAt: Date;
};

export async function insertData(stream: streamType) {
  const client = new MongoClient(uri);

  try {
    // MongoDBに接続
    await client.connect();

    // データベースとコレクションを選択
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // データをインサート
    const result = await collection.insertOne(stream);
    console.log(`Inserted document with _id: ${result.insertedId}`);
    return result.insertedId;
  } catch (error) {
    console.error("Error inserting data:", error);
  } finally {
    // MongoDB接続を閉じる
    await client.close();
  }
}

export const findData = async (key: string, value: string) => {
  const searchCondition = { 
    [key]: value
  };
  const client = new MongoClient(uri);

  try {
    // MongoDBに接続
    await client.connect();

    // データベースとコレクションを選択
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // 条件に一致するレコードを検索
    const records = await collection.find(searchCondition).toArray();
    return records;
  } catch (error) {
    console.error("Error finding records:", error);
  } finally {
    // MongoDB接続を閉じる
    await client.close();
  }
};

// insertData(stream);

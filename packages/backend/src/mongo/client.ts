import { MongoClient, Db } from "mongodb";

const url = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "itsuki";

export const mongoClient = new MongoClient(url);

let connected: Promise<void> | null = null;

export const getMongoDb = async (): Promise<Db> => {
  if (connected === null) {
    connected = mongoClient.connect().then(() => {
      console.log("Mongo connected:", url, "db:", dbName);
    });
  }
  await connected;
  return mongoClient.db(dbName);
};

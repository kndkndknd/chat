"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findData = exports.insertData = void 0;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPw = process.env.DB_PW;
// MongoDB接続情報
const uri = "mongodb://" + dbUser + ":" + dbPw + "@" + dbHost + ":27017";
const dbName = "chat";
const collectionName = "stream";
function insertData(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new mongodb_1.MongoClient(uri);
        try {
            // MongoDBに接続
            yield client.connect();
            // データベースとコレクションを選択
            const db = client.db(dbName);
            const collection = db.collection(collectionName);
            // データをインサート
            const result = yield collection.insertOne(stream);
            console.log(`Inserted document with _id: ${result.insertedId}`);
            return result.insertedId;
        }
        catch (error) {
            console.error("Error inserting data:", error);
        }
        finally {
            // MongoDB接続を閉じる
            yield client.close();
        }
    });
}
exports.insertData = insertData;
const findData = (type, location) => __awaiter(void 0, void 0, void 0, function* () {
    const searchCondition = { type: type, location: location };
    const client = new mongodb_1.MongoClient(uri);
    try {
        // MongoDBに接続
        yield client.connect();
        // データベースとコレクションを選択
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        // 条件に一致するレコードを検索
        const records = yield collection.find(searchCondition).toArray();
        return records;
    }
    catch (error) {
        console.error("Error finding records:", error);
    }
    finally {
        // MongoDB接続を閉じる
        yield client.close();
    }
});
exports.findData = findData;
// insertData(stream);

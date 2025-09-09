import { MongoClient } from "mongodb";

// 경고: 이 정보는 외부에 노출되므로 보안에 매우 취약합니다.
const uri = "mongodb://dbmoodpostbox:VKKAW8MSHr1cm0y5cyq0vDJkHo99WwK7tWaxXFCCLdhqit7r9MdcEHttyEUglqixcSlMZUPtZzc4ACDbB30mcg==@dbmoodpostbox.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@dbmoodpostbox@";

const client = new MongoClient(uri);

// 데이터베이스와 컬렉션 접근 함수
export async function getCollectionData(databaseName, collectionName) {
  try {
    await client.connect();
    const database = client.db(databaseName);
    const collection = database.collection(collectionName);

    const query = {}; // 모든 문서를 가져오는 쿼리
    const data = await collection.find(query).toArray();
    
    return data;
  } finally {
    await client.close();
  }
}
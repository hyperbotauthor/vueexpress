const { MongoClient } = require("mongodb");

const { Client } = require("../dist/index.js");

async function testMongo() {
  const client = new Client(MongoClient);

  const db = client.db("test");

  const coll = db.collection("test", { getAll: false });

  console.log(await client.connect());
  console.log(
    await coll.upsertOneById("testupsert", { content: "testupsert" }),
    coll.docs
  );
  console.log(await coll.getAll());
  console.log(await coll.deleteOneById("testupsert"));
  console.log(await coll.getAll());
}

testMongo();

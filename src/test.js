const { MongoClient } = require("mongodb");

const { Client, Seek } = require("../dist/index.js");

async function testMongo() {
  const client = new Client(MongoClient, {
    sender: (ev) => {
      console.log("send", ev);
    },
  });

  const db = client.db("test");

  const coll = db.classCollection(Seek, "test", {
    getAll: true,
    sendOnChange: true,
  });

  console.log(await client.connect());
  console.log(await coll.drop());
  console.log(await coll.upsertOneById("testupsert", new Seek()));
  console.log(await coll.getAll());
  process.exit();
}

testMongo();

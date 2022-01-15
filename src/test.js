const { MongoClient } = require("mongodb");

const { Client } = require("../dist/index.js");

function testMongo() {
  const client = new Client(MongoClient);

  const db = client.db("test");

  const coll = db.collection("test", { getAll: false });

  client.connect().then((result) => {
    console.log("cached docs", coll.docs);
    coll
      .upsertOneById("testupsert", { content: "testupsert" })
      .then((result) => {
        console.log("upsert result", result);
        console.log("docs", coll.docs, coll.getById("testupsert"));
      });
  });
}

testMongo();

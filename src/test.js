const { MongoClient } = require("mongodb");

const { Client } = require("../dist/index.js");

function testMongo() {
  const client = new Client(MongoClient);

  client.connect().then((result) => {
    //console.log(result);

    const db = client.db("test");

    const coll = db.collection("test");

    Promise.all(
      [1, 2, 3].map((i) =>
        coll.upsertOne({ _id: `test${i}` }, { content: `test${i}` })
      )
    ).then((result) => {
      //console.log(result);

      coll.getAll().then((result) => {
        console.log(result);

        process.exit();
      });
    });
  });
}

testMongo();

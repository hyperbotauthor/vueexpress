const { MongoClient } = require("mongodb");

const { Client } = require("../dist/index.js");

const client = new Client(MongoClient);

client.connect().then((result) => {
  console.log(result);

  process.exit();
});

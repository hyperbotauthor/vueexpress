export class Db {
  name: string;
  parentClient: Client;

  db: any;

  collections: Collection[] = [];

  constructor(name: string, parentClient: Client) {
    this.name = name;
    this.parentClient = parentClient;
    this.db = this.parentClient.client.db(name);
  }

  collection(name: string) {
    const coll = new Collection(name, this);
    this.collections.push(coll);
    return coll;
  }
}

export class Collection {
  name: string;
  parentDb: Db;
  collection: any;

  constructor(name: string, parentDb: Db) {
    this.name = name;
    this.parentDb = parentDb;
    this.collection = parentDb.db.collection(name);
  }

  upsertOne(query: any, set: any) {
    //console.log("upsert one", query, set);
    return new Promise((resolve) => {
      this.collection
        .updateOne(
          query,
          {
            $set: set,
          },
          {
            upsert: true,
          }
        )
        .then((result: any) => {
          //console.log(result);
          resolve(result);
        })
        .catch((err: any) => {
          console.error(err);
          resolve({ error: err });
        });
    });
  }

  getAll(query?: any) {
    return new Promise((resolve) => {
      this.collection.find(query || {}).toArray((err: any, result: any) => {
        if (err) {
          console.error("getall error", query, err);
          resolve([]);
        }

        resolve(result);
      });
    });
  }
}

export class Client {
  MongoClient: any;
  config: any = {};

  MONGODB_URI: string = "";

  client: any = undefined;

  dbs: Db[] = [];

  constructor(MongoClient: any, config?: any) {
    this.MongoClient = MongoClient;
    if (config) this.config = config;

    this.MONGODB_URI = this.config.MONGODB_URI || process.env.MONGODB_URI;

    this.client = new MongoClient(this.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  connect() {
    return new Promise((resolve) => {
      this.client.connect((err: any) => {
        if (err) {
          console.error("MongoDb connection failed", err);
          resolve({ error: err, success: false });
        } else {
          console.log("MongoDb connected!");
          resolve({ error: false, success: true });
        }
      });
    });
  }

  db(name: string) {
    const db = new Db(name, this);
    this.dbs.push(db);
    return db;
  }
}

import { ConnectionCheckedInEvent } from "mongodb";

export class Db {
  name: string;
  parentClient: Client;

  config: any = {};

  db: any;

  collections: Collection[] = [];

  constructor(name: string, parentClient: Client, config?: any) {
    this.name = name;
    this.parentClient = parentClient;
    if (config) this.config = config;
    this.db = this.parentClient.client.db(name);
  }

  getSender() {
    return this.config.sender || this.parentClient.config.sender;
  }

  collection(name: string, config?: any) {
    const coll = new Collection(name, this, config);
    this.collections.push(coll);
    return coll;
  }

  onConnect() {
    console.log("connecting db", this.name);

    return new Promise((resolve) => {
      Promise.all(this.collections.map((coll) => coll.onConnect())).then(
        (result) => {
          resolve(result);
        }
      );
    });
  }
}

export class Collection {
  name: string;
  parentDb: Db;
  collection: any;
  config: any = {};
  docs: any[] = [];

  constructor(name: string, parentDb: Db, config?: any) {
    this.name = name;
    this.parentDb = parentDb;
    this.collection = parentDb.db.collection(name);
    if (config) this.config = config;
  }

  getSender() {
    return this.config.sender || this.parentDb.getSender();
  }

  onChange() {
    //console.log(this.fullName(), "changed");
    if (this.config.onChange) this.config.onChange(this);
    if (this.config.sendOnChange) {
      const sender = this.getSender();
      if (sender) {
        sender({
          kind: "collchanged",
          fullName: this.fullName(),
          name: this.name,
          docs: this.docs,
        });
      }
    }
  }

  setDoc(doc: any, set: any) {
    for (const key of Object.keys(set)) {
      doc[key] = set[key];
    }
    return doc;
  }

  getOneById(id: string) {
    return new Promise((resolve) => {
      this.collection
        .findOne({ _id: id })
        .then((result: any) => resolve(result));
    });
  }

  deleteById(id: string) {
    this.docs = this.docs.filter((doc) => doc._id !== id);
  }

  deleteOneById(id: string) {
    return new Promise((resolve) => {
      this.collection.deleteOne({ _id: id }).then((result: any) => {
        this.deleteById(id);
        this.onChange();
        resolve(result);
      });
    });
  }

  upsertOneById(id: string, set: any) {
    //console.log("upsert one", id, set);
    return new Promise((resolve) => {
      this.collection
        .updateOne(
          { _id: id },
          {
            $set: set,
          },
          {
            upsert: true,
          }
        )
        .then((result: any) => {
          const doc = this.getById(id);
          //console.log(result, doc);
          if (doc) {
            this.setDoc(doc, set);
            this.onChange();
            resolve(result);
          } else {
            this.getOneById(id).then((doc) => {
              if (doc) {
                this.docs.push(doc);
              } else {
                console.warn("missing upserted doc", id, set);
              }
              this.onChange();
              resolve(result);
            });
          }
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

  fullName() {
    return `${this.parentDb.name}/${this.name}`;
  }

  onConnect() {
    console.log("connecting collection", this.fullName());
    return new Promise((resolve) => {
      if (this.config.getAll) {
        this.getAll(this.config.getAllQuery).then((result: any) => {
          this.docs = result;
          resolve(result);
        });
      } else {
        resolve(true);
      }
    });
  }

  getById(id: string) {
    return this.docs.find((doc) => doc._id === id);
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
          Promise.all(this.dbs.map((db) => db.onConnect())).then((result) => {
            resolve({ error: false, success: true, onConnect: result });
          });
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

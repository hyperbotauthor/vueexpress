import { MongoSerializeableClass, fileLogger, DAY } from "./index";

const flog = new fileLogger("mongots.log");

export class PruneCollConfig {
  createdAtKey: string = "createdAt";
  now: number = Date.now();
  timeout: number = DAY;

  constructor(pcc?: PruneCollConfig) {
    if (!pcc) return;
    if (pcc.createdAtKey) this.createdAtKey = pcc.createdAtKey;
    if (pcc.now) this.now = pcc.now;
    if (pcc.timeout) this.timeout = pcc.timeout;
  }
}

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

  getSenderRes() {
    return this.config.senderRes || this.parentClient.config.senderRes;
  }

  collection(name: string, config?: any) {
    const coll = new Collection(name, this, config);
    this.collections.push(coll);
    return coll;
  }

  onConnect() {
    //console.log("connecting db", this.name);

    return new Promise((resolve) => {
      Promise.all(this.collections.map((coll) => coll.onConnect())).then(
        (result) => {
          resolve(result);
        }
      );
    });
  }

  classCollection<T extends MongoSerializeableClass<T>>(
    type: T,
    name: string,
    config?: any
  ): ClassCollection<T> {
    const coll = this.collection(name, config);
    const classColl = new ClassCollection<T>(type, coll, config);
    return classColl;
  }
}

export class ClassCollection<T extends MongoSerializeableClass<T>> {
  collection: Collection;
  config: any;
  type: T;

  constructor(type: T, collection: Collection, config?: any) {
    this.type = type;
    this.collection = collection;
    if (config) this.config = config;
  }

  get docs() {
    return this.collection.docs;
  }

  createInstance(doc: any) {
    const instance = new this.type();

    instance.deserialize(doc || {});

    return instance;
  }

  getOneById(id: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      this.collection.getOneById(id).then((doc) => {
        if (doc) {
          resolve(this.createInstance(doc));
        } else {
          resolve(undefined);
        }
      });
    });
  }

  getById(id: string): T | undefined {
    const doc = this.collection.getById(id);
    if (!doc) return undefined;
    return this.createInstance(doc);
  }

  upsertOneById(id: string, instance: T) {
    instance.id = id;
    const doc = instance.serialize();
    return this.collection.upsertOneById(id, doc);
  }

  deleteOneById(id: string) {
    return this.collection.deleteOneById(id);
  }

  fullName() {
    return this.collection.fullName();
  }

  getAll(query?: any) {
    //flog.log("classcoll getall", this.fullName());
    return new Promise((resolve) => {
      this.collection.getAll(query).then((all: any) => {
        //flog.log("got", this.fullName(), all);
        resolve(all.map((doc: any) => this.createInstance(doc)));
      });
    });
  }

  drop() {
    return this.collection.drop();
  }

  send() {
    this.collection.send();
  }

  sendRes(res: any) {
    this.collection.sendRes(res);
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

  getOldest(pccOpt?: PruneCollConfig) {
    const pcc = new PruneCollConfig(pccOpt);

    const oldest = this.docs.reduce((acc, curr) => {
      if (!acc) return curr;

      const accCreatedAt = acc[pcc.createdAtKey];
      const currCreatedAt = curr[pcc.createdAtKey];

      return currCreatedAt < accCreatedAt ? curr : acc;
    }, undefined);

    return oldest;
  }

  getOldestExpired(pccOpt?: PruneCollConfig) {
    const pcc = new PruneCollConfig(pccOpt);

    const oldest = this.getOldest(pcc);

    if (!oldest) return undefined;

    if (pcc.now - oldest[pcc.createdAtKey] > pcc.timeout) {
      return oldest;
    }

    return undefined;
  }

  deleteOldestExpired(pcc?: PruneCollConfig) {
    return new Promise((resolve) => {
      const oldestExpired = this.getOldestExpired(pcc);

      if (!oldestExpired) {
        resolve(undefined);
        return;
      }

      this.deleteOneById(oldestExpired.id).then((result) => {
        resolve({
          result,
          deletedDoc: oldestExpired,
        });
      });
    });
  }

  drop() {
    return new Promise((resolve) => {
      this.collection
        .drop()
        .then((result: any) => {
          console.log("dropped", this.fullName(), result);
          resolve(result);
        })
        .catch((err: any) => resolve({ error: err }));
    });
  }

  getSender() {
    return this.config.sender || this.parentDb.getSender();
  }

  getSenderRes() {
    return this.config.sender || this.parentDb.getSenderRes();
  }

  sendFunc(sender: any, res?: any) {
    if (sender) {
      const docsToSend = this.config.sendFilter
        ? this.docs.filter(this.config.sendFilter)
        : this.docs;
      sender(
        {
          kind: "collchanged",
          fullName: this.fullName(),
          name: this.name,
          docs: docsToSend,
        },
        res
      );
    }
  }

  send() {
    this.sendFunc(this.getSender());
  }

  sendRes(res: any) {
    this.sendFunc(this.getSenderRes(), res);
  }

  onChange() {
    //console.log(this.fullName(), "changed");
    if (this.config.onChange) this.config.onChange(this);
    if (this.config.sendOnChange) {
      this.send();
    }
  }

  setDoc(doc: any, set: any) {
    for (const key of Object.keys(set)) {
      doc[key] = set[key];
    }
    return doc;
  }

  getOneById(id: string) {
    //flog.log("get one by id", this.fullName(), id);
    return new Promise((resolve) => {
      this.collection
        .findOne({ _id: id })
        .then((result: any) => {
          //flog.log("find one result", result);
          if (result) {
            const stored = this.getById(id);
            //flog.log("stored", stored);
            if (stored) {
              this.setDoc(stored, result);
            } else {
              this.docs.push(result);
            }
          } else {
            this.deleteById(id);
          }
          resolve(result);
        })
        .catch((err: any) => {
          console.error(err);
          resolve(undefined);
        });
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
    set.id = id;
    //flog.log("upsert one", id, set);
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
          flog.log(
            "upsert result",
            this.fullName(),
            "id",
            id,
            "set",
            set,
            "result",
            result,
            "doc",
            doc
          );
          if (doc) {
            this.setDoc(doc, set);
            this.onChange();
            resolve(result);
          } else {
            this.getOneById(id).then((result) => {
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
    //flog.log("coll getall", this.fullName(), query);
    return new Promise((resolve) => {
      this.collection.find(query || {}).toArray((err: any, result: any) => {
        //flog.log("got", this.fullName(), "result", result, "err", err);
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
    //console.log("connecting collection", this.fullName());
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
    const doc = this.docs.find((doc) => (doc._id || doc.id) === id);

    //console.log("get by id", this.fullName(), id, doc)

    return doc;
  }

  getByIdElse(id: string) {
    //console.log("get by id else", this.fullName(), id)
    return new Promise((resolve) => {
      const doc = this.getById(id);
      if (doc) {
        //console.log("doc in cache", doc)
        resolve(doc);
      } else {
        this.getOneById(id).then((result) => resolve(result));
      }
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

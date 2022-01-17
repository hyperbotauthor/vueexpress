const {
  setNode,
  fileLogger,
  Seek,
  Client,
  randUserName,
  envIntElse,
  uid,
} = require("../dist/index");

setNode(require("fs"), require("path"), __dirname, process.env);

const flog = new fileLogger("api.log");

const TICK_BASE = envIntElse("TICK_BASE", 60000);
const MAX_SEEKS = envIntElse("MAX_SEEKS", 2);

var express = require("express");
var router = express.Router();

let eventSources = [];

function sendEventRes(ev, res) {
  res.write("data: " + JSON.stringify(ev) + "\n\n");
}

function sendEvent(ev) {
  //console.log("send to all", ev);
  for (let es of eventSources) {
    sendEventRes(ev, es.res);
  }
}

const client = new Client(require("mongodb").MongoClient, {
  senderRes: sendEventRes,
  sender: sendEvent,
});

const db = client.db("vueexpress");

const seeksColl = db.classCollection(Seek, "seeks", {
  getAll: true,
  sendOnChange: true,
});

async function checkSeeks() {
  for (let doc of seeksColl.collection.docs) {
    const seekId = doc.id;
    const userId = doc.createdBy.id;
    const profile = usersColl.getById(userId);
    const lastSeenAt = profile ? profile.lastSeenAt : 0;
    flog.log("check seek", userId, seekId, Date.now() - lastSeenAt);
    if (!profile || Date.now() - lastSeenAt > TICK_BASE * 4) {
      flog.log("removing outdated seek", userId, seekId);
      await seeksColl.deleteOneById(seekId);
    }
  }

  setTimeout(checkSeeks, TICK_BASE);
}

const fetch = require("node-fetch");

let reqCnt = 0;

const messagesColl = db.collection("messages", {
  getAll: true,
  sendOnChange: true,
});

const MAX_MESSAGES = 20;

const userIdsColl = db.collection("userids", {});

const usersColl = db.collection("users", {
  sendFilter: (doc) => Date.now() - doc.lastSeenAt < 2 * TICK_BASE,
  sendOnChange: true,
});

function createProfile(userId, userName) {
  const profile = {
    id: userId,
    username: userName,
    identifiedAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  return profile;
}

function getProfileForToken(token) {
  //console.log("get profile for token", token)
  const doc = userIdsColl.getById(token);
  //console.log("user id doc", doc)
  if (!doc) return undefined;
  const profile = usersColl.getById(doc.userId);
  //console.log("profile", profile)
  return profile;
}

function setupRouter() {
  // parse json payload
  router.use(express.json());

  // middleware that increases reqCnt on every request
  router.use(function incReqCnt(req, res, next) {
    reqCnt++;
    next();
  });

  router.use(function authUser(req, res, next) {
    const token = req.body.token;
    req.profile = getProfileForToken(token);
    next();
  });

  // define the reqcnt api route
  router.post("/reqcnt", function (req, res) {
    //console.info("reqcnt", req.body);
    res.send(
      JSON.stringify({
        reqCnt,
      })
    );
  });

  router.get("/board", async function (req, res) {
    try {
      require("./board").board(req, res);
    } catch (err) {
      console.error(err);
      res.send(`<pre style="color: #700; font-weight: bold;")>${err}</pre>`);
    }
  });

  function addEventSource(res) {
    eventSources.push({
      res,
      created: Date.now(),
    });
  }

  setInterval(() => {
    usersColl.send();
  }, TICK_BASE * 2);

  router.get("/events", function (req, res) {
    //console.log("/events");

    res.set({
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    });

    res.flushHeaders();

    // Tell the client to retry every 10 seconds if connectivity is lost
    res.write("retry: 10000\n\n");

    seeksColl.sendRes(res);
    usersColl.sendRes(res);
    messagesColl.sendRes(res);

    sendEventRes(
      {
        kind: "config",
        TICK_BASE,
      },
      res
    );

    addEventSource(res);
  });

  function checkMessages() {
    if (messagesColl.docs.length > MAX_MESSAGES) {
      messagesColl
        .deleteOneById(messagesColl.docs[0].id)
        .then((result) => setTimeout(checkMessages, 1000));
    } else {
      setTimeout(checkMessages, 1000);
    }
  }

  router.post("/post", async function (req, res) {
    //console.log("post", req.body);

    const token = req.body.token;
    const msg = req.body.msg;

    const profile = req.profile;

    if (!profile) {
      console.error("not authorized");

      return;
    }

    messagesColl.upsertOneById(uid(), {
      msg,
      time: Date.now(),
      profile,
    });
  });

  async function loginByUserId(userId, res, profile) {
    //console.log("login by user id", userId, profile);

    if (!profile) {
      //console.log("looking up profile in cache");

      profile = await usersColl.getByIdElse(userId);

      if (!profile) {
        console.error("fatal, could not get profile");

        return;
      }

      profile.lastSeenAt = Date.now();

      //console.log("obtained profile", profile);
    } else {
      await usersColl.upsertOneById(userId, profile);
    }

    res.send(JSON.stringify(profile));
  }

  async function createRandomProfile(res) {
    const profile = createProfile(uid(), randUserName());

    profile.setTokenToUserId = true;

    //console.log("created random profile", profile);

    await userIdsColl.upsertOneById(profile.id, { userId: profile.id });

    await loginByUserId(profile.id, res, profile);
  }

  router.post("/login", async function (req, res) {
    const token = req.body.token || "";

    if (token.length < 10) {
      //console.log("token too short", token);

      createRandomProfile(res);

      return;
    }

    //console.log("login with token", token);

    const existingUser = await userIdsColl.getOneById(token);

    //console.log("existing user", existingUser);

    if (existingUser) {
      const userId = existingUser.userId;

      loginByUserId(userId, res);

      return;
    }

    const accountResp = await fetch("https://lichess.org/api/account", {
      headers: {
        Authorization: `Bearer ${req.body.token}`,
      },
    });

    const account = await accountResp.json();

    //console.log("obtained", account);

    if (!account.error) {
      const userId = account.id;

      //console.log("inserting user id", userId);

      await userIdsColl.upsertOneById(token, { userId });

      const profile = createProfile(userId, account.username);

      await usersColl.upsertOneById(userId, profile);

      loginByUserId(userId, res, profile);
    } else {
      //console.log("lichess account could not be resolved");

      createRandomProfile(res);
    }
  });

  router.post("/randusers", function (req, res) {
    const limit = req.body.limit;
    //console.log("limit", limit)
    res.send(
      JSON.stringify(
        Array(50)
          .fill(0)
          .map(() => randUserName(limit))
      )
    );
  });

  router.post("/createseek", async function (req, res) {
    const profile = req.profile;

    const params = req.body;

    const variant = params.variant;
    const initialTime = params.initialTime;
    const increment = params.increment;
    const rounds = params.rounds;

    if (profile) {
      console.log("create seek", req.profile.username, {
        variant,
        initialTime,
        increment,
        rounds,
      });

      const seeksByUser = seeksColl.docs.filter(
        (seek) => seek.createdBy.userId === profile.userId
      );

      if (seeksByUser.length >= MAX_SEEKS) {
        res.send(
          JSON.stringify({
            ok: false,
            error: `Maximum Allowed Seeks ${MAX_SEEKS}`,
          })
        );

        return;
      }

      const seek = new Seek().setVariant(variant);

      if (initialTime !== undefined) seek.initialTime = initialTime;
      if (increment !== undefined) seek.increment = increment;
      if (rounds !== undefined) seek.rounds = rounds;

      seek.createdBy = req.profile;

      await seeksColl.upsertOneById(seek.id, seek);

      //console.log(await seeksColl.getAll())

      res.send(JSON.stringify({ ok: true, seekId: seek.id }));
    } else {
      console.warn("not authorized to create seek");

      res.send(JSON.stringify({ ok: false, error: `Not Authorized` }));
    }
  });

  router.post("/revokeseek", async function (req, res) {
    const id = req.body.id;

    const seek = seeksColl.getById(id);

    if (!seek) {
      console.warn("no such seek");
    } else if (!req.profile) {
      console.warn("not authenticated");
    } else if (req.profile.id !== seek.createdBy.id) {
      console.warn("not authorized");
    } else {
      console.log("revoke seek", req.profile.username, id);

      seeks = await seeksColl.deleteOneById(id);
    }

    res.send(JSON.stringify({ ok: true }));
  });
}

flog.log("connecting");

client.connect().then(async (result) => {
  if (false) {
    await messagesColl.drop();
    await seeksColl.drop();
    await userIdsColl.drop();
    await usersColl.drop();
  }

  flog.log("setting up router");

  setupRouter();

  flog.log("setting up seeks check");

  setTimeout(checkSeeks, TICK_BASE * 4);
});

module.exports = router;

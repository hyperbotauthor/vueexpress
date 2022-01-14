var express = require("express");
var router = express.Router();

const fetch = require("node-fetch");

const { uid, randUserName } = require("./utils");

const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;

let reqCnt = 0;

let messages = [];

let eventSources = [];

const MAX_MESSAGES = 20;

let userIdsCache = {};
let usersCache = {};

const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

var appDb = null;
var userIdsColl = null;
var usersColl = null;

function createProfile(userId, userName) {
  const profile = {
    id: uid(),
    username: userName,
    identifiedAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  return profile;
}

function updateUserIdsColl(token, userId) {
  console.log("updating user ids coll", token, userId);

  userIdsColl
    .updateOne(
      {
        _id: token,
      },
      {
        $set: {
          id: userId,
        },
      },
      {
        upsert: true,
      }
    )
    .then((result) => {
      console.log("user ids coll update result", result);
    });
}

function updateUsersColl(userId, profile) {
  console.log("updating users coll", userId, profile);

  usersColl
    .updateOne(
      {
        _id: userId,
      },
      {
        $set: profile,
      },
      {
        upsert: true,
      }
    )
    .then((result) => {
      console.log("users coll update result", result);
    });
}

function connect(request) {
  return new Promise((resolve) => {
    client.connect((err) => {
      if (err) {
        console.error("MongoDb connection failed", err);
        resolve(false);
      } else {
        console.log("MongoDb connected!");
        appDb = client.db("vueexpress");
        userIdsColl = appDb.collection("userids");
        usersColl = appDb.collection("users");
        if (false) {
          userIdsColl.drop();
          usersColl.drop();
        }
        resolve(true);
      }
    });
  });
}

function setupRouter() {
  // parse json payload
  router.use(express.json());

  // middleware that increases reqCnt on every request
  router.use(function timeLog(req, res, next) {
    console.log(`request ${reqCnt++}`);
    next();
  });

  // define the reqcnt api route
  router.post("/reqcnt", function (req, res) {
    console.info("reqcnt", req.body);
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

  function sendEventRes(ev, res) {
    res.write("data: " + JSON.stringify(ev) + "\n\n");
  }

  function sendEvent(ev) {
    console.log("send to all", ev);
    for (let es of eventSources) {
      sendEventRes(ev, es.res);
    }
  }

  function getActiveUsersCache() {
    const activeUsersCache = {};

    for (let userId in usersCache) {
      const profile = usersCache[userId];

      const elapsedSinceSeen = Date.now() - profile.lastSeenAt;

      if (elapsedSinceSeen < 30000) {
        activeUsersCache[userId] = usersCache[userId];
      }
    }

    return activeUsersCache;
  }

  setInterval(() => {
    sendEvent({
      kind: "tick",
      time: Date.now(),
      reqCnt,
      usersCache: getActiveUsersCache(),
    });
  }, 10000);

  router.get("/events", function (req, res) {
    console.log("/events");

    res.set({
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    });

    res.flushHeaders();

    // Tell the client to retry every 10 seconds if connectivity is lost
    res.write("retry: 10000\n\n");

    sendEventRes(
      {
        kind: "chat",
        messages,
        usersCache: getActiveUsersCache(),
      },
      res
    );

    addEventSource(res);
  });

  router.post("/post", async function (req, res) {
    console.log("post", req.body);

    const msg = req.body.msg;

    const accountResp = await fetch("https://lichess.org/api/account", {
      headers: {
        Authorization: `Bearer ${req.body.token}`,
      },
    });

    const account = await accountResp.json();

    console.log("account", account);

    messages.unshift({
      msg,
      time: Date.now(),
      account,
    });

    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(0, MAX_MESSAGES);
    }

    sendEvent({
      kind: "chat",
      messages,
    });
  });

  async function loginByUserId(userId, res, profile) {
    console.log("login by user id", userId, profile);

    if (!profile) {
      console.log("looking up profile in cache");

      profile = usersCache[userId];

      if (!profile) {
        console.log("looking up profile in db");

        profile = await usersColl.findOne({ _id: userId });
      }

      if (!profile) {
        console.error("fatal, could not get profile");

        return;
      }

      profile.lastSeenAt = Date.now();

      console.log("obtained profile", profile);
    }

    updateUsersColl(userId, profile);

    usersCache[userId] = profile;

    res.send(profile);
  }

  function createRandomProfile(res) {
    const profile = createProfile(uid(), randUserName());

    profile.setTokenToUserId = true;

    console.log("created random profile", profile);

    updateUserIdsColl(profile.id, profile.id);

    loginByUserId(profile.id, res, profile);
  }

  router.post("/login", async function (req, res) {
    const token = req.body.token || "";

    if (token.length < 10) {
      console.log("token too short", token);

      createRandomProfile(res);

      return;
    }

    console.log("login with token", token);

    const cachedId = userIdsCache[token];

    if (cachedId) {
      console.log("cached id", cachedId);

      loginByUserId(cachedId, res);

      return;
    }

    const existingUser = await userIdsColl.findOne({ _id: token });

    console.log("existing user", existingUser);

    if (existingUser) {
      const userId = existingUser.id;

      userIdsCache[token] = userId;

      loginByUserId(userId, res);

      return;
    }

    const accountResp = await fetch("https://lichess.org/api/account", {
      headers: {
        Authorization: `Bearer ${req.body.token}`,
      },
    });

    const account = await accountResp.json();

    console.log("obtained", account);

    if (!account.error) {
      const userId = account.id;

      console.log("inserting user id", userId);

      updateUserIdsColl(token, userId);

      const profile = createProfile(userId, accout.username);

      updateUsersColl(userId, profile);

      loginByUserId(userId, profile);
    } else {
      console.log("lichess account could not be resolved");

      createRandomProfile(res);
    }
  });
}

connect().then((result) => {
  setupRouter();
});

module.exports = router;

var express = require("express");
var router = express.Router();

const fetch = require("node-fetch");

const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;

let reqCnt = 0;

let messages = [];

let eventSources = [];

const MAX_MESSAGES = 20;

const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

function connect(request) {
  return new Promise((resolve) => {
    client.connect((err) => {
      if (err) {
        console.error("MongoDb connection failed", err);
        resolve(false);
      } else {
        console.log("MongoDb connected!");
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
    for (let es of eventSources) {
      sendEventRes(ev, es.res);
    }
  }

  setInterval(() => {
    sendEvent({
      kind: "tick",
      time: Date.now(),
      reqCnt,
    });
  }, 5000);

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
}

connect().then((result) => {
  setupRouter();
});

module.exports = router;

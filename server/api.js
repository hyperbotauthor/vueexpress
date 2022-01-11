var express = require("express");
var router = express.Router();

const path = require("path");
const fs = require("fs");

// parse json payload
router.use(express.json());

let reqCnt = 0;

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

router.get("/board", function (req, res) {
  const { createCanvas } = require("canvas");
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext("2d");

  ctx.font = "30px Impact";
  ctx.rotate(0.1);
  ctx.fillText("Awesome!", 50, 100);

  const buff = canvas.toBuffer();

  const name = `board_${Math.floor(Math.random() * 1e7)}.png`;

  const absPath = path.join(__dirname, "temp", name);

  fs.writeFileSync(absPath, buff);

  res.sendFile(absPath);
});

module.exports = router;

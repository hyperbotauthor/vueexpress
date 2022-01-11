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

router.get("/board", async function (req, res) {
  console.log("get board", req.query);

  const size = parseInt(req.query.size || "40");

  console.log("size", size);

  const fen = req.query.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

  console.log("fen", fen);

  const bckg = req.query.bckg || "maple.jpg";

  console.log("bckg", bckg);

  const { createCanvas, loadImage } = require("canvas");
  const canvas = createCanvas(size * 8, size * 8);
  const ctx = canvas.getContext("2d");

  const bckgImage = await loadImage(path.join(__dirname, "backgrounds", bckg));

  ctx.drawImage(bckgImage, 0, 0, size * 8, size * 8);

  let rank = 0;

  const pieceLetterToName = {
    P: "white.pawn",
    N: "white.knight",
    B: "white.bishop",
    R: "white.rook",
    Q: "white.queen",
    K: "white.king",
    p: "black.pawn",
    n: "black.knight",
    b: "black.bishop",
    r: "black.rook",
    q: "black.queen",
    k: "black.king",
  };

  for (let line of fen.split("/")) {
    for (let i = 1; i < 9; i++) {
      line = line.replace(`${i}`, Array(i).fill(" ").join(""));
    }

    let letters = line.split("");

    let file = 0;

    for (const letter of letters) {
      console.log("letter", letter);
      if (letter != " ") {
        const pieceName = pieceLetterToName[letter];
        const piece = await loadImage(
          path.join(__dirname, "pieces", `${pieceName}.svg`)
        );

        ctx.drawImage(piece, file * size, rank * size, size, size);
      }

      file++;
    }

    rank++;
  }

  const buff = canvas.toBuffer();

  const name = `board_${Math.floor(Math.random() * 1e7)}.png`;

  const absPath = path.join(__dirname, "temp", name);

  fs.writeFileSync(absPath, buff);

  res.sendFile(absPath);
});

module.exports = router;

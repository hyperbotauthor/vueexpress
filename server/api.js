var express = require("express");
var router = express.Router();

const path = require("path");
const fs = require("fs");

const { Game } = require("@publishvue/chessopsnpmts");
const { checkPrimeSync } = require("crypto");

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

  let fen = req.query.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

  console.log("fen", fen);

  const bckg = req.query.bckg || "maple.jpg";

  console.log("bckg", bckg);

  const moves = req.query.moves || "";

  console.log("moves", moves);

  const arrows = req.query.arrows || "";

  console.log("arrows", arrows);

  const flip = req.query.flip === "true";

  console.log("flip", flip);

  function uciToCoords(uci, color, flip) {
    const file = uci.charCodeAt(0) - "a".charCodeAt(0);
    const rank = 7 - (uci.charCodeAt(1) - "1".charCodeAt(0));
    return {
      file: flip ? 7 - file : file,
      rank: flip ? 7 - rank : rank,
      color,
    };
  }

  const arrowCoords = arrows
    ? arrows.split(" ").map((arrow) => {
        return [
          uciToCoords(arrow.substring(1, 3), arrow.substring(0, 1), flip),
          uciToCoords(arrow.substring(3, 5), arrow.substring(0, 1), flip),
        ];
      })
    : [];

  console.log("arrow coords", arrowCoords);

  if (moves) {
    const game = Game().setVariant("atomic", fen);
    game.playSansStr(moves);

    fen = game.reportFen().split(" ")[0];

    console.log("moves fen", fen);
  }

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

  for (const coords of arrowCoords) {
    console.log("arrow", coords);

    const from = coords[0];
    const to = coords[1];

    ctx.beginPath();
    ctx.moveTo(from.file * size + size / 2, from.rank * size + size / 2);
    ctx.lineTo(to.file * size + size / 2, to.rank * size + size / 2);

    ctx.globalAlpha = 0.7;
    ctx.lineWidth = size / 4;

    const strokeStyles = {
      r: "#a00",
      g: "#0a0",
      b: "#00a",
      y: "#aa0",
    };
    console.log("stroke styles", strokeStyles, "color", from.color);

    const strokeStyle = strokeStyles[from.color];
    console.log("stroke style", strokeStyle);
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      to.file * size + size / 2,
      to.rank * size + size / 2,
      (size / 2) * 0.6,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = strokeStyle;
    ctx.fill();
  }

  let lines = fen.split("/");

  if (flip) {
    lines.reverse();
  }

  for (let line of lines) {
    for (let i = 1; i < 9; i++) {
      line = line.replace(new RegExp(`${i}`, "g"), Array(i).fill(" ").join(""));
    }

    let letters = line.split("");

    if (flip) {
      letters.reverse();
    }

    let file = 0;

    for (const letter of letters) {
      //console.log("letter", letter);
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

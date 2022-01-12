const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const { Game, Pos } = require("@publishvue/chessopsnpmts");
const path = require("path");

const playerPaths = {
  fischer: "fischer.jpg",
  kasparov: "kasparov.jpg",
  carlsen: "carlsen.jpeg",
  steinitz: "steinitz.jpg",
  karpov: "karpov.jpg",
  anand: "anand.jpeg",
  kramnik: "kramnik.jpg",
  juditpolgar: "juditpolgar.jpg",
  tal: "tal.jpeg",
};

const strokeStyles = {
  r: "#a00",
  g: "#0a0",
  b: "#00a",
  y: "#aa0",
};

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

function uciToCoords(uci, color, flip) {
  const file = uci.charCodeAt(0) - "a".charCodeAt(0);
  const rank = 7 - (uci.charCodeAt(1) - "1".charCodeAt(0));
  return {
    file: flip ? 7 - file : file,
    rank: flip ? 7 - rank : rank,
    color,
  };
}

async function board(req, res) {
  console.log("get board", req.query);

  const splitter = new RegExp(" |,|_");

  const size = parseInt(req.query.size || "40");

  const bckg = req.query.bckg || "maple.jpg";

  const moves = req.query.moves || "";

  const arrows = req.query.arrows || "";

  const circles = req.query.circles || "";

  const player = req.query.player || "";

  const flip = req.query.flip === "true";

  const variant = req.query.variant || "atomic";

  const startFenPos = Pos().setVariant(variant);

  let fen = req.query.fen || startFenPos.reportFen().split(" ")[0];

  const arrowCoords = arrows
    ? arrows.split(splitter).map((arrow) => {
        return [
          uciToCoords(arrow.substring(1, 3), arrow.substring(0, 1), flip),
          uciToCoords(arrow.substring(3, 5), arrow.substring(0, 1), flip),
        ];
      })
    : [];

  const circleCoords = circles
    ? circles.split(splitter).map((circle) => {
        return uciToCoords(
          circle.substring(1, 3),
          circle.substring(0, 1),
          flip
        );
      })
    : [];

  if (moves) {
    const game = Game().setVariant(variant, fen);
    game.playSans(moves.split(splitter));

    fen = game.reportFen().split(" ")[0];
  }

  const deltaWidth = player ? size * 8 : 0;
  const canvas = createCanvas(size * 8 + deltaWidth, size * 8);
  const ctx = canvas.getContext("2d");

  if (player) {
    const playerImg = await loadImage(
      path.join(__dirname, "..", "players", `${playerPaths[player]}`)
    );

    ctx.drawImage(playerImg, size * 8, 0, size * 8, size * 8);
  }

  const bckgImage = await loadImage(path.join(__dirname, "backgrounds", bckg));

  ctx.drawImage(bckgImage, 0, 0, size * 8, size * 8);

  let rank = 0;

  for (const coords of arrowCoords) {
    const from = coords[0];
    const to = coords[1];

    ctx.beginPath();
    ctx.moveTo(from.file * size + size / 2, from.rank * size + size / 2);
    ctx.lineTo(to.file * size + size / 2, to.rank * size + size / 2);

    ctx.globalAlpha = 0.7;
    ctx.lineWidth = size / 4;

    const strokeStyle = strokeStyles[from.color];
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

  for (const coords of circleCoords) {
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = size / 8;

    const strokeStyle = strokeStyles[coords.color];
    ctx.strokeStyle = strokeStyle;

    ctx.beginPath();
    ctx.arc(
      coords.file * size + size / 2,
      coords.rank * size + size / 2,
      size / 2 - size / 16,
      0,
      2 * Math.PI
    );
    ctx.stroke();
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
}

module.exports = {
  board,
};

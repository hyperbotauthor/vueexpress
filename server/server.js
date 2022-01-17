const express = require("express");
const { resolve } = require("path");

const { PORT = 3000 } = process.env;
const publicPath = resolve(__dirname, "../appdist");
const staticConf = { etag: false };

const app = express();

app.use(function (req, res, next) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  return next();
});

app.use("/api", require("./api.js"));

app.use(express.static(publicPath, staticConf));

app.listen(PORT, () => console.log(`App running on port ${PORT}!`));

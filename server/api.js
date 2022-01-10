var express = require("express");
var router = express.Router();

let reqCnt = 0;

// middleware that increses reqCnt on every request
router.use(function timeLog(req, res, next) {
  console.log(`request ${reqCnt++}`);
  next();
});

// define the reqcnt api route
router.get("/reqcnt", function (req, res) {
  res.send(
    JSON.stringify({
      reqCnt,
    })
  );
});

module.exports = router;

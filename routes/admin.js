var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  console.log("admin() req: ", req.url, req.params, req.path);
  res.send('respond with a resource');
});

module.exports = router;

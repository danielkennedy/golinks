var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("index() req: ", req.url, req.params, req.path);
  res.render('index', { title: 'Express' });
});

module.exports = router;

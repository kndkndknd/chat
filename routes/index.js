var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('client', {title: 'client'});
});

router.get('/ctrl', function(req, res, next) {
  res.render('instruct', {
    title: 'ctrl',
    status: statusList
   });
});

module.exports = router;

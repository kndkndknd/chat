var express = require('express');
var router = express.Router();
let cli_no = 0;
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('client', {
    title: 'client',
    no: cli_no});
  cli_no = cli_no + 1;
});

router.get('/ctrl', function(req, res, next) {
  res.render('instruct', {
    title: 'ctrl',
    status: statusList,
    no: cli_no
   });
  cli_no = cli_no + 1;
});

module.exports = router;

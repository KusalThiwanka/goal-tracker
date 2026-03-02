const express = require('express');
const router = express.Router();
const { getCurrentWeek, updateCurrentWeek } = require('../controllers/weekController');
const { protect } = require('../middleware/auth');

router.route('/current')
    .get(protect, getCurrentWeek)
    .put(protect, updateCurrentWeek);

module.exports = router;

const express = require('express');
const router = express.Router();
const NoticeController = require('../controllers/noticeController');

router.get('/notices', NoticeController.getAll);
router.post('/notices', NoticeController.create);
router.delete('/notices/:id', NoticeController.delete);

module.exports = router;

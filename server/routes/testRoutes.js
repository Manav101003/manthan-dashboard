const express = require('express');
const router = express.Router();
const TestController = require('../controllers/testController');
const { testUpload } = require('../middlewares/uploadMiddleware');

router.get('/tests', TestController.getAll);
router.post('/tests', testUpload.single('testFile'), TestController.create);
router.put('/tests/:id', TestController.update);
router.get('/tests/:id/questions', TestController.getQuestions);
router.post('/tests/:id/questions', TestController.addQuestion);
router.delete('/tests/question/:qid', TestController.deleteQuestion);
router.get('/tests/:id/quiz', TestController.getQuiz);
router.post('/tests/:id/submit', TestController.submitQuiz);
router.get('/tests/:id/attempts', TestController.getAttempts);
router.delete('/tests/:id/attempts', TestController.deleteAttempts);
router.delete('/tests/:id', TestController.delete);

module.exports = router;

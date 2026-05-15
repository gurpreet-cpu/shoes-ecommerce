const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/auth');
const adminOnly       = require('../middleware/adminOnly');
const {
  askQuestion,
  getProductQuestions,
  answerQuestion,
  getPendingQuestions,
} = require('../controllers/questionController');

// Public: get answered questions for a product
router.get('/products/:productId', getProductQuestions);

// Authenticated: ask a question
router.post('/products/:productId', verifyToken, askQuestion);

// Admin: answer a question, list pending
router.put('/:questionId/answer', verifyToken, adminOnly, answerQuestion);
router.get('/pending',            verifyToken, adminOnly, getPendingQuestions);

module.exports = router;

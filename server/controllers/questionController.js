const Question = require('../models/Question');
const Product  = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const logger       = require('../services/logger');
const { sendNewQuestionAdminEmail, sendQuestionAnsweredEmail } = require('../services/emailService');

// ── POST /api/questions/products/:productId ───────────────────────────────────
const askQuestion = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || !question.trim()) throw new ApiError(400, 'question is required');
  if (question.length > 500) throw new ApiError(400, 'Question cannot exceed 500 characters');

  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) throw new ApiError(404, 'Product not found');

  const q = await Question.create({
    product: product._id,
    user:    req.user._id,
    question: question.trim(),
  });

  sendNewQuestionAdminEmail(product, question.trim(), req.user).catch((err) =>
    logger.error('New question admin email failed:', err)
  );

  res.status(201).json(new ApiResponse(201, { question: q }, 'Question submitted'));
});

// ── GET /api/questions/products/:productId ────────────────────────────────────
const getProductQuestions = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const filter = {
    product:     req.params.productId,
    isPublished: true,
    answer:      { $exists: true, $ne: null },
  };

  const [questions, totalCount] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name')
      .select('-__v'),
    Question.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    questions,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  }));
});

// ── PUT /api/questions/:questionId/answer (admin) ─────────────────────────────
const answerQuestion = asyncHandler(async (req, res) => {
  const { answer } = req.body;
  if (!answer || !answer.trim()) throw new ApiError(400, 'answer is required');

  const q = await Question.findById(req.params.questionId)
    .populate('user', 'name email')
    .populate('product', 'name slug');
  if (!q) throw new ApiError(404, 'Question not found');

  q.answer     = answer.trim();
  q.answeredBy = req.user._id;
  q.answeredAt = new Date();
  await q.save();

  sendQuestionAnsweredEmail(q.user, q.product, q.question, q.answer).catch((err) =>
    logger.error('Question answered email failed:', err)
  );

  res.json(new ApiResponse(200, { question: q }, 'Answer submitted'));
});

// ── GET /api/questions/pending (admin) ────────────────────────────────────────
const getPendingQuestions = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = { $or: [{ answer: { $exists: false } }, { answer: null }] };

  const [questions, totalCount] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .populate('product', 'name slug images'),
    Question.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    questions,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  }));
});

module.exports = { askQuestion, getProductQuestions, answerQuestion, getPendingQuestions };

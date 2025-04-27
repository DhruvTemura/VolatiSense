// backend/routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/modelController');

// GET /api/models/:ticker
router.get('/:ticker', ctrl.getModelStats);

// POST /api/models/generate-all
router.post('/generate-all', ctrl.generateAllModelStats);

module.exports = router;
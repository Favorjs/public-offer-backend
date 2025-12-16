// routes/admin_auth.js
const express = require('express');
const router = express.Router();
const { registerAdminUser, loginAdminUser } = require('../controllers/admin_auth');

// Admin auth routes
router.post('/register', registerAdminUser);
router.post('/login', loginAdminUser);

module.exports = router;
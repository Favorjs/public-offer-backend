// routes/public_offers.js
const express = require('express');
const router = express.Router();
const PublicOfferController = require('../controllers/public_offers');
const PDFGenerator = require('../utils/pdfGenerator');
const authMiddleware = require('../middleware/auth');

// Public offer routes
router.post('/applications', PublicOfferController.createPublicOffer);
router.get('/applications', authMiddleware, PublicOfferController.getAllPublicOffers);
router.get('/applications/:id', authMiddleware, PublicOfferController.getPublicOfferById);
router.get('/applications/:id/pdf', PublicOfferController.downloadApplicationPDF);
router.patch('/applications/:id/status', PublicOfferController.updatePublicOfferStatus);
router.get('/statistics', PublicOfferController.getStatistics);
router.get('/stockbrokers', PublicOfferController.getStockbrokers);
router.get('/applications/:id/download', PublicOfferController.downloadPDF);

module.exports = router;
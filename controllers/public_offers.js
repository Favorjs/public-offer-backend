// public_offers.js
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const { mailgunEmailService, generatePublicOfferPDF } = require('../utils/email_service');
const PDFGenerator = require('../utils/pdfGenerator');
const { uploadDataUrl, isDataUrl } = require('../utils/cloudinary');
const prisma = new PrismaClient();

// Helper: normalize BigInt fields to strings for JSON responses
const serializePublicOffer = (offer) => {
  if (!offer) return offer;
  return {
    ...offer,
    shares_applied: offer.shares_applied?.toString?.() ?? offer.shares_applied,
    amount_payable: offer.amount_payable?.toString?.() ?? offer.amount_payable,
  };
};

class PublicOfferController {
  
  // Create new public offer application
 createPublicOffer = async(req, res)=> {
    try {



      
      const {
        shares_applied,
        account_type,
        title,
        title_others,
        surname,
        first_name,
        other_names,
        address,
        city,
        state,
        country,
        phone,
        email,
        dob,
        next_of_kin,
        contact_person,
        chn,
        cscs_no,
        stockbrokers_id,
        name,
        designation,
        second_name,
        second_designation,
        rc_number,
        individual_signature,
        corporate_signature,
        joint_signature,
        payment_receipt,
        payment_receipt_filename,
        payment_receipt_mime,
        bank_name,
        bvn,
        account_number,
        branch,
        bank_city
      } = req.body;

      // Upload receipt/signature to Cloudinary (store URLs in DB)
      const uploadToken = randomUUID();
      let receiptUrl = null;
      let individualSignatureUrl = null;
      let corporateSignatureUrl = null;
      let jointSignatureUrl = null;

      if (payment_receipt) {
        if (!isDataUrl(payment_receipt)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid payment receipt format. Please upload a file again.',
          });
        }
        const uploaded = await uploadDataUrl(payment_receipt, {
          folder: 'public_offer/receipts',
          publicId: `receipt_${uploadToken}`,
          resourceType: 'auto',
        });
        receiptUrl = uploaded.secure_url;
      }

      if (individual_signature) {
        if (!isDataUrl(individual_signature)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid individual signature format. Please upload a file again.',
          });
        }
        const uploaded = await uploadDataUrl(individual_signature, {
          folder: 'public_offer/signatures',
          publicId: `signature_individual_${uploadToken}`,
          resourceType: 'image',
        });
        individualSignatureUrl = uploaded.secure_url;
      }

      if (corporate_signature) {
        if (!isDataUrl(corporate_signature)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid corporate signature format. Please upload a file again.',
          });
        }
        const uploaded = await uploadDataUrl(corporate_signature, {
          folder: 'public_offer/signatures',
          publicId: `signature_corporate_${uploadToken}`,
          resourceType: 'image',
        });
        corporateSignatureUrl = uploaded.secure_url;
      }

      if (joint_signature) {
        if (!isDataUrl(joint_signature)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid joint signature format. Please upload a file again.',
          });
        }
        const uploaded = await uploadDataUrl(joint_signature, {
          folder: 'public_offer/signatures',
          publicId: `signature_joint_${uploadToken}`,
          resourceType: 'image',
        });
        jointSignatureUrl = uploaded.secure_url;
      }

      
      // Calculate amount payable in naira (shares_applied * ₦9.50)
      const sharesCount = Number(shares_applied);
      if (!sharesCount || Number.isNaN(sharesCount)) {
        return res.status(400).json({ success: false, message: 'Invalid shares_applied value' });
      }
      const amountPayableNaira = sharesCount * 9.5;
      const amount_payable = BigInt(Math.round(amountPayableNaira)); // store in naira as integer

      // Create public offer application
      const publicOffer = await prisma.publicOffer.create({
        data: {
          shares_applied: BigInt(shares_applied),
          amount_payable,
          account_type,
          title,
          title_others,
          surname,
          first_name,
          other_names,
          address,
          city,
          state,
          country: country || 'Nigeria',
          phone,
          email,
          dob: new Date(dob),
          next_of_kin,
          contact_person,
          chn,
          cscs_no,
          stockbrokers_id: parseInt(stockbrokers_id),
          name: name || null,
          designation: designation || null,
          second_name: second_name || null,
          second_designation: second_designation || null,
          rc_number: rc_number || null,
          individual_signature: individualSignatureUrl || null,
          corporate_signature: corporateSignatureUrl || null,
          joint_signature: jointSignatureUrl || null,
          payment_receipt: receiptUrl || null,
          payment_receipt_filename: payment_receipt_filename || null,
          payment_receipt_mime: payment_receipt_mime || null,
          bank_name: bank_name || null,
          bvn: bvn || null,
          account_number: account_number || null,
          branch: branch || null,
          bank_city: bank_city || null,
          status: 'SUBMITTED'
        },
        include: {
          stockbroker: true
        }
      });

      // Generate PDF and upload to Cloudinary
      const pdfBuffer = await generatePublicOfferPDF(publicOffer);
      let pdfUrl = null;
      if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
        const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
        const uploadedPdf = await uploadDataUrl(dataUrl, {
          folder: 'public_offer/applications',
          publicId: `application_${publicOffer.id}`,
          resourceType: 'raw',
          format: 'pdf',
          uploadOptions: {
            use_filename: true,
            unique_filename: false,
            filename_override: `public-offer-application-${publicOffer.id}.pdf`,
          },
        });
        pdfUrl = uploadedPdf.secure_url;
      }

      // Send email notifications with PDF attached and link (fire-and-forget to avoid request timeouts)
      setImmediate(() => {
        this.sendEmailNotifications(publicOffer, { pdfBuffer, pdfUrl })
          .catch(err => console.error('❌ Email notification failed (non-blocking):', err));
      });

      res.status(201).json({
        success: true,
        message: 'Public offer application submitted successfully',
      data: {
    ...publicOffer,
    shares_applied: publicOffer.shares_applied.toString(),
    amount_payable: publicOffer.amount_payable.toString(),
    pdfUrl
  },
        pdfUrl: pdfUrl || `/api/public-offers/${publicOffer.id}/download`
      });

    } catch (error) {
      console.error('Error creating public offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
        error: error.message
      });
    }
  }


  // Get all public offers
 getAllPublicOffers = async(req, res)=> {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const skip = (page - 1) * limit;

      const where = status ? { status } : {};

      const publicOffers = await prisma.publicOffer.findMany({
        where,
        include: {
          stockbroker: true
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: {
          created_at: 'desc'
        }
      });

      const total = await prisma.publicOffer.count({ where });

      res.json({
        success: true,
        data: publicOffers.map(serializePublicOffer),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching public offers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
        error: error.message
      });
    }
  }


  // Get public offer by ID
 getPublicOfferById = async(req, res)=> {
    try {
      const { id } = req.params;

      const publicOffer = await prisma.publicOffer.findUnique({
        where: { id: parseInt(id) },
        include: {
          stockbroker: true
        }
      });

      if (!publicOffer) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      res.json({
        success: true,
        data: serializePublicOffer(publicOffer)
      });

    } catch (error) {
      console.error('Error fetching public offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application',
        error: error.message
      });
    }
  }

// Then update the downloadApplicationPDF method:
downloadApplicationPDF = async(req, res)=> {
    try {
      const { id } = req.params;
      const numericId = Number(id);
      if (!id || Number.isNaN(numericId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application ID'
        });
      }

      const publicOffer = await prisma.publicOffer.findUnique({
        where: { id: numericId },
        include: {
          stockbroker: true
        }
      });

      if (!publicOffer) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Generate filled PDF using PDFGenerator, not mailgunEmailService
      const pdfBuffer = await PDFGenerator.fillPDFForm(publicOffer);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="public-offer-application-${id}.pdf"`);
      
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF',
        error: error.message
      });
    }
  }

  // Add this new method to your PublicOfferController class
 downloadPDF = async(req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    if (!id || Number.isNaN(numericId)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID' });
    }
    const publicOffer = await prisma.publicOffer.findUnique({
      where: { id: numericId },
      include: {
        stockbroker: true  // Include related data if needed
      }
    });

    if (!publicOffer) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Generate the PDF using PDFGenerator
    const pdfBuffer = await PDFGenerator.fillPDFForm(publicOffer);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=public-offer-${id}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating PDF',
      error: error.message 
    });
  }
}

// Don't forget to add the route in your router:
// router.get('/:id/download', publicOffersController.downloadPDF);
  // Update public offer status
 updatePublicOfferStatus = async(req, res)=> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const publicOffer = await prisma.publicOffer.update({
        where: { id: parseInt(id) },
        data: { status },
        include: {
          stockbroker: true
        }
      });

      res.json({
        success: true,
        message: 'Application status updated successfully',
        data: publicOffer
      });

    } catch (error) {
      console.error('Error updating public offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application',
        error: error.message
      });
    }
  }

  // Send email notifications
 sendEmailNotifications = async(publicOffer, options = {})=> {
    try {
      const { pdfBuffer, pdfUrl } = options;
      const pdfAttachment = pdfBuffer
        ? [{
            filename: `public-offer-application-${publicOffer.id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        : [];

      // Send notification to admin with PDF
      await mailgunEmailService.sendPublicOfferSubmissionNotification(publicOffer, {
        attachments: pdfAttachment,
        pdfUrl
      });
      
      // Send confirmation to applicant with PDF
      await mailgunEmailService.sendApplicantConfirmation(publicOffer, {
        attachments: pdfAttachment,
        pdfUrl
      });

      console.log('✅ Email notifications sent successfully with PDF attachments');
    } catch (emailError) {
      console.error('❌ Failed to send email notifications:', emailError);
      // Don't throw error, just log it
    }
  }

  // Get application statistics
 getStatistics = async(req, res)=> {
    try {
      const total = await prisma.publicOffer.count();
      const pending = await prisma.publicOffer.count({ where: { status: 'PENDING' } });
      const submitted = await prisma.publicOffer.count({ where: { status: 'SUBMITTED' } });
      const approved = await prisma.publicOffer.count({ where: { status: 'APPROVED' } });
      const rejected = await prisma.publicOffer.count({ where: { status: 'REJECTED' } });

      const totalShares = await prisma.publicOffer.aggregate({
        _sum: {
          shares_applied: true
        }
      });

      const totalAmount = await prisma.publicOffer.aggregate({
        _sum: {
          amount_payable: true
        }
      });

      res.json({
        success: true,
        data: {
          total,
          pending,
          submitted,
          approved,
          rejected,
          totalShares: totalShares._sum.shares_applied || 0,
          totalAmount: totalAmount._sum.amount_payable || 0
        }
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  }


// controllers/public_offers.js - Add this method
getStockbrokers = async(req, res)=> {
  try {
    const stockbrokers = await prisma.stockbrokers.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: stockbrokers
    });

  } catch (error) {
    console.error('Error fetching stockbrokers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stockbrokers',
      error: error.message
    });
  }
}
}


module.exports = new PublicOfferController();
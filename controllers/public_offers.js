// public_offers.js
const { PrismaClient } = require('@prisma/client');
const { mailgunEmailService, generatePublicOfferPDF } = require('../utils/email_service');
const prisma = new PrismaClient();

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
        bank_name,
        bvn,
        account_number,
        branch,
        bank_city
      } = req.body;

      
      // Calculate amount payable (shares_applied * 9.50)
 const amount_payable = BigInt(shares_applied) * BigInt(950); // 9.50 = 950 kobo

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
          individual_signature: individual_signature || null,
          corporate_signature: corporate_signature || null,
          joint_signature: joint_signature || null,
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

      // Send email notifications with PDF
      await this.sendEmailNotifications(publicOffer);

      // Generate PDF for immediate download
    const pdfBuffer = await generatePublicOfferPDF(publicOffer);

      res.status(201).json({
        success: true,
        message: 'Public offer application submitted successfully',
      data: {
    ...publicOffer,
    shares_applied: publicOffer.shares_applied.toString(),
    amount_payable: publicOffer.amount_payable.toString()
  },
        // pdf: pdfBuffer.toString('base64') // Send PDF as base64 for frontend download
         pdfUrl: `/api/public-offers/${publicOffer.id}/download`
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
        data: publicOffers,
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
        data: publicOffer
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
    const publicOffer = await prisma.publicOffer.findUnique({
      where: { id: parseInt(id) },
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
 sendEmailNotifications = async(publicOffer)=> {
    try {
      // Send notification to admin with PDF
      await mailgunEmailService.sendPublicOfferSubmissionNotification(publicOffer);
      
      // Send confirmation to applicant with PDF
      await mailgunEmailService.sendApplicantConfirmation(publicOffer);

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
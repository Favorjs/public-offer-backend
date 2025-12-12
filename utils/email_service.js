const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const PDFGenerator = require('./pdfGenerator');

// Main Mailgun Email Service Class
class MailgunEmailService {
  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY;
    this.domain = process.env.MAILGUN_DOMAIN;
    this.fromEmail = process.env.MAILGUN_FROM_EMAIL;
    this.fromName = 'The Initiates PLC Public Offer';
    this.mailgun = new Mailgun(formData);
    this.client = null;
    
    this.initializeClient();
  }

  // Resolve internal notification recipients (admin + optional extra recipients)
  getAdminNotificationRecipients() {
    const recipients = [];

    if (process.env.ADMIN_EMAIL) recipients.push(process.env.ADMIN_EMAIL);

    // Optional: additional notification recipients (comma-separated)
    // Example: SUBMISSION_NOTIFY_EMAILS="ops@company.com,ceo@company.com"
    const extra = process.env.SUBMISSION_NOTIFY_EMAILS || process.env.ADMIN_EMAILS;
    if (extra) {
      extra
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((email) => recipients.push(email));
    }

    // De-duplicate
    return [...new Set(recipients)].join(',');
  }

  // Initialize Mailgun client
  initializeClient() {
    try {
      this.client = this.mailgun.client({
        username: 'api',
        key: this.apiKey,
      });
      console.log('✅ Mailgun client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Mailgun client:', error.message);
      throw error;
    }
  }

  // Send email via Mailgun API
  async sendEmail(to, subject, html, attachments = []) {
    try {
      if (!this.client) {
        this.initializeClient();
      }

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
      };

      // Add attachments if any
      if (attachments.length > 0) {
        emailData.attachment = attachments; 
      }

      const response = await this.client.messages.create(this.domain, emailData);
      
      console.log(`✅ Email sent via Mailgun API to ${to}`);
      return { 
        success: true, 
        messageId: response.id,
        response: response 
      };
    } catch (error) {
      console.error('❌ Mailgun API email failed:', error.message);
      
      // Log detailed error information for debugging
      if (error.details) {
        console.error('Mailgun error details:', error.details);
      }
      
      throw error;
    }
  }

  // Send public offer submission notification to admin
  async sendPublicOfferSubmissionNotification(applicationData) {

    
    const subject = 'New Public Offer Application Submission';
    const to = this.getAdminNotificationRecipients();

    if (!to) {
      console.warn('⚠️ No admin notification recipients configured. Set ADMIN_EMAIL and/or SUBMISSION_NOTIFY_EMAILS.');
      return { success: false, error: 'No admin notification recipients configured' };
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Public Offer Application</h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">Applicant Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 40%;">Account Type:</td>
              <td style="padding: 8px 0; text-transform: capitalize;">${applicationData.account_type.toLowerCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Name:</td>
              <td style="padding: 8px 0;">${applicationData.title} ${applicationData.surname} ${applicationData.first_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
              <td style="padding: 8px 0;">${applicationData.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Phone:</td>
              <td style="padding: 8px 0;">${applicationData.phone}</td>
            </tr>
            ${applicationData.account_type !== 'INDIVIDUAL' ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Company/Representative:</td>
              <td style="padding: 8px 0;">${applicationData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Designation:</td>
              <td style="padding: 8px 0;">${applicationData.designation}</td>
            </tr>
            ${applicationData.rc_number ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">RC Number:</td>
              <td style="padding: 8px 0;">${applicationData.rc_number}</td>
            </tr>
            ` : ''}
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">Investment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Shares Applied:</td>
              <td style="padding: 8px 0;">${applicationData.shares_applied.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Amount Payable:</td>
              <td style="padding: 8px 0;">₦${applicationData.amount_payable.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Stockbroker:</td>
              <td style="padding: 8px 0;">${applicationData.stockbroker.name} (${applicationData.stockbroker.code})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Payment Receipt:</td>
              <td style="padding: 8px 0;">
                ${applicationData.payment_receipt ? '✅ Uploaded' : '❌ Not uploaded'}
                ${applicationData.payment_receipt_filename ? ` (${applicationData.payment_receipt_filename})` : ''}
                ${applicationData.payment_receipt ? ` — <a href="${applicationData.payment_receipt}" target="_blank" rel="noreferrer">View</a>` : ''}
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">CSCS Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">CHN Number:</td>
              <td style="padding: 8px 0;">${applicationData.chn}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">CSCS Number:</td>
              <td style="padding: 8px 0;">${applicationData.cscs_no}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Signature Status</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin: 8px 0;">
              ${applicationData.account_type === 'INDIVIDUAL' ? 'Individual Signature:' : 
                applicationData.account_type === 'CORPORATE' ? 'Corporate Signature:' : 'Joint Signature:'}
              ${applicationData.individual_signature || applicationData.corporate_signature || applicationData.joint_signature ? 
                '✅ Provided' : '❌ Not provided'}
            </li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_URL || 'http://localhost:3000/admin'}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View in Admin Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          This is an automated notification from The Initiates PLC Public Offer System.
        </p>
      </div>
    `;

    try {
      const result = await this.sendEmail(to, subject, html);
      console.log('✅ Public offer submission notification sent to admin');
      return result;
    } catch (error) {
      console.error('❌ Failed to send public offer submission notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send confirmation to applicant
  async sendApplicantConfirmation(applicationData) {
    const subject = 'Your Public Offer Application Confirmation - The Initiates PLC';
    const to = applicationData.email;
    
    const accountTypeText = applicationData.account_type.toLowerCase();
    const signatureType = applicationData.account_type === 'INDIVIDUAL' ? 'individual' : 
                         applicationData.account_type === 'CORPORATE' ? 'corporate' : 'joint';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">The Initiates PLC</h1>
          <p style="color: #6b7280; font-size: 18px;">Public Offer Application Confirmation</p>
        </div>
        
        <p>Dear ${applicationData.title} ${applicationData.surname} ${applicationData.first_name},</p>
        
        <p>Thank you for submitting your application for The Initiates PLC Public Offer. Your application has been received and is being processed.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">Application Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 40%;">Application Reference:</td>
              <td style="padding: 8px 0;">TIP/PO/${applicationData.id.toString().padStart(6, '0')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Account Type:</td>
              <td style="padding: 8px 0; text-transform: capitalize;">${accountTypeText}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Shares Applied For:</td>
              <td style="padding: 8px 0;">${applicationData.shares_applied.toLocaleString()} shares</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Amount Payable:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #059669;">₦${applicationData.amount_payable.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Stockbroker:</td>
              <td style="padding: 8px 0;">${applicationData.stockbroker.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">CSCS Account:</td>
              <td style="padding: 8px 0;">${applicationData.cscs_no}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Submission Date:</td>
              <td style="padding: 8px 0;">${new Date(applicationData.created_at).toLocaleString('en-GB')}</td>
            </tr>
          </table>
        </div>
        
        ${applicationData.account_type !== 'INDIVIDUAL' ? `
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #166534; margin-top: 0;">${applicationData.account_type} Details</h4>
          <p><strong>Name:</strong> ${applicationData.name}</p>
          <p><strong>Designation:</strong> ${applicationData.designation}</p>
          ${applicationData.rc_number ? `<p><strong>RC Number:</strong> ${applicationData.rc_number}</p>` : ''}
          ${applicationData.second_name ? `<p><strong>Second Applicant:</strong> ${applicationData.second_name} (${applicationData.second_designation})</p>` : ''}
        </div>
        ` : ''}
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #92400e; margin-top: 0;">Next Steps</h4>
          <ol style="margin: 0; padding-left: 20px;">
            <li style="margin: 8px 0;">Your application is being reviewed</li>
            <li style="margin: 8px 0;">You will receive allotment details after the offer closing date (12 December 2025)</li>
            <li style="margin: 8px 0;">Allotted shares will be credited to your CSCS account</li>
            <li style="margin: 8px 0;">You will receive final confirmation via email</li>
          </ol>
        </div>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #374151; margin-top: 0;">Important Information</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin: 8px 0;">Offer Period: 5 November 2025 - 12 December 2025</li>
            <li style="margin: 8px 0;">Price per Share: ₦9.50</li>
            <li style="margin: 8px 0;">Minimum Application: 1,000 shares</li>
            <li style="margin: 8px 0;">Payment Terms: Payable in full on acceptance</li>
          </ul>
        </div>
        
        <p>If you have any questions about your application, please contact our support team:</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;">📧 ${process.env.SUPPORT_EMAIL || 'wms@initiatesgroup.com'}</p>
          <p style="margin: 5px 0;">📞 ${process.env.SUPPORT_PHONE || '+234 (0)2084-66 9510'}</p>
        </div>
        
        <p>Best regards,<br><strong>The Initiates PLC Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.<br>
          The Initiates PLC | Plot 400, Location Road Off Aba/PH Expressway | Port Harcourt, Rivers State
        </p>
      </div>
    `;

    try {
      const result = await this.sendEmail(to, subject, html);
      console.log('✅ Applicant confirmation email sent');
      return result;
    } catch (error) {
      console.error('❌ Failed to send applicant confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const domains = await this.client.domains.list();
      console.log('✅ Mailgun API connection established');
      return { 
        success: true, 
        message: 'Mailgun API connection established',
        domain: this.domain 
      };
    } catch (error) {
      console.error('❌ Mailgun API connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Initialize Mailgun Email Service
const mailgunEmailService = new MailgunEmailService();


async function generatePublicOfferPDF(publicOffer) {
  try {
    const pdfBuffer = await PDFGenerator.fillPDFForm(publicOffer);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF for email:', error);
    throw error;
  }
}

// Export the service instance
module.exports = {
  MailgunEmailService,
  mailgunEmailService,
  generatePublicOfferPDF
};
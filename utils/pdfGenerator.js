// utils/pdfGenerator.js
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

class PDFGenerator {
  static async fillPDFForm(publicOffer) {
    try {
      // Load the PDF template
      const templatePath = path.join(__dirname, 'templates', 'TIP_PUBLIC_OFFER.pdf');
      const templateBytes = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      // Helper function to set field if it exists
      const setFieldIfExists = (fieldName, value) => {
        try {
          const field = form.getField(fieldName);
          if (!field) return false;
          
          const text = String(value || '');
          if (field.constructor.name === 'PDFTextField') {
            field.setText(text);
          } else if (field.constructor.name === 'PDFCheckBox') {
            if (text && text.toLowerCase() === 'true') {
              field.check();
            } else {
              field.uncheck();
            }
          }
          return true;
        } catch (error) {
          return false;
        }
      };

      // Set title (radio buttons)
      ['MR', 'MRS', 'MISS', 'OTHERS'].forEach(title => {
        setFieldIfExists(title, publicOffer.title === title ? 'true' : 'false');
      });

      // Handle "Others" title
      if (publicOffer.title === 'OTHERS') {
        setFieldIfExists('OTHERS (PLEASE SPECIFY)', publicOffer.title_others || '');
      }

      // Personal Details
      setFieldIfExists('shareholder_name', publicOffer.name) || 
        setFieldIfExists('Name', publicOffer.name) ||
        setFieldIfExists('SURNAME', publicOffer.surname) ||
        setFieldIfExists('SURNAME / CORPORATE NAME', publicOffer.surname);

      setFieldIfExists('first_name', publicOffer.first_name) ||
        setFieldIfExists('FIRST NAME', publicOffer.first_name);

      setFieldIfExists('other_names', publicOffer.other_names) ||
        setFieldIfExists('OTHER NAMES', publicOffer.other_names);

      setFieldIfExists('address', publicOffer.address) ||
        setFieldIfExists('ADDRESS', publicOffer.address) ||
        setFieldIfExists('FULL POSTAL ADDRESS', publicOffer.address);

      setFieldIfExists('city', publicOffer.city) ||
        setFieldIfExists('CITY', publicOffer.city) ||
        setFieldIfExists('CITY/TOWN', publicOffer.city);

      setFieldIfExists('state', publicOffer.state) ||
        setFieldIfExists('STATE', publicOffer.state);

      setFieldIfExists('country', publicOffer.country || 'Nigeria') ||
        setFieldIfExists('COUNTRY', publicOffer.country || 'Nigeria');

      setFieldIfExists('phone', publicOffer.phone) ||
        setFieldIfExists('PHONE', publicOffer.phone) ||
        setFieldIfExists('PHONE NUMBER', publicOffer.phone);

      setFieldIfExists('email', publicOffer.email) ||
        setFieldIfExists('EMAIL', publicOffer.email) ||
        setFieldIfExists('E-MAIL', publicOffer.email);

      setFieldIfExists('dob', publicOffer.dob ? new Date(publicOffer.dob).toLocaleDateString() : '') ||
        setFieldIfExists('DATE OF BIRTH', publicOffer.dob ? new Date(publicOffer.dob).toLocaleDateString() : '');

      // Investment Details
      setFieldIfExists('shares_applied', publicOffer.shares_applied?.toString() || '0') ||
        setFieldIfExists('SHARES APPLIED', publicOffer.shares_applied?.toString() || '0') ||
        setFieldIfExists('NUMBER OF SHARES', publicOffer.shares_applied?.toString() || '0');

      setFieldIfExists('amount_payable', 
        publicOffer.amount_payable 
          ? (Number(publicOffer.amount_payable) / 100).toFixed(2)
          : '0.00'
      ) || setFieldIfExists('AMOUNT', 
        publicOffer.amount_payable 
          ? (Number(publicOffer.amount_payable) / 100).toFixed(2)
          : '0.00'
      );

      // Bank Details
      setFieldIfExists('bank_name', publicOffer.bank_name) ||
        setFieldIfExists('BANK NAME', publicOffer.bank_name);

      setFieldIfExists('account_number', publicOffer.account_number) ||
        setFieldIfExists('ACCOUNT NUMBER', publicOffer.account_number);

      setFieldIfExists('bvn', publicOffer.bvn) ||
        setFieldIfExists('BVN', publicOffer.bvn) ||
        setFieldIfExists('BANK VERIFICATION NUMBER', publicOffer.bvn);

      // Try to flatten the form (but don't fail if it doesn't work)
      try {
        form.flatten();
      } catch (error) {
        console.warn('Could not flatten form, saving without flattening:', error.message);
      }

      // Save the PDF to a buffer
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('Error in fillPDFForm:', error);
      throw error;
    }
  }
}

module.exports = PDFGenerator;
// utils/pdfGenerator.js
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class PDFGenerator {
  static async fillPDFForm(publicOffer) {
    try {
      // Load the PDF template
      const templatePath = path.join(__dirname, 'templates', 'TIP_PUBLIC_OFFER.pdf');
      const templateBytes = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      const today = new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy

      // Resolve image bytes from either data URL or remote URL (e.g., Cloudinary)
      const getImageBytes = async (source) => {
        if (!source) return null;
        // Data URL
        if (typeof source === 'string' && source.startsWith('data:')) {
          const base64 = source.split(',')[1];
          if (!base64) return null;
          return Uint8Array.from(Buffer.from(base64, 'base64'));
        }
        // Remote URL (http/https)
        if (typeof source === 'string' && source.startsWith('http')) {
          const resp = await axios.get(source, { responseType: 'arraybuffer' });
          return new Uint8Array(resp.data);
        }
        return null;
      };

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

      // Helper to embed a signature image into the field area (if the field exists)
      const embedSignatureImage = async (fieldNames, source) => {
        const bytes = await getImageBytes(source);
        if (!bytes) return false;

        const field = fieldNames
          .map((name) => {
            try { return form.getField(name); } catch (_) { return null; }
          })
          .find(Boolean);

        if (!field || !field.acroField) return false;

        const widgets = field.acroField.getWidgets?.() || [];
        const widget = widgets[0];
        if (!widget) return false;

        const targetPageRef = widget.getP?.();
        const targetPage = pdfDoc.getPages().find((p) => p.ref === targetPageRef) || pdfDoc.getPages()[0];
        const rect = widget.getRectangle?.();
        if (!rect) return false;

        // pdf-lib returns { x, y, width, height }
        const { x, y, width, height } = rect;

        const isPng =
          typeof source === 'string' &&
          source.toLowerCase().includes('png');

        const image = isPng
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);

        targetPage.drawImage(image, {
          x,
          y,
          width,
          height,
        });

        // Clear text so it doesn't overlay the image
        try {
          field.setText('');
        } catch (_) {}

        return true;
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

      setFieldIfExists('next_of_kin', publicOffer.next_of_kin) ||
        setFieldIfExists('NEXT OF KIN', publicOffer.next_of_kin) ||
        setFieldIfExists('NEXTOFKIN', publicOffer.next_of_kin)

      setFieldIfExists('chn', publicOffer.chn) ||
        setFieldIfExists('CHN', publicOffer.chn) ||
        setFieldIfExists('CHN NUMBER', publicOffer.chn)

      setFieldIfExists('cscs_no', publicOffer.cscs_no) ||
        setFieldIfExists('CSCS NO', publicOffer.cscs_no) ||
        setFieldIfExists('CSCS NUMBER', publicOffer.cscs_no) ||
        setFieldIfExists('CSCSNO', publicOffer.cscs_no)

      setFieldIfExists('stockbroker', publicOffer.stockbroker) ||
        setFieldIfExists('STOCKBROKER', publicOffer.stockbroker) ||
        setFieldIfExists('STOCKBROKER NAME', publicOffer.stockbroker)


      setFieldIfExists('stockbrokers_id', publicOffer.stockbrokers_id) ||
        setFieldIfExists('STOCKBROKERS ID', publicOffer.stockbrokers_id) ||
        setFieldIfExists('STOCKBROKERSID', publicOffer.stockbrokers_id)

      // Stockbroker name/code (use related model when available)
      const stockbrokerName = publicOffer.stockbroker?.name || ''
      const stockbrokerCode = publicOffer.stockbroker?.code || publicOffer.stockbrokers_code || ''

      setFieldIfExists('stockbroker_name', stockbrokerName) ||
        setFieldIfExists('STOCKBROKER NAME', stockbrokerName) ||
        setFieldIfExists('STOCKBROKER', stockbrokerName)

      setFieldIfExists('stockbroker_code', stockbrokerCode) ||
        setFieldIfExists('STOCKBROKER CODE', stockbrokerCode) ||
        setFieldIfExists('BROKER CODE', stockbrokerCode) ||
        setFieldIfExists('BROKER', stockbrokerCode)



      setFieldIfExists('dob', publicOffer.dob ? new Date(publicOffer.dob).toLocaleDateString() : '') ||
        setFieldIfExists('DATE OF BIRTH', publicOffer.dob ? new Date(publicOffer.dob).toLocaleDateString() : '');


      setFieldIfExists('DATE', today) ||
        setFieldIfExists('Date', today) ||
        setFieldIfExists('APPLICATION DATE', today) ||
        setFieldIfExists('Application Date', today);

      // Investment Details
      setFieldIfExists('shares_applied', publicOffer.shares_applied?.toString() || '0') ||
        setFieldIfExists('SHARES APPLIED', publicOffer.shares_applied?.toString() || '0') ||
        setFieldIfExists('NUMBER OF SHARES', publicOffer.shares_applied?.toString() || '0');

      setFieldIfExists('amount_payable',
        publicOffer.amount_payable
          ? Number(publicOffer.amount_payable).toFixed(2)
          : '0.00'
      ) || setFieldIfExists('AMOUNT',
        publicOffer.amount_payable
          ? Number(publicOffer.amount_payable).toFixed(2)
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

      setFieldIfExists('branch', publicOffer.branch) ||
        setFieldIfExists('BRANCH', publicOffer.branch) ||
        setFieldIfExists('BRANCH NAME', publicOffer.branch);

      setFieldIfExists('bank_city', publicOffer.bank_city) ||
        setFieldIfExists('BANK CITY', publicOffer.bank_city) ||
        setFieldIfExists('BANK CITY NAME', publicOffer.bank_city);

      setFieldIfExists('stockbrokers_code', publicOffer.stockbrokers_code) ||
        setFieldIfExists('STOCKBROKERS CODE', publicOffer.stockbrokers_code) ||
        setFieldIfExists('STOCKBROKERS CODE NAME', publicOffer.stockbrokers_code)

      // Declarations checkboxes (set to true by default on PDF generation)
      setFieldIfExists('dec_a', 'true') ||
        setFieldIfExists('DEC_A', 'true');
      setFieldIfExists('dec_b', 'true') ||
        setFieldIfExists('DEC_B', 'true');
      setFieldIfExists('dec_c', 'true') ||
        setFieldIfExists('DEC_C', 'true');
      setFieldIfExists('dec_d', 'true') ||
        setFieldIfExists('DEC_D', 'true');
      setFieldIfExists('dec_e', 'true') ||
        setFieldIfExists('DEC_E', 'true');
      setFieldIfExists('dec_f', 'true') ||
        setFieldIfExists('DEC_F', 'true');

      // Embedded signature images (if present)
      await embedSignatureImage(
        ['individual_signature', 'INDIVIDUAL SIGNATURE', 'INDIVIDUAL SIGNATURE IMAGE'],
        publicOffer.individual_signature
      );

      await embedSignatureImage(
        ['corporate_signature', 'CORPORATE SIGNATURE', 'CORPORATE SIGNATURE IMAGE'],
        publicOffer.corporate_signature
      );

      await embedSignatureImage(
        ['joint_signature', 'JOINT SIGNATURE', 'JOINT SIGNATURE IMAGE'],
        publicOffer.joint_signature
      );

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
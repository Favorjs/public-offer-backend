const cloudinary = require('cloudinary').v2;

let configured = false;

function configureCloudinary() {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

async function uploadDataUrl(
  dataUrl,
  { folder, publicId, resourceType = 'auto', format, uploadOptions = {} } = {}
) {
  configureCloudinary();

  if (!isDataUrl(dataUrl)) {
    throw new Error('Expected a data URL (base64) for Cloudinary upload.');
  }

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: folder || 'public_offer',
    public_id: publicId,
    resource_type: resourceType,
    format,
    ...uploadOptions,
  });

  return result; // includes secure_url, public_id, etc.
}

module.exports = {
  uploadDataUrl,
  isDataUrl,
};



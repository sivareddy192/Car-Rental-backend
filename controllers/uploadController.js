import { createHash } from 'crypto';

export const getCloudinaryUploadSignature = (req, res) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Image uploads are not configured. Add the Cloudinary credentials to the backend environment.',
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'royaldrives';
  const signedParameters = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash('sha1')
    .update(`${signedParameters}${CLOUDINARY_API_SECRET}`)
    .digest('hex');

  return res.status(200).json({
    success: true,
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  });
};

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { bucketName, json, s3Client } = require('./shared');

function buildObjectKey(extension) {
  const safeExt = (extension || 'jpg').replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 10);
  return `entries/${yyyy}/${mm}/${Date.now()}-${random}.${safeExt}`;
}

exports.handler = async (event) => {
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return json(400, { message: 'Invalid JSON body.' });
    }
  }

  const contentType = typeof body.contentType === 'string' ? body.contentType : 'image/jpeg';
  const extension = typeof body.extension === 'string' ? body.extension : 'jpg';
  const key = buildObjectKey(extension);

  try {
    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }
    );

    return json(200, { key, uploadUrl });
  } catch (error) {
    return json(500, { message: 'Failed to presign upload URL.', detail: String(error) });
  }
};

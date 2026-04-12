const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { bucketName, json, s3Client } = require('./shared');

exports.handler = async (event) => {
  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (!key) {
    return json(400, { message: 'key query parameter is required.' });
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };
  } catch (error) {
    return json(500, { message: 'Failed to delete uploaded image.', detail: String(error) });
  }
};

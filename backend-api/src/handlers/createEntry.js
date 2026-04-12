const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoClient, generateId, json, parseBody, tableName } = require('./shared');

exports.handler = async (event) => {
  const body = parseBody(event);
  if (body == null) {
    return json(400, { message: 'Invalid JSON body.' });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return json(400, { message: 'name is required.' });
  }

  const now = new Date().toISOString();
  const nowEpoch = Math.floor(Date.now() / 1000);
  const displayUntilEpoch = nowEpoch + 24 * 60 * 60;
  const ttlEpoch = nowEpoch + 7 * 24 * 60 * 60;

  const item = {
    id: generateId(),
    name,
    description: typeof body.description === 'string' ? body.description : undefined,
    image: typeof body.image === 'string' ? body.image : undefined,
    latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
    longitude: typeof body.longitude === 'number' ? body.longitude : undefined,
    createdAt: now,
    updatedAt: now,
    createdAtEpoch: nowEpoch,
    displayUntilEpoch,
    ttlEpoch,
  };

  try {
    await dynamoClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      })
    );

    return json(201, item);
  } catch (error) {
    return json(500, { message: 'Failed to create entry.', detail: String(error) });
  }
};

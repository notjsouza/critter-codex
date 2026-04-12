const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const { dynamoClient, json, parseBody } = require('./shared');
const { normalizeEmail } = require('./authShared');

const usersTableName = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  const body = parseBody(event);
  if (body == null) {
    return json(400, { message: 'Invalid JSON body.' });
  }

  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  if (!email || !code) {
    return json(400, { message: 'email and code are required.' });
  }

  try {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: usersTableName,
        Key: { email },
      })
    );

    const user = result.Item;
    if (!user) {
      return json(404, { message: 'User not found.' });
    }

    if (user.confirmationCode !== code) {
      return json(400, { message: 'Invalid confirmation code.' });
    }

    if (Number(user.confirmationExpiresAt || 0) < Date.now()) {
      return json(400, { message: 'Confirmation code expired.' });
    }

    const now = new Date().toISOString();
    await dynamoClient.send(
      new PutCommand({
        TableName: usersTableName,
        Item: {
          ...user,
          confirmed: true,
          confirmationCode: null,
          confirmationExpiresAt: null,
          updatedAt: now,
        },
      })
    );

    return json(200, { ok: true });
  } catch (error) {
    return json(500, { message: 'Failed to confirm sign-up.', detail: String(error) });
  }
};
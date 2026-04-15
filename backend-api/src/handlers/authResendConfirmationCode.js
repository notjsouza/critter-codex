const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const { dynamoClient, json, parseBody } = require('./shared');
const { generateConfirmationCode, normalizeEmail } = require('./authShared');

const usersTableName = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  const body = parseBody(event);
  if (body == null) {
    return json(400, { message: 'Invalid JSON body.' });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return json(400, { message: 'email is required.' });
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

    const code = generateConfirmationCode();
    const now = new Date().toISOString();

    await dynamoClient.send(
      new PutCommand({
        TableName: usersTableName,
        Item: {
          ...user,
          confirmationCode: code,
          confirmationExpiresAt: Date.now() + 15 * 60 * 1000,
          updatedAt: now,
        },
      })
    );

    return json(200, { ok: true });
  } catch (error) {
    return json(500, { message: 'Failed to resend confirmation code.', detail: String(error) });
  }
};
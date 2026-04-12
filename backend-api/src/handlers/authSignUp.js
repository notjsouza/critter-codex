const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const { dynamoClient, json, parseBody } = require('./shared');
const {
  createSalt,
  generateConfirmationCode,
  hashPassword,
  normalizeEmail,
} = require('./authShared');

const usersTableName = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  const body = parseBody(event);
  if (body == null) {
    return json(400, { message: 'Invalid JSON body.' });
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!email || !password) {
    return json(400, { message: 'email and password are required.' });
  }

  if (password.length < 8) {
    return json(400, { message: 'password must be at least 8 characters.' });
  }

  try {
    const existing = await dynamoClient.send(
      new GetCommand({
        TableName: usersTableName,
        Key: { email },
      })
    );

    const now = new Date().toISOString();
    const code = generateConfirmationCode();
    const confirmationExpiresAt = Date.now() + 15 * 60 * 1000;

    if (existing.Item) {
      if (existing.Item.provider === 'google') {
        return json(409, {
          message: 'This email is already linked to Google SSO. Use Hosted Sign-In.',
        });
      }

      const salt = createSalt();
      await dynamoClient.send(
        new PutCommand({
          TableName: usersTableName,
          Item: {
            ...existing.Item,
            email,
            passwordSalt: salt,
            passwordHash: hashPassword(password, salt),
            confirmed: false,
            confirmationCode: code,
            confirmationExpiresAt,
            updatedAt: now,
          },
        })
      );

      return json(200, {
        nextStep: 'CONFIRM_SIGN_UP',
      });
    }

    const salt = createSalt();
    await dynamoClient.send(
      new PutCommand({
        TableName: usersTableName,
        Item: {
          email,
          provider: 'email',
          passwordSalt: salt,
          passwordHash: hashPassword(password, salt),
          confirmed: false,
          confirmationCode: code,
          confirmationExpiresAt,
          createdAt: now,
          updatedAt: now,
        },
      })
    );

    return json(200, {
      nextStep: 'CONFIRM_SIGN_UP',
    });
  } catch (error) {
    return json(500, { message: 'Failed to sign up user.', detail: String(error) });
  }
};
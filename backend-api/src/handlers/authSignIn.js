const { GetCommand } = require('@aws-sdk/lib-dynamodb');

const { dynamoClient, json, parseBody } = require('./shared');
const { createSessionToken, normalizeEmail, verifyPassword } = require('./authShared');

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

  try {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: usersTableName,
        Key: { email },
      })
    );

    const user = result.Item;
    if (!user) {
      return json(401, { message: 'Invalid credentials.' });
    }

    if (user.provider === 'google') {
      return json(409, { message: 'Use Google SSO for this account.' });
    }

    if (!user.confirmed) {
      return json(409, { message: 'User not confirmed.', nextStep: 'CONFIRM_SIGN_UP' });
    }

    const isValid = verifyPassword(password, String(user.passwordSalt || ''), String(user.passwordHash || ''));
    if (!isValid) {
      return json(401, { message: 'Invalid credentials.' });
    }

    const token = createSessionToken(email, 'email');
    return json(200, { token });
  } catch (error) {
    return json(500, { message: 'Failed to sign in user.', detail: String(error) });
  }
};
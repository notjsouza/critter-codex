const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const { dynamoClient } = require('./shared');
const {
  createSessionToken,
  exchangeGoogleCode,
  getAppAuthRedirectUrl,
  normalizeEmail,
  parseGoogleIdToken,
  verifyOAuthState,
} = require('./authShared');

const usersTableName = process.env.USERS_TABLE_NAME;

function redirect(location) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      'Access-Control-Allow-Origin': '*',
    },
    body: '',
  };
}

function redirectWithError(message) {
  const target = `${process.env.APP_AUTH_REDIRECT_URI || 'crittercodex://auth'}?error=${encodeURIComponent(message)}`;
  return redirect(target);
}

exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  const code = query.code;
  const state = query.state;
  const provider = String(query.provider || 'google').toLowerCase();

  if (provider !== 'google') {
    return redirectWithError('Unsupported OAuth provider.');
  }

  if (!code || !state) {
    return redirectWithError('Missing OAuth code or state.');
  }

  if (!verifyOAuthState(state)) {
    return redirectWithError('Invalid or expired OAuth state.');
  }

  try {
    const tokenResponse = await exchangeGoogleCode(code);
    const claims = parseGoogleIdToken(tokenResponse.id_token);

    if (!claims || !claims.email) {
      return redirectWithError('Google profile did not include an email.');
    }

    const email = normalizeEmail(claims.email);
    const now = new Date().toISOString();

    const existing = await dynamoClient.send(
      new GetCommand({
        TableName: usersTableName,
        Key: { email },
      })
    );

    await dynamoClient.send(
      new PutCommand({
        TableName: usersTableName,
        Item: {
          ...(existing.Item || {}),
          email,
          provider: 'google',
          providerSubject: String(claims.sub || ''),
          confirmed: true,
          createdAt: existing.Item?.createdAt || now,
          updatedAt: now,
        },
      })
    );

    const token = createSessionToken(email, 'google');
    return redirect(getAppAuthRedirectUrl(token, email));
  } catch (error) {
    return redirectWithError(`OAuth callback failed: ${String(error)}`);
  }
};
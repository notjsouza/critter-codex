const { json } = require('./shared');
const { getGoogleAuthorizationUrl } = require('./authShared');

exports.handler = async (event) => {
  let provider = 'google';
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      if (typeof body.provider === 'string') {
        provider = body.provider.toLowerCase();
      }
    } catch {
      // ignore malformed optional body
    }
  }

  if (provider !== 'google') {
    return json(400, { message: `Unsupported hosted sign-in provider: ${provider}` });
  }

  const url = getGoogleAuthorizationUrl();
  if (!url) {
    return json(501, {
      message: 'Google OAuth is not configured. Set GOOGLE_OAUTH_* environment variables.',
    });
  }

  return json(200, { url });
};
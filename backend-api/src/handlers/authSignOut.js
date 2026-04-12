const { json } = require('./shared');

exports.handler = async () => {
  return json(200, { ok: true });
};
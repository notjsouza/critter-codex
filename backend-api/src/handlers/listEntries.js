const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoClient, json, tableName } = require('./shared');

function isHistoryQuery(query = {}) {
  const includeHistory = String(query.includeHistory || '').toLowerCase();
  const window = String(query.window || '').toLowerCase();
  return includeHistory === 'true' || window === 'history' || window === '7d';
}

function toEpochSeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

exports.handler = async (event) => {
  try {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: tableName,
      })
    );

    const query = event.queryStringParameters || {};
    const includeHistory = isHistoryQuery(query);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const historyCutoffEpoch = nowEpoch - 7 * 24 * 60 * 60;

    const items = (result.Items || [])
      .filter((item) => item && item.id && item.name)
      .filter((item) => {
        const displayUntilEpoch = toEpochSeconds(item.displayUntilEpoch);
        const createdAtEpoch = toEpochSeconds(item.createdAtEpoch);

        if (includeHistory) {
          if (createdAtEpoch == null) {
            return false;
          }

          return createdAtEpoch >= historyCutoffEpoch;
        }

        if (displayUntilEpoch != null) {
          return displayUntilEpoch >= nowEpoch;
        }

        if (createdAtEpoch != null) {
          return createdAtEpoch >= nowEpoch - 24 * 60 * 60;
        }

        return false;
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    return json(200, items);
  } catch (error) {
    return json(500, { message: 'Failed to list entries.', detail: String(error) });
  }
};

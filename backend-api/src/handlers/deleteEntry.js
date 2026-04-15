const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoClient, json, tableName } = require('./shared');

exports.handler = async (event) => {
  const id = event.pathParameters && event.pathParameters.id;
  if (!id) {
    return json(400, { message: 'id path parameter is required.' });
  }

  try {
    await dynamoClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { id },
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
    return json(500, { message: 'Failed to delete entry.', detail: String(error) });
  }
};

const aws = require("aws-sdk");

let dynamodb;
if (process.env.IS_OFFLINE) {
  dynamodb = new aws.DynamoDB.DocumentClient({
    region: "localhost",
    endpoint: "http://localhost:8010",
    accessKeyId: "DEFAULTACCESSKEY",
    secretAccessKey: "DEFAULTSECRET",
  });
} else {
  dynamodb = new aws.DynamoDB.DocumentClient();
}

const getByDateRange = async (event) => {
  try {
    const { country, start, end } = event.queryStringParameters || {};

    if (!country || !start || !end) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Enviar country, start y end como parámetros en la URL",
        }),
      };
    }

    const params = {
      TableName: "ts_id_generated",
      IndexName: "dateCreatedIndex", // asegúrate que este GSI existe
      KeyConditionExpression:
        "country = :country AND date_created BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":country": country,
        ":start": start,
        ":end": end,
      },
    };

    const result = await dynamodb.query(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        count: result.Count,
        items: result.Items,
      }),
    };
  } catch (error) {
    console.error("Error en getByDateRange:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error interno al consultar por rango de fechas",
        error: error.message,
      }),
    };
  }
};

module.exports = {
  getByDateRange,
};

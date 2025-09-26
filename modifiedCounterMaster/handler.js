const aws = require("aws-sdk")
const { randomUUID } = require("crypto")

if (process.env.IS_OFFLINE) {
  dynamodb = new aws.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8010',
    accessKeyId: 'DEFAUTLACESSKEY',
    secretAccessKey: 'DEFAULTSECRET',
  });
} else {
  dynamodb = new aws.DynamoDB.DocumentClient();
}


const modifiedCounterMaster = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    const { uuid, id_master_unit } = body;

    if (!uuid || !id_master_unit) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "uuid e id_master_unit son requeridos",
        }),
      };
    }

    let currentNumber = parseInt(id_master_unit.replace(/[^\d]/g, "")) || 0;
    let prefix = id_master_unit[0] || "T"; // Para mantener el prefijo dinámico
    let newNumber = currentNumber + 1;
    let newLote = prefix + String(newNumber).padStart(id_master_unit.length - 1, "0");

  
    const paramsUpdate = {
      TableName: "ts_id_master_counter",
      Key: { uuid },
      UpdateExpression: "SET id_master_unit = :newLote",
      ExpressionAttributeValues: {
        ":newLote": newLote,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamodb.update(paramsUpdate).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Lote actualizado",
        updatedItem: result.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error al actualizar id_master_unit:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error interno al actualizar id_master_unit",
        error: error.message,
      }),
    };
  }
};

module.exports = {
  modifiedCounterMaster,
};
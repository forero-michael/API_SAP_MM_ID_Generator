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

const modifiedCounterMaster = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    const { uuid, startLote } = body || {};

    if (!uuid) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "uuid es requerido",
        }),
      };
    }

    const paramsGet = {
      TableName: "ts_id_master_counter",
      Key: { uuid },
    };

    const currentItem = await dynamodb.get(paramsGet).promise();

    let currentLote;


    if (!currentItem.Item) {
      if (!startLote) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "El registro no existe. Envía 'startLote' para inicializarlo.",
          }),
        };
      }

      currentLote = startLote;
    } else {
      currentLote = currentItem.Item.id_master_unit;
    }


    const currentNumber = parseInt(currentLote.replace(/[^\d]/g, "")) || 0;
    const prefix = currentLote[0] || "T";
    const newNumber = currentNumber + 1;
    const newLote = prefix + String(newNumber).padStart(currentLote.length - 1, "0");


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
        message: "Lote actualizado correctamente",
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

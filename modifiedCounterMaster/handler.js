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
        body: JSON.stringify({ message: "uuid es requerido" }),
      };
    }

    // Buscar el registro actual
    const paramsGet = {
      TableName: "ts_id_master_counter",
      Key: { uuid },
    };

    const currentItem = await dynamodb.get(paramsGet).promise();

    // Determinar el lote actual
    // let currentLote = currentItem?.Item?.Id_master_unit || startLote;
    let currentLote = startLote
    // Validar que al menos exista un valor inicial
    if (!currentLote) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "El registro no existe y no se proporcionó 'startLote' para inicializarlo.",
        }),
      };
    }

    // Asegurar que currentLote es un string
    currentLote = String(currentLote);

    // Extraer número y prefijo
    const currentNumber = parseInt(currentLote.replace(/[^\d]/g, "")) || 0;
    const prefix = currentLote[0] || "T";
    const newNumber = currentNumber + 1;
    // const newLote = prefix + String(newNumber).padStart(currentLote.length - 1, "0");
    const newLote = currentLote;

    // Guardar nuevo valor
    const paramsUpdate = {
      TableName: "ts_id_master_counter",
      Key: { uuid },
      UpdateExpression: "SET Id_master_unit = :newLote",
      ExpressionAttributeValues: { ":newLote": newLote },
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
    console.error("Error al actualizar Id_master_unit:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error interno al actualizar Id_master_unit",
        error: error.message,
      }),
    };
  }
};

module.exports = { modifiedCounterMaster };

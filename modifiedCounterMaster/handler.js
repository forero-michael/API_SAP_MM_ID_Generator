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
    const body = JSON.parse(event.body)
    const { uuid } = body

    if (!uuid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "uuid es requerido para actualizar el lote" }),
      }
    }

    // Valor actual del lote
    const paramsGet = {
      TableName: "ts_id_master_counter",
      Key: { uuid }
    }

    const currentItem = await dynamodb.get(paramsGet).promise();

    if (!currentItem.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No se encontró el registro con ese uuid" }),
      }
    }

    let currentLote = currentItem.Item.id_master_unit || "T00000000";

    // Extraer número, incrementar y formatear
    let currentNumber = parseInt(currentLote.replace("T", "")) || 0;
    let newNumber = currentNumber + 1;
    let newLote = "T" + String(newNumber).padStart(8, "0");

    // Actualizar registro
    const paramsUpdate = {
      TableName: "ts_id_master_counter",
      Key: { uuid },
      UpdateExpression: "SET id_master_unit = :newLote",
      ExpressionAttributeValues: {
        ":newLote": newLote
      },
      ReturnValues: "ALL_NEW"
    }

    const result = await dynamodb.update(paramsUpdate).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        updatedItem: result.Attributes
      }),
    }
  } catch (error) {
    console.error("Error al actualizar lote:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error interno al actualizar lote", error: error.message }),
    }
  }
}

module.exports = {
  modifiedCounterMaster
}
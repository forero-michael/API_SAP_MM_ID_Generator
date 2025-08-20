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
        body: JSON.stringify({ message: "uuid es requerido para actualizar el contador maestro" }),
      }
    }

    // Incrementar automáticamente el campo "id_master_unit" (contador maestro)
    const paramsUpdate = {
      TableName: "ts_id_master_counter",
      Key: { uuid },
      UpdateExpression: "SET id_master_unit = if_not_exists(id_master_unit, :start) + :inc",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":start": 0
      },
      ReturnValues: "ALL_NEW"
    }

    const result = await dynamodb.update(paramsUpdate).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Contador maestro actualizado correctamente",
        updatedItem: result.Attributes
      }),
    }
  } catch (error) {
    console.error("Error al actualizar contador maestro:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error interno al actualizar contador maestro", error: error.message }),
    }
  }
}

module.exports = {
  modifiedCounterMaster
}
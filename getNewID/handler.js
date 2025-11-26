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

const getNewID = async (event, context) => {

  try {

    const statusCounter = "primary";

    var paramsQueryActualMasterID = {
      TableName: "ts_id_master_counter",
      FilterExpression: '#priority = :p',
      ExpressionAttributeNames: {
        '#priority': 'priority'
      },
      ExpressionAttributeValues: {
        ':p': statusCounter,
      },
    };

    const jsonActualMasterId = await dynamodb.scan(paramsQueryActualMasterID).promise();
    const objectMasterId = jsonActualMasterId.Items[0]
    const masterId = objectMasterId.Id_master_unit

    const numberMasterID = parseInt(masterId.slice(1))

    // Construcción del JSON para envío a Testa

    const { country, machine, quantity: quantityParam } = event.queryStringParameters || {};

    // Lectura del parámetro quantity
    const quantity = quantityParam ? parseInt(quantityParam) : 1;

    if (isNaN(quantity) || quantity < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "El parámetro 'quantity' debe ser un número entero mayor o igual a 1"
        })
      }
    }

    if (!country || !machine) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Los parámetros 'country' y 'machine' son obligatorios."
        })
      };
    }

    const fechaActual = new Date();
    const offset = fechaActual.getTimezoneOffset() * 60000
    const fechaLocal = new Date(fechaActual.getTime() - offset);
    const idLength = masterId.slice(1).length

    let generatedIDs = []

    //Genera IDs cuando quantity > 1
    for (let i = 1; i <= quantity; i++) {

      const newIdNumber = numberMasterID + i
      const formatted = String(newIdNumber).padStart(idLength, '0')
      const fullID = `T${formatted}`

      const newItem = {
        uuid: randomUUID(),
        country: country,
        machine: machine,
        id_generated: fullID,
        date_created: fechaLocal.toISOString(),
      }

      await dynamodb.put({
        TableName: "ts_id_generated",
        Item: newItem
      }).promise()

      generatedIDs.push(newItem)
    }

    //Actualiza el master ID con el último número generado
    const newMasterIDFinalNumber = numberMasterID + quantity
    const newMasterIDFormatted = String(newMasterIDFinalNumber).padStart(idLength, '0')
    const newMasterIDWithT = `T${newMasterIDFormatted}`

    const priority = "primary"

    var paramsQueryIdMasterPrimary = {
      TableName: "ts_id_master_counter",
      IndexName: 'PriorityIndex',
      KeyConditionExpression: 'priority = :p',
      ExpressionAttributeValues: {
        ':p': priority,
      },
    }

    const queryResultIDMasterPrimary = await dynamodb.query(paramsQueryIdMasterPrimary).promise();
    const itemToUpdate = queryResultIDMasterPrimary.Items[0];
    const uuidToUpdate = itemToUpdate.uuid;

    const updateParams = {
      TableName: "ts_id_master_counter",
      Key: { uuid: uuidToUpdate },
      UpdateExpression: 'set Id_master_unit = :val',
      ExpressionAttributeValues: { ':val': newMasterIDWithT },
      ReturnValues: 'ALL_NEW',
    };

    await dynamodb.update(updateParams).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        total_generated: quantity,
        generated: generatedIDs,
        new_master_value: newMasterIDWithT
      }),
    };

  } catch (error) {
    console.error('Error al generar y almacenar datos:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interno del servidor.' }),
    };
  }

}

module.exports = {
  getNewID
}
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
    // Consulta del ID actula que esta en la tabla ts_id_master_counter
    try {
        const statusCounter = "primary"
        var paramsQueryActualMasterID = {
                    TableName: "ts_id_master_counter",
                    FilterExpression: 'priority = :p',
                    ExpressionAttributeValues: {
                        ':p': statusCounter,
                    },
            }
        const jsonActualMasterId = await dynamodb.scan(paramsQueryActualMasterID).promise()
        const objectMasterId = jsonActualMasterId.Items[0]
        const masterId = objectMasterId.id_master_unit
        const numberMasterID = parseInt(masterId.slice(1))
        // Contruccion del JSON para envio a Testa
        
        const uuidGenerated = randomUUID()
        const { country } = event.queryStringParameters
        const { machine } = event.queryStringParameters
        const sendMasterIdLoteSAP = numberMasterID + 1
        const fechaActual = new Date();
        const offset = fechaActual.getTimezoneOffset() * 60000
        const fechaLocal = new Date(fechaActual.getTime() - offset);
        const sendMasterIdLoteSAPFormatted = String(sendMasterIdLoteSAP).padStart(masterId.slice(1).length, '0')
        const sendMasterIdLoteSAPFormattedWithT = `T${sendMasterIdLoteSAPFormatted}`
        console.log(uuidGenerated, country, machine, sendMasterIdLoteSAPFormattedWithT, fechaLocal)
        
        var paramsInsertQueryIdGenerated = {
            TableName: "ts_id_generated",
            Item: {
                uuid: uuidGenerated,
                country: country,
                machine: machine,
                id_generated: sendMasterIdLoteSAPFormattedWithT, // Convertir a String para DynamoDB (tipo S)
                date_created: fechaLocal.toISOString(), // Formato ISO 8601 para la fecha
            },
        }
        await dynamodb.put(paramsInsertQueryIdGenerated).promise()

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
        console.log(uuidToUpdate)
        const updateParams = {
            TableName: "ts_id_master_counter",
            Key: { uuid: uuidToUpdate },
            UpdateExpression: 'set id_master_unit = :val',
            ExpressionAttributeValues: { ':val': sendMasterIdLoteSAPFormattedWithT },
            ReturnValues: 'ALL_NEW',
            };
        await dynamodb.update(updateParams).promise();

        const response = {
            statusCode: 201, 
            body: JSON.stringify(paramsInsertQueryIdGenerated.Item),
            };
    return response;
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
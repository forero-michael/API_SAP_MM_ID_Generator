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

function getCountryLocalTime(countryCode) {
    const TIMEZONE_MAP = {
        1000: 'America/Bogota',     // Colombia
        2000: 'America/Costa_Rica'  // Costa Rica
    };
    const timezone = TIMEZONE_MAP[countryCode];
    const now = new Date();

    // Configuración para obtener el formato "MM/DD/YYYY, HH:mm:ss" en 24h
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Formato 24 horas
    });
    
    const parts = formatter.formatToParts(now);     
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;

        // Construir la cadena ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
    const isoTime = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    return isoTime;
}

const getNewID = async (event, context) => {

    const { country } = event.queryStringParameters
    const { machine } = event.queryStringParameters

    try {
        const statusCounter = "primary"

        if (!country || !machine) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                message: "Faltan los Query Parameters correspondientes a la peticion",
                }),
            };
        }
        if (country != '1000' &&  country != '2000' ) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                message: "Centro no reconocido",
                }),
            };
        }
        
        var paramsQueryActualMasterID = {
                    TableName: "ts_id_master_counter",
                    FilterExpression: 'priority = :p',
                    ExpressionAttributeValues: {
                        ':p': statusCounter,
                    },
            }
        const jsonActualMasterId = await dynamodb.scan(paramsQueryActualMasterID).promise()
        if (jsonActualMasterId.Count <= 0) {
            return {
                statusCode: 500, // Error interno del servidor o 404 si es un recurso específico
                body: JSON.stringify({
                    message: 'Error interno en el servidor: No se encontró la configuración principal (master ID).',
                    details: 'La base de datos no contiene el registro clave necesario para la operación.'
                })
            }
        }
       
        // Contruccion del JSON para envio a Testa
        const objectMasterId = jsonActualMasterId.Items[0]
        const masterId = objectMasterId.Id_master_unit
        const numberMasterID = parseInt(masterId.slice(1)) 
        const uuidGenerated = randomUUID()
        // arranca ciclo for nro_matriculas
        const sendMasterIdLoteSAP = numberMasterID + 1
        const fechaLocal = getCountryLocalTime(country);
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
                date_created: fechaLocal, // Formato ISO 8601 para la fecha
            },
        }
        await dynamodb.put(paramsInsertQueryIdGenerated).promise()
        // temrina ciclo for

        // llama el uuid del id primario actual de la tabla ts_id_master antes de generar los id (matriculas) se hacxe despues del for
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
        // actualiza el id con base a la uuid con el ultimo valor generado el la peticion de matriculas (id)
        const updateParams = {
            TableName: "ts_id_master_counter",
            Key: { uuid: uuidToUpdate },
            UpdateExpression: 'set Id_master_unit = :val',
            ExpressionAttributeValues: { ':val': sendMasterIdLoteSAPFormattedWithT },
            ReturnValues: 'ALL_NEW',
            };
        await dynamodb.update(updateParams).promise();
        // devuelve ahora un array con varias matriculas
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
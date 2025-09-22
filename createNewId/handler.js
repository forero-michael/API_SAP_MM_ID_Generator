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


const createNewId = async (event, context) => {

    const claims = event.requestContext.authorizer.jwt.claims;
    const userGroups = claims['cognito:groups'] || [];
    if (!userGroups.includes('adminGroup')) {
        return {
            statusCode: 403,
            body: JSON.stringify({
                message: 'Acceso denegado: No tienes los permisos requeridos.'
            }),
        };
    }
    
    const id = randomUUID()
    let userBody = JSON.parse(event.body)
    userBody.uuid = id
    var params = {
                TableName: "ts_id_master_counter",
                Item: userBody
        }
    console.log(params.Item)
    return dynamodb.put(params).promise().then(res => {
        console.log(res)
        return {
            "statusCode": 200,
            "body": JSON.stringify({ 'masterCounter': params.Item})
        }
    })
    
}

module.exports = {
    createNewId
}
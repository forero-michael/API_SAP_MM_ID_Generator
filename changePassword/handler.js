const { CognitoIdentityProviderClient, RespondToAuthChallengeCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const COGNITO_APP_CLIENT_ID = '2jvhi7csnr41idp51k0i0do8cj';
const COGNITO_APP_CLIENT_SECRET = '1a99rsi8etj3081kuk2ehh5eidu7rf52c6o9jkk9bt8net8v9sq2'; // <-- ¡Reemplaza este valor!

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });


const changePassword = async (event, context) => {
let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Cuerpo de la solicitud JSON inválido' }),
    };
  }

  const { username, newPassword, session } = body;

  const hmac = crypto.createHmac('sha256', COGNITO_APP_CLIENT_SECRET);
  hmac.update(username + COGNITO_APP_CLIENT_ID);
  const secretHash = hmac.digest('base64');

  const params = {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: COGNITO_APP_CLIENT_ID,
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
      SECRET_HASH: secretHash,
    },
  };

  try {
    const command = new RespondToAuthChallengeCommand(params);
    const result = await cognitoClient.send(command);

    if (result.AuthenticationResult && result.AuthenticationResult.AccessToken) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          token: result.AuthenticationResult.AccessToken,
          message: 'Contraseña actualizada y login exitoso',
        }),
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Respuesta inesperada de Cognito. El desafío no se pudo completar.',
        details: JSON.stringify(result),
      }),
    };

  } catch (error) {
    console.error('Error al responder al desafío:', error);

    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Credenciales inválidas o error de autenticación.',
        error: error.message,
      }),
    };
  }


}

module.exports =  {
  changePassword
};
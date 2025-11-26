const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require('crypto');

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});
const COGNITO_APP_CLIENT_ID = "2jvhi7csnr41idp51k0i0do8cj";
const COGNITO_USER_POOL_ID = "us-east-1_L231K1fP";
const COGNITO_APP_CLIENT_SECRET = '1a99rsi8etj3081kuk2ehh5eidu7rf52c6o9jkk9bt8net8v9sq2';

const login = async (event, context) => {
let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Cuerpo de la solicitud JSON inválido' }),
    };
  }

  const { username, password } = body;

  // Calcular el SECRET_HASH
  const hmac = crypto.createHmac('sha256', COGNITO_APP_CLIENT_SECRET);
  hmac.update(username + COGNITO_APP_CLIENT_ID);
  const secretHash = hmac.digest('base64');

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: COGNITO_APP_CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: secretHash, // <-- ¡Agregamos el hash aquí!
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const result = await cognitoClient.send(command);
    
     if (result.ChallengeName && result.Session) {
      console.log('Se requiere un desafío de autenticación:', result.ChallengeName);
      
      // Devuelve la información del desafío al cliente
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Se requiere un paso adicional de autenticación',
          challengeName: result.ChallengeName,
          session: result.Session,
          // Puedes incluir otros parámetros según el tipo de desafío
          challengeParameters: result.ChallengeParameters,
        }),
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        token: result.AuthenticationResult.AccessToken,
        message: 'Login exitoso',
      }),
    };
  } catch (error) {
    // Imprime el error completo para un mejor diagnóstico
    console.error("Error al autenticar con Cognito:", error);
    
    let errorMessage = 'Credenciales inválidas o error de autenticación';
    
    // Muestra errores específicos si la llamada a Cognito los devuelve
    if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Nombre de usuario o contraseña incorrectos.';
    } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Usuario no confirmado. Por favor, confirme su cuenta.';
    }
    
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: errorMessage,
        error: error.message,
      }),
    };
  }
};

module.exports = {
  login,
};

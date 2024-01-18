import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secretName = process.env.DATABASE_PASSWORD_SECRET_NAME || "none";
const region = process.env.AWS_REGION || "us-east-1";

const awsKey = process.env.AWS_ACCESS_KEY_ID;
const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;

if (!awsKey || !awsSecret) {
  throw new Error("AWS credentials not found");
}

const client = new SecretsManagerClient({
  region,
  credentials: {
    accessKeyId: awsKey,
    secretAccessKey: awsSecret,
  },
});

export async function getDatabasePassword() {
  let response;

  try {
    response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
  } catch (error) {
    console.error("Error getting database password");
    throw error;
  }

  const secret = response.SecretString;

  return secret;
}

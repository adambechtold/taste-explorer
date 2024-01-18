require("dotenv").config();
const fs = require("fs");
const AWS = require("@aws-sdk/client-secrets-manager");

const region = process.env.AWS_REGION || "us-east-1";
const secretName = process.env.DATABASE_PASSWORD_SECRET_NAME || "none";
const dbHost = process.env.DATABASE_HOST || "localhost";
const dbPort = process.env.DATABASE_PORT || "3306";
const dbName = process.env.DATABASE_NAME || "taste_explorer";

const awsKey = process.env.AWS_ACCESS_KEY_ID;
const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;

const client = new AWS.SecretsManager({
  region,
  credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret },
});

client.getSecretValue({ SecretId: secretName }, function (err, data) {
  if (err) {
    console.error(err);
    throw err;
  }

  let secret;
  if ("SecretString" in data) {
    secret = data.SecretString;
  } else {
    let buff = new Buffer(data.SecretBinary, "base64");
    secret = buff.toString("ascii");
  }

  const dbCredentials = JSON.parse(secret);
  const dbPassword = dbCredentials.password;
  const dbUsername = dbCredentials.username;

  const dbUrl = `mysql://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
  fs.appendFileSync(".env", `DATABASE_URL='${dbUrl}'`);
});

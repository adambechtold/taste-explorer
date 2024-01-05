/**
 * Required External Modules
 */
import * as dotenv from "dotenv";
import fs from "fs";
import https from "https";

import createServer from "./utils/server";

dotenv.config();

/**
 * App Variables
 */

if (!process.env.PORT) {
  console.error("Set a PORT value in the .env file.");
  process.exit(1);
}

const PORT: number = parseInt(process.env.PORT as string, 10);

const app = createServer();

/**
 * Server Activation
 */

// SSL Certificates
if (
  process.env.SSL_CERT_PATH &&
  process.env.SSL_KEY_PATH &&
  process.env.NODE_ENV === "development"
) {
  const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, "utf8");
  const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, "utf8");
  const credentials = { key: privateKey, cert: certificate };

  https.createServer(credentials, app).listen(PORT, () => {
    console.log(`HTTPS Port on ${PORT} → https://localhost:${PORT}`);
  });

  app.listen(PORT + 1, () => {
    console.log(`HTTP Port on ${PORT + 1} → http://localhost:${PORT + 1}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT} → http://localhost:${PORT}`);
  });
}

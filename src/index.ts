/**
 * Required External Modules
 */

import * as dotenv from "dotenv";
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

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

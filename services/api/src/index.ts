import http from "http";
import { createApp } from "./app.js";
import { loadServerConfig } from "./config/env.js";
import { createLogger } from "@jobpilot/shared";

const logger = createLogger("api-service");

function startServer(): void {
  const config = loadServerConfig();
  const app = createApp();

  const server = http.createServer(app);

  server.listen(config.PORT, () => {
    logger.info(
      `JobPilot API Service listening on port ${config.PORT} [${config.NODE_ENV}]`,
    );
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Gracefully terminating API service...`);
    server.close(() => {
      logger.info("HTTP server closed successfully.");
      process.exit(0);
    });

    // Force close if graceful shutdown hangs
    setTimeout(() => {
      logger.error("Graceful shutdown timed out. Forcing termination.");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// Start if executed directly
if (process.env["NODE_ENV"] !== "test") {
  startServer();
}

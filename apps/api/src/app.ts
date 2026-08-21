import {
  initializeSharedServices,
  shutdownSharedServices,
} from "@shared/infrastructure/container.ts";
import { Server } from "@shared/infrastructure/server.ts";
import { envConfig } from "@shared/utils/config.ts";

(async () => {
  await main();
})();

async function main() {
  await initializeSharedServices();
  const server = new Server(envConfig().port);
  server.start();

  const shutdown = async () => {
    await server.stop();
    await shutdownSharedServices();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

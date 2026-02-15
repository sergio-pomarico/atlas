import { Server } from "@shared/infrastructure/server.ts";
import { envConfig } from "@shared/utils/config.ts";

(() => {
  main();
})();

function main() {
  const server = new Server(envConfig().port);
  server.start();
}

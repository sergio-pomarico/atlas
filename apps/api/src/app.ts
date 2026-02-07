import { Server } from "@api/presentation/server.ts";
import { envConfig } from "@api/shared/config.ts";

(() => {
  main();
})();

function main() {
  const server = new Server(envConfig().port);
  server.start();
}

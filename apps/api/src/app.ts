import { Server } from "@api/server.ts";
import { envConfig } from "./shared/config.ts";

(() => {
  main();
})();

function main() {
  const server = new Server(envConfig().port);
  server.start();
}

import "reflect-metadata";
import { afterAll, beforeAll } from "@jest/globals";

beforeAll(() => {
  // Initialize database connection or any other setup tasks
  console.log("Setting up tests...");
});

afterAll(() => {
  // Clean up database connection or any other teardown tasks
  console.log("Tearing down tests...");
});

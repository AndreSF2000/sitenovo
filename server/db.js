import { neon } from "@neondatabase/serverless";
import { ApiError } from "./http.js";

let client;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new ApiError(503, "A base de dados ainda não está configurada.");
  }

  client ??= neon(connectionString);
  return client;
}

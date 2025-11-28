import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { ENV } from "./env.js";
import * as schema from "../dataBase/schema.js";

const sql = neon(ENV.DATABASE_URL);
// db.js DESACTIVADO PARA EVITAR ERROR DE DATABASE_URL

export const db = {
  select: () => Promise.resolve([]),
  insert: () => ({ values: () => Promise.resolve([]) }),
  delete: () => ({ where: () => Promise.resolve([]) }),
};


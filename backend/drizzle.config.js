import { ENV } from "./src/config/env.js";

export default{
    schema: "./src/dataBase/schema.js",
    out: "./src/dataBase/migrations",
    dialect: "postgresql",
    dbCredentials: {url: ENV.DATABASE_URL },
};
import { db } from "../server/db/database.js";

db.prepare("SELECT 1").get();
console.log("SQLite database initialized.");
db.close();

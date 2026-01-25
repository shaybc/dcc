import { migrate } from "../src/db/migrate.js";

migrate();
console.log("✅ Migration complete.");

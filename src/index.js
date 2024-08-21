import { app } from "./app.js";
import dotenv  from "dotenv";
dotenv.config({ path: "./.env" });
import { connectDb } from "./db/db.js";


const PORT = process.env.PORT || 3000;



connectDb(); 
app.listen(PORT, () => {
  console.log(`the Server is running on port ${PORT}`);
});

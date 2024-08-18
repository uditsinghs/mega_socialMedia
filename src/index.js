import express from "express";
const app = express();
import dotenv from "dotenv";
import { connectDb } from "./db/db.js";
dotenv.config({path:'/.env'});
const PORT = process.env.PORT || 3000;
connectDb();
app.listen(PORT, () => {
  console.log(`the Server is running on port ${PORT}`);
});

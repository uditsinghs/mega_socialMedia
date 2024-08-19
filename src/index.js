import express from "express";
const app = express();

// configuration files path
import dotenv, { parse } from "dotenv";
dotenv.config({ path: "/.env" });
import cors from "cors";
import cookieParse from 'cookie-parser'

//  files path
import { connectDb } from "./db/db.js";


const PORT = process.env.PORT || 3000;

// configuration 
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParse())


connectDb();  //mongoDB connection
app.listen(PORT, () => {
  console.log(`the Server is running on port ${PORT}`);
});

import express from "express";
const app = express();
import cors from "cors";
import cookieParse from 'cookie-parser'
import userRouter from './routes/user.route.js'

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


app.use("/api/v1/users",userRouter)
export {app}

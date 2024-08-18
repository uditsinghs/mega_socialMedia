import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const URI = process.env.MONGO_URI
export const connectDb = async () => {
  try {
    await mongoose.connect(URI, {
      UseNewUrlParser: true,
      useUnifiedTopology:true,
    });
    console.log("connected to mongoDb");
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
};





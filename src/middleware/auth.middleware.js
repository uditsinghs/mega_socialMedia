import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ message: "unauthorized " });
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECREAT);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(404).json({ message: "Invalid access token" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log(error);

    return res.status(401).json({ message: "invalid access token" });
  }
});

import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;

  // Validation: Check if all required fields are filled
  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if user already exists by username or email
  const userExist = await User.findOne({ $or: [{ email }, { username }] });
  if (userExist) {
    return res.status(409).json({ message: "User already exists" });
  }

  // Handle file uploads safely
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    return res.status(400).json({ message: "Avatar file is required" });
  }

  // store files in cloudinary
  const avtar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check if avtar is not exist
  if (!avtar) {
    return res.status(400).json({ message: "Avatar file is required" });
  }
  // create user
  const user = await User.create({
    fullName,
    avtar: avtar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  // remove sensible data
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    res
      .status(500)
      .json({ message: "internal server error while registering user" });
  }

  res
    .status(201)
    .json(new APIResponse(200, createdUser, "user Registered successfully"));
});

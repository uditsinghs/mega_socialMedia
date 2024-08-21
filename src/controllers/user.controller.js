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

  // console.log("files comes from local server:" , req.files);

  // Handle file uploads safely
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    return res.status(400).json({ message: "Avatar file is required " });
  }

  // store files in cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check if avtar is not exist
  if (!avatar) {
    return res
      .status(400)
      .json({ message: "Avatar file is required is store in cloud" });
  }
  // create user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
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

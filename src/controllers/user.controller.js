import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
  }
};
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

export const loginUser = asyncHandler(async (req, res) => {
  // take data from frontend like username , gmail,password
  // is this valid  user or not
  // kya usne required field fill kr rkhi hai
  // generate access token
  //  now compare password for login

  const { email, password, username } = req.body;

  if (!email || !password) {
    res.status(409).json({ message: "all fields are required" });
  }
  // find user from database for the basis of email or password
  const user = await User.findOne({ $or: [{ email }, { password }] });
  // check user is able to login or not
  if (!user) {
    return res.status(404).json({ message: "user does not exist" });
  }
  // now compare the password for login
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "invalid user crendential" });
  }

  const { refreshToken, accessToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // send token in cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APIResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

// logout user
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined,
    },
  });
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({ message: "user logout successfully" });
});

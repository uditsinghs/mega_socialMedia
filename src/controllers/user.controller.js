import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    // Fetch the user by ID
    const user = await User.findById(userId);

    // Ensure the user exists
    if (!user) {
      throw new Error("User not found");
    }

    // Generate access and refresh tokens
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    // Store the refresh token in the user's document
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Return the tokens
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error in token generation:", error);
    throw new Error("Failed to generate tokens");
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
  const { email, password, username } = req.body;

  if (!email && !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    return res.status(404).json({ message: "User does not exist" });
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid user credentials" });
  }

  const { refreshToken, accessToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  if (!refreshToken || !accessToken) {
    return res.status(500).json({ message: "Error generating tokens" });
  }

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
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
        "User logged in successfully"
      )
    );
});

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

export const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incoimgRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incoimgRefreshToken) {
      res.status(401).json({ message: "unauthorized Request..!" });
    }

    const decodedToken = jwt.verify(
      incoimgRefreshToken,
      process.env.REFRESH_TOKEN_SECREAT
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      res.status(401).json({ message: "Inavalid refrsh token.!" });
    }

    if (incoimgRefreshToken != user.refreshToken) {
      res.status(401).json({ message: "Refresh token is used or expire" });
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new APIResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "access token refreshed"
        )
      );
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "password is not correct",
        success: false,
      });
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
      message: "password changes successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "internal server error", success: false, error });
  }
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  try {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
      res.status(400).jon({
        message: "All fields are required",
      });
    }
    const user = await findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName,
          email,
        },
      },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      mesage: "internal server error",
      success: false,
      error,
    });
  }
});

export const updateAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
      return res.status(400).json({
        message: "avatar is not provided",
      });
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
      res.status(400).json({
        message: "Avtar file is not uplaoded in cloudinary",
      });
    }

    const user = await findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    ).select("-password");
    return res.status(200).json({
      mesage: "Avatar is updated successfully",
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      mesage: "Internal server error",
      success: false,
    });
  }
});

export const updateCoverImage = asyncHandler(async (req, res) => {
  try {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      return res.status(400).json({
        message: "cover image is not provided",
      });
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
      res.status(400).json({
        message: "Avtar file is not uplaoded in cloudinary",
      });
    }

    const user = await findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: coverImage.url,
        },
      },
      { new: true }
    ).select("-password");
    return res.status(200).json({
      mesage: "cover Image is updated successfully",
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      mesage: "Internal server error",
      success: false,
    });
  }
});


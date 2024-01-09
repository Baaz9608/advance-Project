import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/userModel.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;  // adding the refresh token for user
        await user.save({validateBeforeSave: false})  // validateBeforeSave -> save without any validation

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating access and refresh tokens!!")
    }
}

const registerUser = asyncHandler(async (req, res)=>{

    // get user details from frontend
    // validation - !empty
    // check if user already exist: username, email
    // check for images, check for avatar
    // upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return res otherwise return error

    const {fullname, email, username, password} = req.body;
    console.log("email", email, password);

    // if(fullname === ""){
    //     throw new ApiError(400, "Full name is required")
    // }

    if(
        [fullname, email, username, password].some((field)=>field ?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required!!")
    }

    const exitedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(exitedUser) throw new ApiError(409, "User with email or username already exists")
    console.log(exitedUser);
    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required!!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required!!");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(

        new ApiResponse(200, createdUser, "User registered successfully")
    )

    
})


const loginUser = asyncHandler(async (req, res) =>{
    // req.body -> data
    // username or email
    // find the user
    // check password
    // access and refresh token
    // send in cookies

    const {email, username, password} = req.body;
    if(!(username || email)){
        throw new ApiError(400, "username or email is required!!")
    }

    // user will be on the basis of email or username
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    // checking user is present or not
    if(!user){
        throw new ApiError(404, "User does not exist!!");
    }
    
    // checking for password is correct or incorrect
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials!!");
    } 

    // it is common so make a mthod for these
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id); // return refreshToken and accessToken

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken"); // -password -> means not select this field


    // we send cookie so we need to options
    const options = {
        httpOnly: true, // it means it can be modified only by server not by frontend
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken  // if user wants to save the cookies by itself
            },
            "User logged In successfully!!"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // it will update the given fields
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    // cookies always want options so make sure to define option and use it
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}
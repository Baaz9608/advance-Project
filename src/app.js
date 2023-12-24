import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true // credential k bare m padhna hai

}))

app.use(express.json({limit:"10kb"}))
app.use(express.urlencoded({extended:true, limit: "10kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes
import userRoutes from "./routes/userRoutes.js";
// import { registerUser } from "./controllers/userController.js";

// routes declaration
app.use("/api/v1/users",userRoutes)

// http://localhost:8000/api/v1/users/....


export {app}
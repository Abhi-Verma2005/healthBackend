"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("./prisma"));
const auth_1 = require("./middlewares/auth");
const dailyLog_1 = __importDefault(require("./routes/dailyLog"));
const setGoal_1 = __importDefault(require("./routes/setGoal"));
const userRoute_1 = __importDefault(require("./routes/userRoute"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dailyLogRoutes_1 = __importDefault(require("./routes/dailyLogRoutes"));
const sleep_1 = __importDefault(require("./routes/sleep"));
const mood_1 = __importDefault(require("./routes/mood"));
const meal_1 = __importDefault(require("./routes/meal"));
const health_1 = require("./routes/health");
require(".");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: "http://localhost:3000", // or "*" for testing, but better to be specific
    credentials: true,
}));
app.post("/signup", async (req, res) => {
    const userpfp = "";
    console.log('hitted');
    const requiredBody = zod_1.z.object({
        username: zod_1.z.string().min(3).max(100),
        password: zod_1.z.string().min(6).max(100),
    });
    const parsedData = requiredBody.safeParse(req.body);
    if (!parsedData.success) {
        res.status(207).json({ message: "Incorrect Format", errors: parsedData.error.issues });
        return;
    }
    const { password, username } = parsedData.data;
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    try {
        const existingUser = await prisma_1.default.user.findUnique({ where: { username } });
        if (existingUser) {
            res.status(205).json({ message: "Email already registered" });
            return;
        }
        await prisma_1.default.user.create({
            data: { username, password: hashedPassword }
        });
        res.status(201).json({
            message: "User signed up!",
            username,
        });
        return;
    }
    catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});
app.post("/signin", async (req, res) => {
    const { username, password } = req.body;
    try {
        const foundUser = await prisma_1.default.user.findUnique({ where: { username } });
        if (!foundUser) {
            res.status(203).json({ message: "User not found!" });
            return;
        }
        const isPassValid = await bcrypt_1.default.compare(password, foundUser.password);
        if (!isPassValid) {
            res.status(206).json({ message: "Incorrect Credentials!" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: foundUser.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.cookie("uuid", token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        });
        res.status(200).json({
            username: foundUser.username,
        });
        return;
    }
    catch (error) {
        console.error("Signin Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});
app.get("/verify-auth", auth_1.userMiddleware, async (req, res) => {
    console.log('verify');
    try {
        //@ts-expect-error: no need here 
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { username: true }
        });
        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }
        res.status(200).json({ username: user.username });
    }
    catch (error) {
        console.error("Verify auth error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
app.post("/logout", (req, res) => {
    console.log('Logout');
    res.clearCookie("uuid", {
        httpOnly: true,
        secure: true,
        sameSite: "strict"
    });
    res.status(200).json({ message: "Logged out successfully" });
});
app.use('/dailyLog', dailyLog_1.default);
app.use('/setGoal', setGoal_1.default);
app.use('/daily-progress', dailyLogRoutes_1.default);
app.use('/users', userRoute_1.default);
app.use('/api/sleep', sleep_1.default);
app.use('/api/mood', mood_1.default);
app.use('/api/nutrition', meal_1.default);
(0, health_1.registerHealthRoutes)(app);
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

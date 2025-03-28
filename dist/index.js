"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({ origin: "*", methods: "GET,HEAD,PUT,PATCH,POST,DELETE", credentials: true }));
//@ts-expect-error: tried many thing but not solving 
app.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userpfp = "";
    const requiredBody = zod_1.z.object({
        email: zod_1.z.string().email(),
        username: zod_1.z.string().min(3).max(100),
        password: zod_1.z.string().min(6).max(100),
    });
    const parsedData = requiredBody.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(207).json({ message: "Incorrect Format", errors: parsedData.error.issues });
    }
    const { email, password, username } = parsedData.data;
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    try {
        const existingUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(205).json({ message: "Email already registered" });
        }
        yield prisma_1.default.user.create({
            data: { email, username, password: hashedPassword }
        });
        console.log("User signed up:", username);
        return res.status(201).json({
            message: "User signed up!",
            username,
            userpfp,
        });
    }
    catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}));
//@ts-expect-error: tried many thing but not solving 
app.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const foundUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (!foundUser) {
            return res.status(403).json({ message: "User not found!" });
        }
        console.log(email, password);
        const isPassValid = yield bcrypt_1.default.compare(password, foundUser.password);
        if (!isPassValid) {
            return res.status(206).json({ message: "Incorrect Credentials!" });
        }
        const token = jsonwebtoken_1.default.sign({ id: foundUser.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        console.log("User signed in:", foundUser.username);
        return res.json({
            token,
            username: foundUser.username,
            email: foundUser.email,
        });
    }
    catch (error) {
        console.error("Signin Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}));
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

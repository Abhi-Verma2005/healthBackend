"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMiddleware = userMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
async function userMiddleware(req, res, next) {
    console.log(req.cookies);
    const token = req.cookies.uuid;
    if (!token) {
        res.status(401).json({ message: "No token provided" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const foundUser = await prisma_1.default.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, username: true }
        });
        if (!foundUser) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        req.user = foundUser;
        next();
    }
    catch (error) {
        console.error("Token Verification Error:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

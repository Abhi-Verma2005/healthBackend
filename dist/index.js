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
        const isPassValid = yield bcrypt_1.default.compare(password, foundUser.password);
        if (!isPassValid) {
            return res.status(206).json({ message: "Incorrect Credentials!" });
        }
        const token = jsonwebtoken_1.default.sign({ id: foundUser.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
//@ts-expect-error: tried many thing but not solving 
app.post("/verify-token", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Optional: Additional check to verify user exists
        const foundUser = yield prisma_1.default.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, username: true, email: true }
        });
        if (!foundUser) {
            return res.status(401).json({ message: "Invalid token" });
        }
        return res.json({
            message: "Token is valid",
            user: {
                id: foundUser.id,
                username: foundUser.username,
                email: foundUser.email
            }
        });
    }
    catch (error) {
        console.error("Token Verification Error:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}));
app.get('/api/blogs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blogs = yield prisma_1.default.blog.findMany({
            include: {
                user: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(blogs);
    }
    catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({
            error: 'Unable to fetch blogs',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
//@ts-expect-error: do not know what to do here
app.post('/api/blogs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, desc, username } = req.body;
        console.log(title, desc, username);
        if (!title || !desc || !username) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const newBlog = yield prisma_1.default.blog.create({
            data: {
                title,
                desc,
                username
            },
            include: {
                user: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });
        res.status(201).json(newBlog);
    }
    catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({
            error: 'Unable to create blog',
        });
    }
}));
//@ts-expect-error: do not know what to do here
app.get('/api/blogs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const blog = yield prisma_1.default.blog.findUnique({
            where: { id },
            include: {
                user: true,
                likes: true,
                comments: true
            }
        });
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json(blog);
    }
    catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({
            error: 'Unable to fetch blog',
        });
    }
}));
app.put('/api/blogs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, desc } = req.body;
        const updatedBlog = yield prisma_1.default.blog.update({
            where: { id },
            data: {
                title,
                desc,
                updatedAt: new Date()
            }
        });
        res.json(updatedBlog);
    }
    catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({
            error: 'Unable to update blog',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Delete blog route
app.delete('/api/blogs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.blog.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({
            error: 'Unable to delete blog',
        });
    }
}));
//@ts-expect-error: do not know what to do here
app.post('/api/blogs/:id/likes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        // Check if the user already liked this blog
        const existingLike = yield prisma_1.default.like.findFirst({
            where: {
                blogId: id,
                username
            }
        });
        if (existingLike) {
            return res.status(400).json({ error: 'Blog already liked by this user' });
        }
        // Create the like
        const newLike = yield prisma_1.default.like.create({
            data: {
                blogId: id,
                username
            }
        });
        res.status(201).json(newLike);
    }
    catch (error) {
        console.error('Error liking blog:', error);
        res.status(500).json({
            error: 'Unable to like blog',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Unlike a blog
//@ts-expect-error: do not know what to do here
app.delete('/api/blogs/:id/likes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        // Find and delete the like
        yield prisma_1.default.like.deleteMany({
            where: {
                blogId: id,
                username
            }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error unliking blog:', error);
        res.status(500).json({
            error: 'Unable to unlike blog',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Add a comment to a blog
//@ts-expect-error: do not know what to do here
app.post('/api/blogs/:id/comments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { text, username } = req.body;
        if (!text || !username) {
            return res.status(400).json({ error: 'Text and username are required' });
        }
        const newComment = yield prisma_1.default.comment.create({
            data: {
                content: text,
                username,
                blogId: id
            }
        });
        res.status(201).json(newComment);
    }
    catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            error: 'Unable to add comment',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Get comments for a blog
app.get('/api/blogs/:id/comments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const comments = yield prisma_1.default.comment.findMany({
            where: {
                blogId: id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(comments);
    }
    catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            error: 'Unable to fetch comments',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Update the get blog by ID route to include likes and comments
//@ts-expect-error: do not know what to do here
app.get('/api/blogs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const blog = yield prisma_1.default.blog.findUnique({
            where: { id },
            include: {
                user: true,
                likes: true,
                comments: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json(blog);
    }
    catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({
            error: 'Unable to fetch blog',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

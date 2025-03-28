import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";
import prisma from "./prisma";

dotenv.config();
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", methods: "GET,HEAD,PUT,PATCH,POST,DELETE", credentials: true }));


//@ts-expect-error: tried many thing but not solving 
app.post("/signup", async (req: Request, res: Response): Promise<Response> => {
    const userpfp = "";

    const requiredBody = z.object({
        email: z.string().email(),
        username: z.string().min(3).max(100),
        password: z.string().min(6).max(100),
    });

    const parsedData = requiredBody.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(207).json({ message: "Incorrect Format", errors: parsedData.error.issues });
    }

    const { email, password, username } = parsedData.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(205).json({ message: "Email already registered" });
        }

        await prisma.user.create({
            data: { email, username, password: hashedPassword }
        });

        console.log("User signed up:", username);
        return res.status(201).json({
            message: "User signed up!",
            username,
            userpfp,
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


//@ts-expect-error: tried many thing but not solving 
app.post("/signin", async (req: Request, res: Response): Promise<Response> => {
    const { email, password } = req.body;

    
    try {
        const foundUser = await prisma.user.findUnique({ where: { email } });
        if (!foundUser) {
            return res.status(403).json({ message: "User not found!" });
        }
        
        console.log(email, password)
        const isPassValid = await bcrypt.compare(password, foundUser.password);
        if (!isPassValid) {
            return res.status(206).json({ message: "Incorrect Credentials!" });
        }

        const token = jwt.sign(
            { id: foundUser.id },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        console.log("User signed in:", foundUser.username);
        return res.json({
            token,
            username: foundUser.username,
            email: foundUser.email,
        });

    } catch (error) {
        console.error("Signin Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

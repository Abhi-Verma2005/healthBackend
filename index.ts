import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";
import prisma from "./prisma";
import { userMiddleware } from "./middlewares/auth";
import dailyLog from './routes/dailyLog'
import cookieParser from "cookie-parser"
import "."; 
dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "http://localhost:3000", // or "*" for testing, but better to be specific
    credentials: true,
}));

app.post("/signup", async (req: Request, res: Response): Promise<void> => {
    const userpfp = "";
    console.log('hitted')

    const requiredBody = z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(6).max(100),
    });

    const parsedData = requiredBody.safeParse(req.body);
    if (!parsedData.success) {
        res.status(207).json({ message: "Incorrect Format", errors: parsedData.error.issues });
        return 
    }

    const { password, username } = parsedData.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            res.status(205).json({ message: "Email already registered" });
            return 
        }

        await prisma.user.create({
            data: { username, password: hashedPassword }
        });
        res.status(201).json({
            message: "User signed up!",
            username,
        });
        return 

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return 
    }
});


app.post("/signin", async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    
    try {
        const foundUser = await prisma.user.findUnique({ where: { username } });
        if (!foundUser) {
            res.status(403).json({ message: "User not found!" });
            return 
        }        
        const isPassValid = await bcrypt.compare(password, foundUser.password);
        if (!isPassValid) {
            res.status(206).json({ message: "Incorrect Credentials!" });
            return 
        }

        const token = jwt.sign(
            { id: foundUser.id },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );
        res.cookie("uuid",token,{
            httpOnly: true,
            secure: true, 
            sameSite: "strict",
          })
        res.status(200).json({
            username: foundUser.username,
        });
        return 

    } catch (error) {
        console.error("Signin Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return 
    }
});

app.get("/verify-auth", userMiddleware, async (req: Request, res: Response): Promise<void> => {
    console.log('verify')
    try {
        //@ts-expect-error: no need here 
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });
      
      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }
      
      res.status(200).json({ username: user.username });
    } catch (error) {
      console.error("Verify auth error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

  app.post("/logout", (req: Request, res: Response): void => {
    console.log('Logout')
    res.clearCookie("uuid", {
      httpOnly: true,
      secure: true,
      sameSite: "strict"
    });
    res.status(200).json({ message: "Logged out successfully" });
  });


app.use('/dailyLog', dailyLog)








const port = process.env.PORT || 3001;

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

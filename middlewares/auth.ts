import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

export async function userMiddleware(req: Request, res: Response, next: NextFunction) : Promise<void> {
    console.log(req.cookies)
    const token = req.cookies.uuid
    if (!token) {
        res.status(401).json({ message: "No token provided" });
        return
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

        const foundUser = await prisma.user.findUnique({ 
            where: { id: decoded.id },
            select: { id: true, username: true }
        });

        if (!foundUser) {
            res.status(401).json({ message: "Invalid token" });
            return
        }

        
        (req as any).user = foundUser;

        next(); 
    } catch (error) {
        console.error("Token Verification Error:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
}
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

        
        const isPassValid = await bcrypt.compare(password, foundUser.password);
        if (!isPassValid) {
            return res.status(206).json({ message: "Incorrect Credentials!" });
        }

        const token = jwt.sign(
            { id: foundUser.id },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

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


//@ts-expect-error: tried many thing but not solving 
app.post("/verify-token", async (req: Request, res: Response): Promise<Response> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        
        // Optional: Additional check to verify user exists
        const foundUser = await prisma.user.findUnique({ 
            where: { id: (decoded as any).id },
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

    } catch (error) {
        console.error("Token Verification Error:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
});


app.get('/api/blogs', async (req: Request, res: Response) => {
    try {
      const blogs = await prisma.blog.findMany({
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
    } catch (error) {
      console.error('Error fetching blogs:', error);
      res.status(500).json({ 
        error: 'Unable to fetch blogs', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  //@ts-expect-error: do not know what to do here
app.post('/api/blogs', async (req: Request, res: Response) => {
    try {

        const { title, desc, username } = req.body;

        console.log(title, desc, username)


        if (!title || !desc || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
        }

        const newBlog = await prisma.blog.create({
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
} catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ 
    error: 'Unable to create blog', 
    });
}
});

//@ts-expect-error: do not know what to do here
app.get('/api/blogs/:id', async (req: Request, res: Response) => {
try {
    const { id } = req.params;

    const blog = await prisma.blog.findUnique({
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
} catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ 
    error: 'Unable to fetch blog',  
    });
}
});

app.put('/api/blogs/:id', async (req: Request, res: Response) => {
try {
    const { id } = req.params;
    const { title, desc } = req.body;

    const updatedBlog = await prisma.blog.update({
    where: { id },
    data: {
        title,
        desc,
        updatedAt: new Date()
    }
    });

    res.json(updatedBlog);
} catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ 
    error: 'Unable to update blog', 
    details: error instanceof Error ? error.message : 'Unknown error' 
    });
}
});

// Delete blog route
app.delete('/api/blogs/:id', async (req: Request, res: Response) => {
try {
    const { id } = req.params;

    await prisma.blog.delete({
    where: { id }
    });

    res.status(204).send();
} catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ 
    error: 'Unable to delete blog', 
    });
}
});

//@ts-expect-error: do not know what to do here
app.post('/api/blogs/:id/likes', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { username } = req.body;
  
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
  
      // Check if the user already liked this blog
      const existingLike = await prisma.like.findFirst({
        where: {
          blogId: id,
          username
        }
      });
  
      if (existingLike) {
        return res.status(400).json({ error: 'Blog already liked by this user' });
      }
  
      // Create the like
      const newLike = await prisma.like.create({
        data: {
          blogId: id,
          username
        }
      });
  
      res.status(201).json(newLike);
    } catch (error) {
      console.error('Error liking blog:', error);
      res.status(500).json({ 
        error: 'Unable to like blog',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Unlike a blog
  //@ts-expect-error: do not know what to do here
app.delete('/api/blogs/:id/likes', async (req: Request, res: Response) => {
try {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
    return res.status(400).json({ error: 'Username is required' });
    }

    // Find and delete the like
    await prisma.like.deleteMany({
    where: {
        blogId: id,
        username
    }
    });

    res.status(204).send();
} catch (error) {
    console.error('Error unliking blog:', error);
    res.status(500).json({ 
    error: 'Unable to unlike blog',
    details: error instanceof Error ? error.message : 'Unknown error'
    });
}
});

// Add a comment to a blog
//@ts-expect-error: do not know what to do here
app.post('/api/blogs/:id/comments', async (req: Request, res: Response) => {
try {
    const { id } = req.params;
    const { text, username } = req.body;

    if (!text || !username) {
    return res.status(400).json({ error: 'Text and username are required' });
    }

    const newComment = await prisma.comment.create({
    data: {
        content: text,
        username,
        blogId: id
    }
    });

    res.status(201).json(newComment);
} catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
    error: 'Unable to add comment',
    details: error instanceof Error ? error.message : 'Unknown error'
    });
}
});

// Get comments for a blog
app.get('/api/blogs/:id/comments', async (req: Request, res: Response) => {
try {
    const { id } = req.params;

    const comments = await prisma.comment.findMany({
    where: {
        blogId: id
    },
    orderBy: {
        createdAt: 'desc'
    }
    });

    res.json(comments);
} catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ 
    error: 'Unable to fetch comments',
    details: error instanceof Error ? error.message : 'Unknown error'
    });
}
});

// Update the get blog by ID route to include likes and comments
//@ts-expect-error: do not know what to do here
app.get('/api/blogs/:id', async (req: Request, res: Response) => {
try {
    const { id } = req.params;

    const blog = await prisma.blog.findUnique({
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
} catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ 
    error: 'Unable to fetch blog',
    details: error instanceof Error ? error.message : 'Unknown error'
    });
}
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

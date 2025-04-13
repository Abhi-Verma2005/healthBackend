// src/routes/userRoutes.ts
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userMiddleware } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// User registration
router.post('/register', async (req:Request, res:Response) => {
  try {
    const { username, password } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUser) {
      res.status(400).json({ message: 'Username already taken' });
      return
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Return user data without password
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

// User login
router.post('/login', async (req:Request, res:Response) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
        res.status(401).json({ message: 'Invalid credentials' });
        return
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Set token as HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict'
    });
    
    // Return user data without password
    res.json({
      id: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Failed to login' });
  }
});

// User logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

// Get user profile
router.get('/profile', userMiddleware, async (req:Request, res:Response) => {
  try {
    const userId = req.user.userId;
    
    // Find user with their daily logs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        goal: true,
        dailyLogs: {
          orderBy: { date: 'desc' },
          take: 1,
          include: {
            nutrition: true,
            sleep: true,
            mood: true,
            water: true
          }
        }
      }
    });
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return
    }
    
    // Calculate health statistics
    const stats = await calculateHealthStats(userId);
    
    res.json({
      id: user.id,
      username: user.username,
      goal: user.goal,
      dailyLogs: user.dailyLogs,
      stats
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', userMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, goal, age, weight, gender, activityLevel } = req.body;
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        goal
      }
    });
    
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      goal: updatedUser.goal
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Delete user account
router.delete('/profile', userMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Delete all user data (Prisma will cascade delete related records)
    await prisma.user.delete({
      where: { id: userId }
    });
    
    res.clearCookie('auth_token');
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

// Helper function to calculate health statistics
async function calculateHealthStats(userId: string) {
  const logs = await prisma.dailyLog.findMany({
    where: { userId },
    include: {
      nutrition: true,
      sleep: true,
      mood: true,
      water: true
    }
  });
  
  let totalSleep = 0;
  let totalWater = 0;
  let totalMood = 0;
  let totalExerciseMinutes = 0;
  let sleepCount = 0;
  let waterCount = 0;
  let moodCount = 0;
  
  logs.forEach(log => {
    if (log.sleep) {
      totalSleep += log.sleep.duration;
      sleepCount++;
    }
    
    if (log.water) {
      totalWater += log.water.finalScore;
      waterCount++;
    }
    
    if (log.mood) {
      totalMood += log.mood.finalScore;
      moodCount++;
    }
    
    // Note: This is a placeholder - your schema doesn't have exercise minutes
    // You would need to add this to your schema if you want to track it
    totalExerciseMinutes += 30; // placeholder value
  });
  
  return {
    avgSleep: sleepCount > 0 ? (totalSleep / sleepCount).toFixed(1) : 0,
    avgWater: waterCount > 0 ? (totalWater / waterCount).toFixed(1) : 0,
    avgMood: moodCount > 0 ? (totalMood / moodCount).toFixed(1) : 0,
    totalExerciseMinutes,
    logsCount: logs.length
  };
}

export default router;
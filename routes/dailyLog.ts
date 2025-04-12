import { Request, Response } from "express";
import { userMiddleware } from "../middlewares/auth";

// routes/dailyLog.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// Middleware to extract user from token
router.use(auth);

// Validate and sanitize input
const validateDailyLog = [
  body('waterIntake').isFloat({ min: 0 }).withMessage('Water intake must be a positive number'),
  body('mood').isString().notEmpty().withMessage('Mood is required'),
  body('weight').isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('sleepHours').isFloat({ min: 0 }).withMessage('Sleep hours must be a positive number'),
  body('steps').isInt({ min: 0 }).withMessage('Steps must be a positive integer'),
  body('mealQuality').isString().notEmpty().withMessage('Meal quality is required'),
  body('symptoms').optional().isString(),
];


router.post('/', validateDailyLog, async (req: Request, res: Response): Promise<void> => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return 
    }

    const { waterIntake, mood, weight, sleepHours, steps, mealQuality, symptoms } = req.body;

    const userId = req.user?.id; 
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingLog = await prisma.dailyLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    let dailyLog;
    
    if (existingLog) {
      // Update existing log
      dailyLog = await prisma.dailyLog.update({
        where: { id: existingLog.id },
        data: {
          waterIntake,
          mood,
          weight,
          sleepHours,
          steps,
          mealQuality,
          symptoms: symptoms || null,
        }
      });
    } else {
      // Create new log
      dailyLog = await prisma.dailyLog.create({
        data: {
          userId,
          waterIntake,
          mood,
          weight,
          sleepHours,
          steps,
          mealQuality,
          symptoms: symptoms || null,
        }
      });
    }

    res.status(201).json({
      success: true,
      data: dailyLog
    });
  } catch (error) {
    console.error('Error creating daily log:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// GET: Get today's log for the user
router.get('/today', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dailyLog = await prisma.dailyLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'No log found for today'
      });
    }

    res.status(200).json({
      success: true,
      data: dailyLog
    });
  } catch (error) {
    console.error('Error fetching daily log:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// GET: Get logs for the past 7 days
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        date: {
          gte: weekAgo,
          lte: today
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: dailyLogs
    });
  } catch (error) {
    console.error('Error fetching weekly logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router
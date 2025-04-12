import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify authenticated user (assuming you have this implemented)
const authenticateUser = (req: Request, res: Response, next: Function) => {
  // Authentication logic here
  // Sets req.userId if authenticated
  next();
};

// Set Health Goal endpoint - corresponds to the GoalSetup page
router.post('/health-goal', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    goal: z.enum(['Lose weight', 'Improve sleep', 'Gain muscle', 'Manage stress'], {
      required_error: "Please select a health goal.",
    }),
    age: z.number().min(1, "Age is required"),
    weight: z.number().min(1, "Weight is required"),
    gender: z.enum(['male', 'female', 'other'], {
      required_error: "Please select your gender.",
    }),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very active'], {
      required_error: "Please select your activity level.",
    }),
    symptoms: z.string().optional(),
  });

  try {
    const userData = schema.parse(req.body);
    //@ts-expect-error: no need here
    const userId = req.user.id;
    
    // Update user with goal
    await prisma.user.update({
      where: { id: userId },
      data: { goal: userData.goal }
    });
    
    // Generate personalized health plan
    const healthPlan = getMockHealthPlan(userData.goal);
    
    res.status(200).json({
      message: 'Health goal set successfully',
      healthPlan
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
        return 
    }
    console.error('Health goal error:', error);
    res.status(500).json({ message: 'Server error setting health goal' });
  }
});

// Get user's health goal and plan
router.get('/health-goal', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    //@ts-expect-error: no need here
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.goal) {
       res.status(404).json({ message: 'Health goal not found' });
       return 
    }
    
    // Generate health plan based on saved goal
    const healthPlan = getMockHealthPlan(user.goal);
    
    res.status(200).json({
      goal: user.goal,
      healthPlan
    });
  } catch (error) {
    console.error('Fetch health goal error:', error);
    res.status(500).json({ message: 'Server error fetching health goal' });
  }
});

// Add daily log endpoint
router.post('/daily-log', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    waterIntake: z.number().min(0, "Water intake must be a positive number"),
    mood: z.string().min(1, "Mood is required"),
    weight: z.number().min(0, "Weight must be a positive number"),
    sleepHours: z.number().min(0, "Sleep hours must be a positive number"),
    steps: z.number().int().min(0, "Steps must be a positive integer"),
    mealQuality: z.string().min(1, "Meal quality is required"),
    symptoms: z.string().optional(),
    date: z.string().optional() // Optional, will default to today
  });

  try {
    const logData = schema.parse(req.body);
    //@ts-expect-error: no need here
    const userId = req.user.id;
    
    // Convert date string to Date object if provided, otherwise use current date
    const logDate = logData.date ? new Date(logData.date) : new Date();
    
    // Check if log already exists for today
    const existingLog = await prisma.dailyLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: logDate
        }
      }
    });

    if (existingLog) {
      // Update existing log
      const updatedLog = await prisma.dailyLog.update({
        where: {
          id: existingLog.id
        },
        data: {
          waterIntake: logData.waterIntake,
          mood: logData.mood,
          weight: logData.weight,
          sleepHours: logData.sleepHours,
          steps: logData.steps,
          mealQuality: logData.mealQuality,
          symptoms: logData.symptoms || null
        }
      });
      
        res.status(200).json({
        message: 'Daily log updated successfully',
        log: updatedLog
      });
      return 
    } else {
      // Create new log
      const newLog = await prisma.dailyLog.create({
        data: {
          userId,
          waterIntake: logData.waterIntake,
          mood: logData.mood,
          weight: logData.weight,
          sleepHours: logData.sleepHours,
          steps: logData.steps,
          mealQuality: logData.mealQuality,
          symptoms: logData.symptoms || null,
          date: logDate
        }
      });
      
       res.status(201).json({
        message: 'Daily log created successfully',
        log: newLog
      });
      return 
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ message: 'Validation error', errors: error.errors });
       return 
    }
    console.error('Daily log error:', error);
    res.status(500).json({ message: 'Server error saving daily log' });
  }
});

// Get daily logs for a specific date range
router.get('/daily-logs', authenticateUser, async (req: Request, res: Response) => {
  try {
    //@ts-expect-error: no need here
    const userId = req.user.id;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const whereClause: any = { userId };
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate) whereClause.date.lte = endDate;
    }
    
    const logs = await prisma.dailyLog.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
    
    res.status(200).json(logs);
  } catch (error) {
    console.error('Fetch daily logs error:', error);
    res.status(500).json({ message: 'Server error fetching daily logs' });
  }
});

// Get latest daily log
router.get('/daily-log/latest', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    //@ts-expect-error: no need here
    const userId = req.user.id;
    
    const latestLog = await prisma.dailyLog.findFirst({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    
    if (!latestLog) {
       res.status(404).json({ message: 'No daily logs found' });
       return 
    }
    
    res.status(200).json(latestLog);
  } catch (error) {
    console.error('Fetch latest log error:', error);
    res.status(500).json({ message: 'Server error fetching latest log' });
  }
});

// Helper function to generate health plan based on goal (matches client-side function)
const getMockHealthPlan = (goal: string) => {
  switch (goal) {
    case 'Lose weight':
      return {
        waterIntake: '3.2L',
        sleepHours: '7-8 hours',
        exercise: '45 min cardio + 15 min strength training',
        meals: ['High-protein breakfast', 'Low-carb lunch', 'Small portion dinner'],
        tips: ['Avoid sugary drinks', 'Eat slowly', 'Take 10,000 steps daily']
      };
    case 'Improve sleep':
      return {
        waterIntake: '2.5L',
        sleepHours: '8-9 hours',
        exercise: '30 min yoga + 20 min walk',
        meals: ['Light dinner 3 hours before bed', 'Caffeine-free after 2pm'],
        tips: ['No screens 1 hour before bed', 'Keep bedroom cool and dark', 'Consistent sleep schedule']
      };
    case 'Gain muscle':
      return {
        waterIntake: '4L',
        sleepHours: '8 hours',
        exercise: '45 min weight training + 10 min core',
        meals: ['Protein-rich breakfast', 'Post-workout protein shake', 'Carb-rich dinner'],
        tips: ['Focus on progressive overload', 'Rest 48 hours between muscle groups', 'Track protein intake']
      };
    case 'Manage stress':
      return {
        waterIntake: '3L',
        sleepHours: '7-8 hours',
        exercise: '20 min meditation + 30 min walk',
        meals: ['Balanced meals rich in Omega-3', 'Avoid excessive caffeine'],
        tips: ['Practice deep breathing', 'Take regular breaks', 'Journal daily']
      };
    default:
      return {
        waterIntake: '2.5L',
        sleepHours: '7-8 hours',
        exercise: '30 min moderate activity',
        meals: ['Balanced meals', 'Regular eating schedule'],
        tips: ['Stay hydrated', 'Get enough sleep']
      };
  }
};

export default router;
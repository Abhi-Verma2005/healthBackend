// src/routes/sleepRoutes.ts
//@ts-nocheck
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { userMiddleware } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

interface SleepData {
  date?: string;
  finalScore: number;
  quality?: number;
  duration?: number;
  consistency?: number;
  environment?: number;
  habits?: number;
  dailyRecommendations?: string[];
}


router.get('/', userMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return
    }

    const { date, startDate, endDate } = req.query;
    
    // Single date query
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);

      const dailyLog = await prisma.dailyLog.findFirst({
        where: {
          userId: userId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          sleep: true
        }
      });

      res.status(200).json({ sleep: dailyLog?.sleep || null });
      return
    }
    
    // Date range query
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const dailyLogs = await prisma.dailyLog.findMany({
        where: {
          userId: userId,
          date: {
            gte: start,
            lte: end
          }
        },
        include: {
          sleep: true
        },
        orderBy: {
          date: 'asc'
        }
      });

      res.status(200).json({ 
        sleep: dailyLogs.map(log => log.sleep).filter(Boolean) 
      });
    }

    // Default: return last 7 days of sleep data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        userId: userId,
        date: {
          gte: sevenDaysAgo
        }
      },
      include: {
        sleep: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    res.status(200).json({ 
      sleep: dailyLogs.map(log => log.sleep).filter(Boolean) 
    });
  } catch (error) {
    console.error('Error fetching sleep data:', error);
    res.status(500).json({ error: 'Failed to fetch sleep data' });
  }
});

/**
 * @route GET /api/sleep/:id
 * @desc Get specific sleep entry by ID
 * @access Private
 */
router.get('/:id', userMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return
    }

    const { id } = req.params;

    const sleep = await prisma.sleep.findFirst({
      where: {
        id,
        dailyLog: {
          userId
        }
      }
    });

    if (!sleep) {
      res.status(404).json({ error: 'Sleep record not found' });
      return
    }

    res.status(200).json({ sleep });
  } catch (error) {
    console.error('Error fetching sleep data:', error);
    res.status(500).json({ error: 'Failed to fetch sleep data' });
  }
});

/**
 * @route POST /api/sleep
 * @desc Create or update sleep data
 * @access Private
 */
router.post('/', userMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return
    }

    const {
      date = new Date().toISOString(),
      finalScore,
      quality,
      duration,
      consistency,
      environment,
      habits,
      dailyRecommendations
    }: SleepData = req.body;

    if (finalScore === undefined) {
      res.status(400).json({ error: 'Sleep score is required' });
      return
    }

    // Format date to beginning of day
    const formattedDate = new Date(date);
    formattedDate.setHours(0, 0, 0, 0);

    // Find or create daily log for this date
    let dailyLog = await prisma.dailyLog.findFirst({
      where: {
        userId,
        date: {
          gte: formattedDate,
          lt: new Date(formattedDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (!dailyLog) {
      dailyLog = await prisma.dailyLog.create({
        data: {
          userId,
          date: formattedDate
        }
      });
    }

    // Check if sleep data already exists for this daily log
    const existingSleep = await prisma.sleep.findUnique({
      where: {
        dailyLogId: dailyLog.id
      }
    });

    let sleep;
    
    if (existingSleep) {
      // Update existing sleep data
      sleep = await prisma.sleep.update({
        where: {
          id: existingSleep.id
        },
        data: {
          finalScore,
          quality: quality || 0,
          duration: duration || 0,
          consistency: consistency || 0,
          environment: environment || 0,
          habits: habits || 0,
          dailyRecommndations: dailyRecommendations || []
        }
      });
    } else {
      // Create new sleep data
      sleep = await prisma.sleep.create({
        data: {
          dailyLogId: dailyLog.id,
          finalScore,
          quality: quality || 0,
          duration: duration || 0,
          consistency: consistency || 0,
          environment: environment || 0,
          habits: habits || 0,
          dailyRecommndations: dailyRecommendations || [],
          date: formattedDate
        }
      });
    }

    res.status(201).json({ 
      success: true,
      sleep 
    });
  } catch (error) {
    console.error('Error saving sleep data:', error);
    res.status(500).json({ error: 'Failed to save sleep data' });
  }
});

/**
 * @route PUT /api/sleep/:id
 * @desc Update existing sleep data
 * @access Private
 */
router.put('/:id', userMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return
    }

    const { id } = req.params;
    const {
      finalScore,
      quality,
      duration,
      consistency,
      environment,
      habits,
      dailyRecommendations
    }: SleepData = req.body;

    // Verify this sleep record belongs to the user
    const existingSleep = await prisma.sleep.findFirst({
      where: {
        id,
        dailyLog: {
          userId
        }
      }
    });

    if (!existingSleep) {
      res.status(404).json({ error: 'Sleep record not found' });
      return
    }

    // Update sleep data
    const sleep = await prisma.sleep.update({
      where: {
        id
      },
      data: {
        finalScore: finalScore !== undefined ? finalScore : existingSleep.finalScore,
        quality: quality !== undefined ? quality : existingSleep.quality,
        duration: duration !== undefined ? duration : existingSleep.duration,
        consistency: consistency !== undefined ? consistency : existingSleep.consistency,
        environment: environment !== undefined ? environment : existingSleep.environment,
        habits: habits !== undefined ? habits : existingSleep.habits,
        dailyRecommndations: dailyRecommendations || existingSleep.dailyRecommndations
      }
    });

    res.status(200).json({ 
      success: true,
      sleep 
    });
  } catch (error) {
    console.error('Error updating sleep data:', error);
    res.status(500).json({ error: 'Failed to update sleep data' });
  }
});

/**
 * @route DELETE /api/sleep/:id
 * @desc Delete sleep data
 * @access Private
 */
router.delete('/:id', userMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return
    }

    const { id } = req.params;

    // Verify this sleep record belongs to the user
    const existingSleep = await prisma.sleep.findFirst({
      where: {
        id,
        dailyLog: {
          userId
        }
      }
    });

    if (!existingSleep) {
      res.status(404).json({ error: 'Sleep record not found' });
      return
    }

    // Delete sleep data
    await prisma.sleep.delete({
      where: {
        id
      }
    });

    res.status(200).json({ 
      success: true,
      message: 'Sleep record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sleep data:', error);
    res.status(500).json({ error: 'Failed to delete sleep data' });
  }
});

export default router;
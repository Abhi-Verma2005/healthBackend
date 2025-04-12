// routes/mood.routes.js
//@ts-nocheck
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();
import {userMiddleware} from '../middlewares/auth';


router.post('/', userMiddleware, async (req, res) => {
  try {
    const { 
      moodScore, 
      categories, 
      responses, 
      questions, 
      recommendations 
    } = req.body;

    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if a daily log exists for today
    let dailyLog = await prisma.dailyLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    });

    // If no daily log exists, create one
    if (!dailyLog) {
      dailyLog = await prisma.dailyLog.create({
        data: {
          userId,
          date: today
        }
      });
    }

    // Check if mood entry already exists for this log
    const existingMood = await prisma.mood.findUnique({
      where: {
        dailyLogId: dailyLog.id
      }
    });

    let mood;
    
    if (existingMood) {
      // Update existing mood entry
      mood = await prisma.mood.update({
        where: {
          dailyLogId: dailyLog.id
        },
        data: {
          finalScore: moodScore,
          happiness: categories.Happiness,
          energy: categories.Energy,
          focus: categories.Focus,
          calm: categories.Calm,
          optimism: categories.Optimism,
          dailyRecommndations: recommendations || []
        }
      });
    } else {
      // Create new mood entry
      mood = await prisma.mood.create({
        data: {
          dailyLog: {
            connect: {
              id: dailyLog.id
            }
          },
          finalScore: moodScore,
          happiness: categories.Happiness,
          energy: categories.Energy,
          focus: categories.Focus,
          calm: categories.Calm,
          optimism: categories.Optimism,
          dailyRecommndations: recommendations || []
        }
      });
    }

    // Store responses and questions in a separate collection or as metadata
    // This is optional since it's not in your schema, but useful for detailed analysis
    // Could add a MoodResponses model if needed

    res.status(201).json({
      success: true,
      data: mood
    });
  } catch (error) {
    console.error('Error creating mood entry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/history', userMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get parameters for filtering
    const { limit = 30, offset = 0 } = req.query;
    
    // Find all mood entries for this user through daily logs
    const moodHistory = await prisma.mood.findMany({
      where: {
        dailyLog: {
          userId
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        finalScore: true,
        happiness: true,
        energy: true,
        focus: true,
        calm: true,
        optimism: true,
        date: true,
        dailyRecommndations: true
      }
    });

    res.json({
      success: true,
      count: moodHistory.length,
      data: moodHistory
    });
  } catch (error) {
    console.error('Error fetching mood history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

router.get('/latest', userMiddleware, async (req:Request, res:Response) => {
  try {
    const userId = req.user.id;
    
    // Find the latest mood entry for this user
    const latestMood = await prisma.mood.findFirst({
      where: {
        dailyLog: {
          userId
        }
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        id: true,
        finalScore: true,
        happiness: true,
        energy: true,
        focus: true,
        calm: true,
        optimism: true,
        date: true,
        dailyRecommndations: true,
        dailyLog: {
          select: {
            date: true
          }
        }
      }
    });

    if (!latestMood) {
      res.status(404).json({
        success: false,
        message: 'No mood entries found'
      });
      return
    }

    res.json({
      success: true,
      data: latestMood
    });
  } catch (error) {
    console.error('Error fetching latest mood:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/:id', userMiddleware, async (req:Request, res:Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const mood = await prisma.mood.findFirst({
      where: {
        id,
        dailyLog: {
          userId
        }
      },
      include: {
        dailyLog: true
      }
    });

    if (!mood) {
      res.status(404).json({
        success: false,
        message: 'Mood entry not found'
      });
      return
    }

    res.json({
      success: true,
      data: mood
    });
  } catch (error) {
    console.error('Error fetching mood entry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/stats/average', userMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    // Get weekly average
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyMoods = await prisma.mood.findMany({
      where: {
        dailyLog: {
          userId,
          date: {
            gte: oneWeekAgo
          }
        }
      },
      select: {
        finalScore: true,
        happiness: true,
        energy: true,
        focus: true,
        calm: true,
        optimism: true,
      }
    });
    
    // Get monthly average
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const monthlyMoods = await prisma.mood.findMany({
      where: {
        dailyLog: {
          userId,
          date: {
            gte: oneMonthAgo
          }
        }
      },
      select: {
        finalScore: true,
        happiness: true,
        energy: true,
        focus: true,
        calm: true,
        optimism: true,
      }
    });
    
    // Calculate averages
    const calculateAverages = (moodArray: any[]) => {
      if (moodArray.length === 0) return null;
      
      const sums = moodArray.reduce((acc, mood) => {
        return {
          finalScore: acc.finalScore + mood.finalScore,
          happiness: acc.happiness + mood.happiness,
          energy: acc.energy + mood.energy,
          focus: acc.focus + mood.focus,
          calm: acc.calm + mood.calm,
          optimism: acc.optimism + mood.optimism,
          count: acc.count + 1
        };
      }, { finalScore: 0, happiness: 0, energy: 0, focus: 0, calm: 0, optimism: 0, count: 0 });
      
      return {
        finalScore: Math.round(sums.finalScore / sums.count),
        happiness: Math.round(sums.happiness / sums.count),
        energy: Math.round(sums.energy / sums.count),
        focus: Math.round(sums.focus / sums.count),
        calm: Math.round(sums.calm / sums.count),
        optimism: Math.round(sums.optimism / sums.count),
        entriesCount: sums.count
      };
    };
    
    res.json({
      success: true,
      data: {
        weekly: calculateAverages(weeklyMoods),
        monthly: calculateAverages(monthlyMoods)
      }
    });
  } catch (error) {
    console.error('Error fetching mood stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router
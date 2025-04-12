// backend/src/routes/users.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { userMiddleware } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile with today's log
router.get('/profile', userMiddleware, async (req, res): Promise<void> => {
  try {
    //@ts-expect-error: no need here 
    const userId = req.user.id;
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get user with their daily log for today only
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        dailyLogs: {
          where: {
            date: {
              gte: today
            }
          },
          include: {
            nutrition: true,
            sleep: true,
            mood: true,
            water: true
          },
          orderBy: {
            date: 'desc'
          },
        }
      }
    });

    if (!user) {
       res.status(404).json({ message: 'User not found' });
       return 
    }

    // Get user stats from all logs for statistics
    const allLogs = await prisma.dailyLog.findMany({
      where: { userId },
      include: {
        nutrition: true,
        sleep: true,
        mood: true,
        water: true
      }
    });
    
    // Calculate stats
    const stats = calculateUserStats(allLogs);

    res.json({
      id: user.id,
      username: user.username,
      goal: user.goal,
      dailyLogs: user.dailyLogs,
      stats
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', userMiddleware, async (req, res): Promise<void> => {
  try {
    //@ts-expect-error: no need here
    const userId = req.user.id;
    const { username, goal, age, weight, gender, activityLevel } = req.body;

    // Validate required fields
    if (!username) {
       res.status(400).json({ message: 'Username is required' });
       return 
    }

    // Check if username is taken (if changed)
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser && existingUser.id !== userId) {
       res.status(400).json({ message: 'Username is already taken' });
       return 
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        goal
      }
    });

    // Store the user's health data in the metadata (today's log)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's log
    let todayLog = await prisma.dailyLog.findFirst({
      where: {
        userId,
        date: {
          gte: today
        }
      }
    });

    // If no log exists for today, create one
    if (!todayLog && (weight || age || gender || activityLevel)) {
      todayLog = await prisma.dailyLog.create({
        data: {
          userId,
          date: new Date()
        }
      });
    }

    // Return updated user
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      goal: updatedUser.goal
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user account
router.delete('/profile', userMiddleware, async (req, res) => {
  try {
    //@ts-expect-error: no need here
    const userId = req.user.id;

    // Delete all user data
    await prisma.$transaction([
      prisma.nutrition.deleteMany({
        where: {
          dailyLog: {
            userId
          }
        }
      }),
      prisma.sleep.deleteMany({
        where: {
          dailyLog: {
            userId
          }
        }
      }),
      prisma.mood.deleteMany({
        where: {
          dailyLog: {
            userId
          }
        }
      }),
      prisma.water.deleteMany({
        where: {
          dailyLog: {
            userId
          }
        }
      }),
      prisma.dailyLog.deleteMany({
        where: {
          userId
        }
      }),
      prisma.user.delete({
        where: {
          id: userId
        }
      })
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate user stats
//@ts-expect-error: no need here
function calculateUserStats(logs) {
  if (!logs || logs.length === 0) {
    return {
      avgSleep: 0,
      avgWater: 0,
      avgMood: 0,
      totalExerciseMinutes: 0,
      logsCount: 0
    };
  }

  let totalSleep = 0;
  let sleepLogs = 0;
  let totalWater = 0;
  let waterLogs = 0;
  let totalMood = 0;
  let moodLogs = 0;
  let exerciseMinutes = 0;
//@ts-expect-error: no need here
  logs.forEach(log => {
    if (log.sleep) {
      totalSleep += log.sleep.duration;
      sleepLogs++;
    }

    if (log.water) {
      totalWater += log.water.finalScore;
      waterLogs++;
    }

    if (log.mood) {
      totalMood += log.mood.finalScore;
      moodLogs++;
    }

    // Exercise minutes would need to be tracked in your schema
    // This is just a placeholder
  });

  return {
    avgSleep: sleepLogs > 0 ? (totalSleep / sleepLogs).toFixed(1) : 0,
    avgWater: waterLogs > 0 ? (totalWater / waterLogs).toFixed(1) : 0,
    avgMood: moodLogs > 0 ? (totalMood / moodLogs).toFixed(1) : 0,
    totalExerciseMinutes: exerciseMinutes,
    logsCount: logs.length
  };
}

export default router;
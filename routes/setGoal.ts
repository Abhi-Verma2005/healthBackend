import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { userMiddleware } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();


router.post('/daily-log', userMiddleware, async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      waterIntake: z.number().min(0, "Water intake must be a positive number"),
      mood: z.string().min(1, "Mood is required"),
      weight: z.number().min(0, "Weight must be a positive number"),
      sleepHours: z.number().min(0, "Sleep hours must be a positive number"),
      steps: z.number().int().min(0, "Steps must be a positive integer"),
      mealQuality: z.string().min(1, "Meal quality is required"),
      symptoms: z.string().optional(),
      date: z.string().optional(),
      nutritionData: z.object({
        protein: z.number().min(0),
        fats: z.number().min(0),
        carbs: z.number().min(0),
        vitamins: z.number().min(0),
        calories: z.number().min(0),
        finalScore: z.number().min(0).max(100)
      }).optional(),
      sleepData: z.object({
        quality: z.number().min(0).max(100),
        duration: z.number().min(0).max(100),
        consistency: z.number().min(0).max(100),
        environment: z.number().min(0).max(100),
        habits: z.number().min(0).max(100),
        finalScore: z.number().min(0).max(100)
      }).optional(),
      moodData: z.object({
        happiness: z.number().min(0).max(100),
        energy: z.number().min(0).max(100),
        focus: z.number().min(0).max(100),
        calm: z.number().min(0).max(100),
        optimism: z.number().min(0).max(100),
        finalScore: z.number().min(0).max(100)
      }).optional(),
      waterData: z.object({
        finalScore: z.number().min(0).max(100)
      }).optional()
    });
  
    try {
      const logData = schema.parse(req.body);
      //@ts-expect-error: no need here
      const userId = req.user.id;
      
      const logDate = logData.date ? new Date(logData.date) : new Date();
      
      const existingLog = await prisma.dailyLog.findUnique({
        where: {
          userId_date: {
            userId,
            date: logDate
          }
        }
      });
  
      // Function to generate recommendations based on health goal
      const generateRecommendations = async (category: string, score: number) => {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        // Default recommendations if no specific goal
        let recommendations = ['Stay consistent with your healthy habits'];
        
        if (user?.goal) {
          if (category === 'nutrition') {
            if (user.goal === 'Lose weight') {
              recommendations = score < 50 
                ? ['Focus on protein-rich foods', 'Reduce processed carbs', 'Include more vegetables'] 
                : ['Keep up the good work', 'Try adding more fiber to your diet'];
            } else if (user.goal === 'Gain muscle') {
              recommendations = ['Increase protein intake', 'Ensure post-workout nutrition', 'Consider healthy carbs for energy'];
            }
          } else if (category === 'sleep') {
            if (user.goal === 'Improve sleep') {
              recommendations = score < 50 
                ? ['Avoid screens before bed', 'Keep a consistent sleep schedule', 'Create a relaxing bedtime routine'] 
                : ['Continue your good sleep habits', 'Consider sleep tracking to further optimize'];
            }
          } else if (category === 'mood') {
            if (user.goal === 'Manage stress') {
              recommendations = score < 50 
                ? ['Try mindfulness meditation', 'Take short breaks during the day', 'Practice deep breathing'] 
                : ['Continue your stress management practices', 'Consider adding variety to your relaxation techniques'];
            }
          } else if (category === 'water') {
            recommendations = ['Stay hydrated throughout the day', 'Try drinking a glass of water before meals'];
          }
        }
        
        return recommendations;
      };
  
      if (existingLog) {
        // Update existing log with transaction to ensure data consistency
        const updatedLog = await prisma.$transaction(async (tx) => {
          // Update the main log
          const log = await tx.dailyLog.update({
            where: { id: existingLog.id },
            data: {}
          });
          
          // Update or create nutrition data
          if (logData.nutritionData) {
            const recommendations = await generateRecommendations('nutrition', logData.nutritionData.finalScore);
            //@ts-expect-error: no need here
            if (existingLog.nutrition) {
              await tx.nutrition.update({
                where: { dailyLogId: existingLog.id },
                data: {
                  ...logData.nutritionData,
                  dailyRecommndations: recommendations
                }
              });
            } else {
              await tx.nutrition.create({
                data: {
                  ...logData.nutritionData,
                  dailyRecommndations: recommendations,
                  dailyLogId: existingLog.id
                }
              });
            }
          }
          
          // Update or create sleep data
          if (logData.sleepData) {
            const recommendations = await generateRecommendations('sleep', logData.sleepData.finalScore);
            //@ts-expect-error: no need here
            if (existingLog.sleep) {
              await tx.sleep.update({
                where: { dailyLogId: existingLog.id },
                data: {
                  ...logData.sleepData,
                  dailyRecommndations: recommendations
                }
              });
            } else {
              await tx.sleep.create({
                data: {
                  ...logData.sleepData,
                  dailyRecommndations: recommendations,
                  dailyLogId: existingLog.id
                }
              });
            }
          }
          
          // Update or create mood data
          if (logData.moodData) {
            const recommendations = await generateRecommendations('mood', logData.moodData.finalScore);
            //@ts-expect-error: no need here
            if (existingLog.mood) {
              await tx.mood.update({
                where: { dailyLogId: existingLog.id },
                data: {
                  ...logData.moodData,
                  dailyRecommndations: recommendations
                }
              });
            } else {
              await tx.mood.create({
                data: {
                  ...logData.moodData,
                  dailyRecommndations: recommendations,
                  dailyLogId: existingLog.id
                }
              });
            }
          }
          
          // Update or create water data
          if (logData.waterData) {
            const recommendations = await generateRecommendations('water', logData.waterData.finalScore);
            //@ts-expect-error: no need here
            if (existingLog.water) {
              await tx.water.update({
                where: { dailyLogId: existingLog.id },
                data: {
                  ...logData.waterData,
                  dailyRecommndations: recommendations
                }
              });
            } else {
              await tx.water.create({
                data: {
                  ...logData.waterData,
                  dailyRecommndations: recommendations,
                  dailyLogId: existingLog.id
                }
              });
            }
          }
          
          return log;
        });
        
        res.status(200).json({
          message: 'Daily log updated successfully',
          log: updatedLog
        });
        return;
      } else {
        // Create new log with transaction to ensure data consistency
        const newLog = await prisma.$transaction(async (tx) => {
          // Create the main log first
          const log = await tx.dailyLog.create({
            data: {
              userId,
              date: logDate
            }
          });
          
          // Create nutrition data if provided
          if (logData.nutritionData) {
            const recommendations = await generateRecommendations('nutrition', logData.nutritionData.finalScore);
            await tx.nutrition.create({
              data: {
                ...logData.nutritionData,
                dailyRecommndations: recommendations,
                dailyLogId: log.id
              }
            });
          }
          
          // Create sleep data if provided
          if (logData.sleepData) {
            const recommendations = await generateRecommendations('sleep', logData.sleepData.finalScore);
            await tx.sleep.create({
              data: {
                ...logData.sleepData,
                dailyRecommndations: recommendations,
                dailyLogId: log.id
              }
            });
          }
          
          // Create mood data if provided
          if (logData.moodData) {
            const recommendations = await generateRecommendations('mood', logData.moodData.finalScore);
            await tx.mood.create({
              data: {
                ...logData.moodData,
                dailyRecommndations: recommendations,
                dailyLogId: log.id
              }
            });
          }
          
          // Create water data if provided
          if (logData.waterData) {
            const recommendations = await generateRecommendations('water', logData.waterData.finalScore);
            await tx.water.create({
              data: {
                ...logData.waterData,
                dailyRecommndations: recommendations,
                dailyLogId: log.id
              }
            });
          }
          
          return log;
        });
        
        res.status(201).json({
          message: 'Daily log created successfully',
          log: newLog
        });
        return;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
        return;
      }
      console.error('Daily log error:', error);
      res.status(500).json({ message: 'Server error saving daily log' });
    }
  });
  
  // Also modify the GET logs route to include related data
  router.get('/daily-logs', userMiddleware, async (req: Request, res: Response) => {
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
        orderBy: { date: 'desc' },
        include: {
          nutrition: true,
          sleep: true,
          mood: true,
          water: true
        }
      });
      
      res.status(200).json(logs);
    } catch (error) {
      console.error('Fetch daily logs error:', error);
      res.status(500).json({ message: 'Server error fetching daily logs' });
    }
  });
  
  // Update the GET latest log endpoint to include related data
  router.get('/daily-log/latest', userMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
      //@ts-expect-error: no need here
      const userId = req.user.id;
      
      const latestLog = await prisma.dailyLog.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        include: {
          nutrition: true,
          sleep: true,
          mood: true,
          water: true
        }
      });
      
      if (!latestLog) {
        res.status(404).json({ message: 'No daily logs found' });
        return;
      }
      
      res.status(200).json(latestLog);
    } catch (error) {
      console.error('Fetch latest log error:', error);
      res.status(500).json({ message: 'Server error fetching latest log' });
    }
  });

  export default router
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { format, subDays } from 'date-fns';
import { userMiddleware } from '../middlewares/auth';

const prisma = new PrismaClient();

// Route to fetch health scores for a user
export const getHealthScores = async (req: Request, res: Response) => {
  try {
    // Get days parameter from query (default to 7 days)
    const days = parseInt(req.query.days as string) || 7;
    
    // Get user ID from authenticated session
    //@ts-ignore
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Calculate date range for query
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    // Generate an array of all dates in the range
    const dateRange = Array.from({ length: days }, (_, i) => {
      const date = subDays(endDate, i);
      return format(date, 'yyyy-MM-dd');
    }).reverse();
    
    // Query daily logs with their related nutrition, mood, and sleep data
    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        nutrition: true,
        mood: true,
        sleep: true
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Transform data for the chart
    const healthData = dateRange.map(dateStr => {
      // Find matching log or create empty placeholder
      const matchingLog = dailyLogs.find(log => 
        format(log.date, 'yyyy-MM-dd') === dateStr
      );
      
      return {
        date: dateStr,
        nutrition: matchingLog?.nutrition?.finalScore || null,
        mood: matchingLog?.mood?.finalScore || null,
        sleep: matchingLog?.sleep?.finalScore || null
      };
    });
    
    return res.status(200).json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('Error fetching health scores:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch health scores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Register the route in your Express app
export const registerHealthRoutes = (app: any) => {
  app.get('/api/health-scores',userMiddleware, getHealthScores);
};
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { userMiddleware } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get detailed health insights for the profile page
router.get('/health-insights', userMiddleware, async (req: Request, res: Response) => {
  try {
    //@ts-expect-error: no need here
    const userId = req.user.id;
    
    // Get all logs for the user
    const logs = await prisma.dailyLog.findMany({
      where: { userId },
      include: {
        nutrition: true,
        sleep: true,
        mood: true,
        water: true
      },
      orderBy: { date: 'desc' }
    });

    // Generate time-series data for the last 7 days
    const last7Days = logs.slice(0, 7).reverse();
    
    const timeSeriesData = last7Days.map(log => {
      return {
        date: log.date,
        sleep: log.sleep?.finalScore || 0,
        mood: log.mood?.finalScore || 0,
        water: log.water?.finalScore || 0,
        nutrition: log.nutrition?.finalScore || 0
      };
    });

    // Calculate progress metrics
    const progress = calculateProgress(logs);
    
    // Get most common recommendations
    const commonRecommendations = getCommonRecommendations(logs);

    res.status(200).json({
      timeSeriesData,
      progress,
      commonRecommendations
    });
  } catch (error) {
    console.error('Error fetching health insights:', error);
    res.status(500).json({ error: 'Failed to fetch health insights' });
  }
});

// Helper function to calculate progress metrics
function calculateProgress(logs: any[]) {
  if (logs.length < 2) {
    return {
      sleep: 0,
      mood: 0,
      water: 0,
      nutrition: 0
    };
  }

  // Compare the most recent log with the previous one
  const current = logs[0];
  const previous = logs[1];

  return {
    sleep: calculatePercentageChange(
      current.sleep?.finalScore,
      previous.sleep?.finalScore
    ),
    mood: calculatePercentageChange(
      current.mood?.finalScore,
      previous.mood?.finalScore
    ),
    water: calculatePercentageChange(
      current.water?.finalScore,
      previous.water?.finalScore
    ),
    nutrition: calculatePercentageChange(
      current.nutrition?.finalScore,
      previous.nutrition?.finalScore
    )
  };
}

// Helper function to calculate percentage change
function calculatePercentageChange(current: number | undefined, previous: number | undefined): number {
  if (current === undefined || previous === undefined || previous === 0) {
    return 0;
  }
  return ((current - previous) / previous) * 100;
}

// Helper function to get common recommendations
function getCommonRecommendations(logs: any[]) {
  const recommendations: string[] = [];
  
  // Collect all recommendations from the last 3 logs
  logs.slice(0, 3).forEach(log => {
    if (log.sleep?.dailyRecommndations) {
      recommendations.push(...log.sleep.dailyRecommndations);
    }
    if (log.mood?.dailyRecommndations) {
      recommendations.push(...log.mood.dailyRecommndations);
    }
    if (log.water?.dailyRecommndations) {
      recommendations.push(...log.water.dailyRecommndations);
    }
    if (log.nutrition?.dailyRecommndations) {
      recommendations.push(...log.nutrition.dailyRecommndations);
    }
  });
  
  // Count occurrences of each recommendation
  const counts: {[key: string]: number} = {};
  recommendations.forEach(rec => {
    counts[rec] = (counts[rec] || 0) + 1;
  });
  
  // Sort by frequency and return top 5
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([recommendation]) => recommendation);
}

export default router;
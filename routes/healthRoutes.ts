// healthRoutes.ts
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { userMiddleware } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Define types
interface HealthGoalRequest {
  goal: 'Lose weight' | 'Improve sleep' | 'Gain muscle' | 'Manage stress';
  age: number;
  weight: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very active';
  symptoms?: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
  body: HealthGoalRequest;
}

interface HealthPlan {
  goal: string;
  recommendations: string[];
  dailyTasks: string[];
  metrics: {
    startingWeight: number;
    age: number;
    gender: string;
    activityLevel: string;
  };
}

/**
 * @route POST /health-goal
 * @desc Set user's health goal and profile information
 * @access Private
 */
router.post('/', userMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      goal, 
      age, 
      weight, 
      gender, 
      activityLevel, 
      symptoms 
    } = req.body;
//@ts-expect-error: no need here
    const userId = req.user.id;

    // Update user's goal
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { goal },
    });

    // Generate a personalized health plan based on inputs
    const healthPlan = generateHealthPlan(goal, age, weight, gender, activityLevel, symptoms);

    // Return success with updated user and health plan
    res.status(200).json({
      success: true,
      message: "Health goal updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        goal: updatedUser.goal
      },
      healthPlan
    });
    return 
    
  } catch (error) {
    console.error('Error setting health goal:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update health goal",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return 
  }
});

/**
 * Helper function to generate personalized health plan
 * In a real application, this would be more sophisticated
 */
function generateHealthPlan(
  goal: string, 
  age: number, 
  weight: number, 
  gender: string, 
  activityLevel: string, 
  symptoms?: string
): HealthPlan {
  let recommendations: string[] = [];
  let dailyTasks: string[] = [];
  
  // Parse symptoms if provided
  const symptomsList: string[] = symptoms ? symptoms.split(',').map(s => s.trim()) : [];
  
  // Basic logic for different goals
  switch(goal) {
    case 'Lose weight':
      recommendations = [
        "Maintain a calorie deficit of 500 calories per day",
        "Focus on protein-rich foods to maintain muscle mass",
        "Incorporate strength training 3 times per week",
        "Add 30 minutes of cardio 4-5 times per week"
      ];
      dailyTasks = [
        "Track food intake in a journal or app",
        "Drink at least 2 liters of water",
        "Get at least 7 hours of sleep",
        "Take 10,000 steps"
      ];
      break;
      
    case 'Improve sleep':
      recommendations = [
        "Establish a consistent sleep schedule",
        "Create a relaxing bedtime routine",
        "Limit screen time 1 hour before bed",
        "Optimize your bedroom environment"
      ];
      dailyTasks = [
        "Go to bed at the same time each night",
        "Avoid caffeine after 2pm",
        "Practice a 10-minute relaxation technique before sleep",
        "Keep your bedroom cool and dark"
      ];
      break;
      
    case 'Gain muscle':
      recommendations = [
        "Consume 1.6-2.2g of protein per kg of body weight",
        "Maintain a slight calorie surplus (200-300 calories)",
        "Focus on progressive overload in training",
        "Prioritize compound exercises"
      ];
      dailyTasks = [
        "Complete your strength training program",
        "Eat 3-4 protein-rich meals",
        "Get 7-9 hours of quality sleep",
        "Stay hydrated throughout the day"
      ];
      break;
      
    case 'Manage stress':
      recommendations = [
        "Practice mindfulness meditation daily",
        "Incorporate regular physical activity",
        "Establish healthy boundaries in work and relationships",
        "Consider limiting social media consumption"
      ];
      dailyTasks = [
        "Complete a 10-minute meditation session",
        "Take three 5-minute breathing breaks",
        "Get at least 30 minutes of physical activity",
        "Write down three things you're grateful for"
      ];
      break;
    
    default:
      recommendations = ["Work with a health professional to create a custom plan"];
      dailyTasks = ["Consult with your healthcare provider"];
  }
  
  // Modify recommendations based on activity level
  if (activityLevel === 'sedentary' && (goal === 'Lose weight' || goal === 'Gain muscle')) {
    recommendations.push("Start with light exercise and gradually increase intensity");
  }
  
  // Add age-specific recommendations
  if (age > 50) {
    recommendations.push("Include joint-friendly exercises like swimming or cycling");
  }
  
  // Adjust for any symptoms
  if (symptomsList.some(s => s.includes('joint pain') || s.includes('arthritis'))) {
    recommendations.push("Consider low-impact exercises like swimming, cycling, or elliptical training");
  }
  
  if (symptomsList.some(s => s.includes('insomnia') || s.includes('trouble sleeping'))) {
    recommendations.push("Limit caffeine intake, especially in the afternoon and evening");
    recommendations.push("Consider a magnesium supplement before bed (consult with a healthcare provider)");
  }
  
  return {
    goal,
    recommendations,
    dailyTasks,
    metrics: {
      startingWeight: weight,
      age,
      gender,
      activityLevel
    }
  };
}

export default router;
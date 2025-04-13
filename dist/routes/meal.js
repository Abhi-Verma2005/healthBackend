"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/nutritionRoutes.ts
//@ts-nocheck
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get all nutrition logs for a user
router.get('/logs', auth_1.userMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const nutritionLogs = await prisma.dailyLog.findMany({
            where: {
                userId: userId,
            },
            include: {
                nutrition: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
        res.json(nutritionLogs);
    }
    catch (error) {
        console.error('Error fetching nutrition logs:', error);
        res.status(500).json({ error: 'Failed to fetch nutrition logs' });
    }
});
// Get a specific nutrition log
router.get('/logs/:id', auth_1.userMiddleware, async (req, res) => {
    try {
        const logId = req.params.id;
        const userId = req.user.id;
        const nutritionLog = await prisma.dailyLog.findFirst({
            where: {
                id: logId,
                userId: userId,
            },
            include: {
                nutrition: true,
            },
        });
        if (!nutritionLog) {
            res.status(404).json({ error: 'Nutrition log not found' });
            return;
        }
        res.json(nutritionLog);
    }
    catch (error) {
        console.error('Error fetching nutrition log:', error);
        res.status(500).json({ error: 'Failed to fetch nutrition log' });
    }
});
// Add a new meal entry
router.post('/meal', auth_1.userMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { mealType, mealTime, mealDescription, score, calories, analysis, recommendations, protein, carbs, fats, vitamins } = req.body;
        // Get today's date without time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Find or create a daily log for today
        let dailyLog = await prisma.dailyLog.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                },
            },
            include: {
                nutrition: true,
            },
        });
        if (!dailyLog) {
            // Create a new daily log for today
            dailyLog = await prisma.dailyLog.create({
                data: {
                    userId,
                    date: today,
                },
                include: {
                    nutrition: true,
                },
            });
        }
        // Create or update nutrition entry
        if (dailyLog.nutrition) {
            // Update existing nutrition record
            const updatedNutrition = await prisma.nutrition.update({
                where: {
                    dailyLogId: dailyLog.id,
                },
                data: {
                    finalScore: score,
                    protein,
                    carbs,
                    fats,
                    vitamins,
                    calories,
                    dailyRecommndations: recommendations,
                },
            });
            res.json({
                message: 'Meal entry added successfully',
                dailyLog: { ...dailyLog, nutrition: updatedNutrition }
            });
        }
        else {
            // Create new nutrition record
            const newNutrition = await prisma.nutrition.create({
                data: {
                    dailyLogId: dailyLog.id,
                    finalScore: score,
                    protein,
                    carbs,
                    fats,
                    vitamins,
                    calories,
                    dailyRecommndations: recommendations,
                },
            });
            res.json({
                message: 'Meal entry added successfully',
                dailyLog: { ...dailyLog, nutrition: newNutrition }
            });
        }
        // Also store individual meal entries in a separate table for history
        // This requires creating a new model in Prisma schema
    }
    catch (error) {
        console.error('Error adding meal entry:', error);
        res.status(500).json({ error: 'Failed to add meal entry' });
    }
});
// Get nutrition statistics
router.get('/stats', auth_1.userMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 7;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        const stats = await prisma.dailyLog.findMany({
            where: {
                userId: userId,
                date: {
                    gte: fromDate,
                },
            },
            include: {
                nutrition: true,
            },
            orderBy: {
                date: 'asc',
            },
        });
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching nutrition stats:', error);
        res.status(500).json({ error: 'Failed to fetch nutrition statistics' });
    }
});
exports.default = router;

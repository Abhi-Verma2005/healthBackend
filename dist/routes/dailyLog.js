"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Middleware to extract user from token
router.use(auth_1.userMiddleware);
// Validate and sanitize input
const validateDailyLog = [
    (0, express_validator_1.body)('waterIntake').isFloat({ min: 0 }).withMessage('Water intake must be a positive number'),
    (0, express_validator_1.body)('mood').isString().notEmpty().withMessage('Mood is required'),
    (0, express_validator_1.body)('weight').isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
    (0, express_validator_1.body)('sleepHours').isFloat({ min: 0 }).withMessage('Sleep hours must be a positive number'),
    (0, express_validator_1.body)('steps').isInt({ min: 0 }).withMessage('Steps must be a positive integer'),
    (0, express_validator_1.body)('mealQuality').isString().notEmpty().withMessage('Meal quality is required'),
    (0, express_validator_1.body)('symptoms').optional().isString(),
];
// POST: Create or update today's log
router.post('/', validateDailyLog, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { waterIntake, mood, weight, sleepHours, steps, mealQuality, symptoms } = req.body;
        //@ts-expect-error: not needed here
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
        // const dailyLog = existingLog 
        //   ? await prisma.dailyLog.update({
        //       where: { id: existingLog.id },
        //       data: {
        //         waterIntake,
        //         mood,
        //         weight,
        //         sleepHours,
        //         steps,
        //         mealQuality,
        //         symptoms: symptoms || null,
        //       }
        //     })
        //   : await prisma.dailyLog.create({
        //       data: {
        //         userId,
        //         waterIntake,
        //         mood,
        //         weight,
        //         sleepHours,
        //         steps,
        //         mealQuality,
        //         symptoms: symptoms || null,
        //       }
        //     });
        res.status(201).json({
            success: true,
            //   data: dailyLog
        });
    }
    catch (error) {
        console.error('Error creating daily log:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});
// GET: Get today's log for the user
router.get('/today', async (req, res) => {
    try {
        //@ts-expect-error: no need here
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
            res.status(203).json({
                success: false,
                message: 'No log found for today'
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: dailyLog
        });
    }
    catch (error) {
        console.error('Error fetching daily log:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});
// GET: Get logs for the past 7 days
router.get('/weekly', async (req, res) => {
    try {
        //@ts-expect-error: no need here
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
    }
    catch (error) {
        console.error('Error fetching weekly logs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});
exports.default = router;

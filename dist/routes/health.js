"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHealthRoutes = exports.getHealthScores = void 0;
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const auth_1 = require("../middlewares/auth");
const prisma = new client_1.PrismaClient();
// Route to fetch health scores for a user
const getHealthScores = async (req, res) => {
    try {
        // Get days parameter from query (default to 7 days)
        const days = parseInt(req.query.days) || 7;
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
        const startDate = (0, date_fns_1.subDays)(endDate, days - 1);
        // Generate an array of all dates in the range
        const dateRange = Array.from({ length: days }, (_, i) => {
            const date = (0, date_fns_1.subDays)(endDate, i);
            return (0, date_fns_1.format)(date, 'yyyy-MM-dd');
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
            const matchingLog = dailyLogs.find(log => (0, date_fns_1.format)(log.date, 'yyyy-MM-dd') === dateStr);
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
    }
    catch (error) {
        console.error('Error fetching health scores:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch health scores',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getHealthScores = getHealthScores;
// Register the route in your Express app
const registerHealthRoutes = (app) => {
    app.get('/api/health-scores', auth_1.userMiddleware, exports.getHealthScores);
};
exports.registerHealthRoutes = registerHealthRoutes;

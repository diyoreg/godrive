const express = require('express');
const router = express.Router();
const UserStats = require('../models/UserStats');
const { authenticateToken } = require('../middleware/auth');

// Получить статистику текущего пользователя
router.get('/', authenticateToken, async (req, res) => {
    try {
        const stats = await UserStats.getByUserId(req.user.id);
        
        // Получаем дату регистрации из req.user (которая устанавливается в middleware auth)
        const joinDate = req.user.created_at;
        const daysSinceJoin = UserStats.getDaysSinceJoin(joinDate);
        
        res.json({
            success: true,
            data: {
                timeSpent: stats.time_spent_seconds,
                timeSpentFormatted: UserStats.formatTime(stats.time_spent_seconds),
                totalQuestionsAnswered: stats.total_questions_answered,
                correctAnswers: stats.correct_answers,
                accuracy: UserStats.getAccuracy(stats.correct_answers, stats.total_questions_answered),
                daysSinceJoin: daysSinceJoin,
                joinDate: joinDate
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики'
        });
    }
});

// Обновить время
router.post('/time', authenticateToken, async (req, res) => {
    try {
        const { seconds } = req.body;
        
        if (!seconds || seconds <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Некорректное значение времени'
            });
        }
        
        const stats = await UserStats.addTime(req.user.id, seconds);
        
        res.json({
            success: true,
            data: {
                timeSpent: stats.time_spent_seconds,
                timeSpentFormatted: UserStats.formatTime(stats.time_spent_seconds)
            }
        });
    } catch (error) {
        console.error('Ошибка обновления времени:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка обновления времени'
        });
    }
});

// Обновить статистику ответов
router.post('/answers', authenticateToken, async (req, res) => {
    try {
        const { totalAnswered, correctAnswers } = req.body;
        
        if (totalAnswered === undefined || correctAnswers === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Некорректные данные ответов'
            });
        }
        
        const stats = await UserStats.addAnswers(req.user.id, totalAnswered, correctAnswers);
        
        res.json({
            success: true,
            data: {
                totalQuestionsAnswered: stats.total_questions_answered,
                correctAnswers: stats.correct_answers,
                accuracy: UserStats.getAccuracy(stats.correct_answers, stats.total_questions_answered)
            }
        });
    } catch (error) {
        console.error('Ошибка обновления ответов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка обновления ответов'
        });
    }
});

// Обновить все данные одновременно
router.post('/update', authenticateToken, async (req, res) => {
    try {
        const { timeSeconds, totalAnswered, correctAnswers } = req.body;
        
        if (timeSeconds === undefined || totalAnswered === undefined || correctAnswers === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Некорректные данные'
            });
        }
        
        const stats = await UserStats.updateAll(
            req.user.id, 
            timeSeconds, 
            totalAnswered, 
            correctAnswers
        );
        
        res.json({
            success: true,
            data: {
                timeSpent: stats.time_spent_seconds,
                timeSpentFormatted: UserStats.formatTime(stats.time_spent_seconds),
                totalQuestionsAnswered: stats.total_questions_answered,
                correctAnswers: stats.correct_answers,
                accuracy: UserStats.getAccuracy(stats.correct_answers, stats.total_questions_answered)
            }
        });
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка обновления статистики'
        });
    }
});

module.exports = router;

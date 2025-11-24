const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const { authenticateToken } = require('../middleware/auth');

// GET /api/progress - Получение прогресса текущего пользователя
router.get('/', authenticateToken, async (req, res) => {
    try {
        const progress = await Progress.getByUser(req.user.id);
        const stats = await Progress.getUserStats(req.user.id);
        const completedTickets = await Progress.getCompletedTickets(req.user.id);
        const inProgressTickets = await Progress.getInProgressTickets(req.user.id);
        
        res.json({
            success: true,
            data: {
                progress: progress.map(p => p.toObject()),
                stats,
                completedTickets,
                inProgressTickets
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения прогресса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении прогресса'
        });
    }
});

// GET /api/progress/ticket/:id - Получение прогресса по конкретному билету
router.get('/ticket/:id', authenticateToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        
        if (isNaN(ticketId) || ticketId < 1 || ticketId > 113) {
            return res.status(400).json({
                success: false,
                message: 'Неверный номер билета (должен быть от 1 до 113)'
            });
        }
        
        const progress = await Progress.getByUserAndTicket(req.user.id, ticketId);
        
        res.json({
            success: true,
            data: {
                progress: progress ? progress.toObject() : null,
                ticketId
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения прогресса билета:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении прогресса билета'
        });
    }
});

// POST /api/progress/ticket/:id - Сохранение прогресса по билету
router.post('/ticket/:id', authenticateToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { completed, score, answers, totalQuestions } = req.body;
        
        if (isNaN(ticketId) || ticketId < 1 || ticketId > 113) {
            return res.status(400).json({
                success: false,
                message: 'Неверный номер билета (должен быть от 1 до 113)'
            });
        }
        
        // Валидация данных
        if (typeof completed !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Поле completed должно быть булевым значением'
            });
        }
        
        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({
                success: false,
                message: 'Поле score должно быть положительным числом'
            });
        }
        
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Поле answers должно быть объектом'
            });
        }
        
        const progressData = {
            completed,
            score,
            answers,
            totalQuestions: totalQuestions || 10
        };
        
        const savedProgress = await Progress.saveProgress(req.user.id, ticketId, progressData);
        
        res.json({
            success: true,
            message: completed ? 'Билет завершен' : 'Прогресс сохранен',
            data: {
                progress: savedProgress.toObject()
            }
        });
        
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при сохранении прогресса'
        });
    }
});

// DELETE /api/progress/ticket/:id - Удаление прогресса по билету
router.delete('/ticket/:id', authenticateToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        
        if (isNaN(ticketId) || ticketId < 1 || ticketId > 113) {
            return res.status(400).json({
                success: false,
                message: 'Неверный номер билета (должен быть от 1 до 113)'
            });
        }
        
        const deleted = await Progress.deleteTicketProgress(req.user.id, ticketId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Прогресс по данному билету не найден'
            });
        }
        
        res.json({
            success: true,
            message: 'Прогресс по билету удален'
        });
        
    } catch (error) {
        console.error('Ошибка удаления прогресса билета:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при удалении прогресса билета'
        });
    }
});

// GET /api/progress/stats - Получение статистики пользователя
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await Progress.getUserStats(req.user.id);
        
        res.json({
            success: true,
            data: {
                stats
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении статистики'
        });
    }
});

// DELETE /api/progress - Очистка всего прогресса пользователя
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const clearedCount = await Progress.clearAllProgress(req.user.id);
        
        res.json({
            success: true,
            message: `Весь прогресс очищен (${clearedCount} записей)`,
            data: {
                clearedRecords: clearedCount
            }
        });
        
    } catch (error) {
        console.error('Ошибка очистки прогресса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при очистке прогресса'
        });
    }
});

// GET /api/progress/completed - Получение завершенных билетов
router.get('/completed', authenticateToken, async (req, res) => {
    try {
        const completedTickets = await Progress.getCompletedTickets(req.user.id);
        
        res.json({
            success: true,
            data: {
                completedTickets
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения завершенных билетов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении завершенных билетов'
        });
    }
});

module.exports = router;
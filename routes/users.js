const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Progress = require('../models/Progress');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/users - Получение списка всех пользователей (только для админов)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll();
        
        res.json({
            success: true,
            data: {
                users: users.map(user => user.toSafeObject())
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении списка пользователей'
        });
    }
});

// GET /api/users/:id - Получение конкретного пользователя (только для админов)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный ID пользователя'
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        // Получаем статистику пользователя
        const stats = await Progress.getUserStats(userId);
        const settings = await user.getSettings();
        
        res.json({
            success: true,
            data: {
                user: user.toSafeObject(),
                stats,
                settings
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении пользователя'
        });
    }
});

// POST /api/users - Создание нового пользователя (только для админов)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        if (!username || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо заполнить все поля: логин, пароль и имя'
            });
        }
        
        // Проверяем уникальность логина
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Пользователь с таким логином уже существует'
            });
        }
        
        // Создаем пользователя
        const newUser = await User.create({
            username: username.trim(),
            password,
            name: name.trim(),
            role: 'user'
        });
        
        res.status(201).json({
            success: true,
            message: 'Пользователь успешно создан',
            data: {
                user: newUser.toSafeObject()
            }
        });
        
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при создании пользователя'
        });
    }
});

// PUT /api/users/:id - Обновление пользователя (только для админов)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { name } = req.body;
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный ID пользователя'
            });
        }
        
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Имя пользователя обязательно для заполнения'
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        await user.updateProfile({ name: name.trim() });
        
        res.json({
            success: true,
            message: 'Пользователь успешно обновлен',
            data: {
                user: user.toSafeObject()
            }
        });
        
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при обновлении пользователя'
        });
    }
});

// DELETE /api/users/:id - Удаление пользователя (только для админов)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный ID пользователя'
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        // Проверяем, что это не администратор
        if (user.username === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Нельзя удалить аккаунт администратора'
            });
        }
        
        const deleted = await User.delete(userId);
        
        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Не удалось удалить пользователя'
            });
        }
        
        res.json({
            success: true,
            message: 'Пользователь успешно удален'
        });
        
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при удалении пользователя'
        });
    }
});

// GET /api/users/:id/progress - Получение прогресса пользователя (только для админов)
router.get('/:id/progress', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный ID пользователя'
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const progress = await Progress.getByUser(userId);
        const stats = await Progress.getUserStats(userId);
        const completedTickets = await Progress.getCompletedTickets(userId);
        
        res.json({
            success: true,
            data: {
                user: user.toSafeObject(),
                progress: progress.map(p => p.toObject()),
                stats,
                completedTickets
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения прогресса пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении прогресса пользователя'
        });
    }
});

// DELETE /api/users/:id/progress - Очистка прогресса пользователя (только для админов)
router.delete('/:id/progress', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный ID пользователя'
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const clearedCount = await Progress.clearAllProgress(userId);
        
        res.json({
            success: true,
            message: `Очищен прогресс по ${clearedCount} билетам`,
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

module.exports = router;
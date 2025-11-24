const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login - Вход в систему
router.post('/login', async (req, res) => {
    try {
        console.log('🔐 Получен запрос на вход:', { 
            body: req.body, 
            username: req.body?.username, 
            passwordLength: req.body?.password?.length 
        });
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('❌ Отсутствуют данные для входа');
            return res.status(400).json({
                success: false,
                message: 'Необходимо указать логин и пароль'
            });
        }
        
        // Аутентификация пользователя
        const user = await User.authenticate(username, password);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }
        
        // Генерация JWT токена
        const token = generateToken(user);
        
        // Получаем настройки пользователя
        const settings = await user.getSettings();
        
        res.json({
            success: true,
            message: 'Успешная авторизация',
            data: {
                token,
                user: user.toSafeObject(),
                settings
            }
        });
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при входе'
        });
    }
});

// POST /api/auth/register - Регистрация (только для админов)
router.post('/register', authenticateToken, async (req, res) => {
    try {
        // Проверяем права администратора
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }
        
        const { username, password, name } = req.body;
        
        if (!username || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо заполнить все поля'
            });
        }
        
        // Проверяем, что пользователь не существует
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Пользователь с таким логином уже существует'
            });
        }
        
        // Создаем нового пользователя
        const newUser = await User.create({
            username,
            password,
            name,
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
        console.error('Ошибка регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при создании пользователя'
        });
    }
});

// GET /api/auth/profile - Получение профиля текущего пользователя
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const settings = await req.user.getSettings();
        
        res.json({
            success: true,
            data: {
                user: req.user.toSafeObject(),
                settings
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении профиля'
        });
    }
});

// PUT /api/auth/profile - Обновление профиля
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Имя пользователя обязательно для заполнения'
            });
        }
        
        await req.user.updateProfile({ name: name.trim() });
        
        res.json({
            success: true,
            message: 'Профиль успешно обновлен',
            data: {
                user: req.user.toSafeObject()
            }
        });
        
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при обновлении профиля'
        });
    }
});

// PUT /api/auth/settings - Обновление настроек пользователя
router.put('/settings', authenticateToken, async (req, res) => {
    try {
        const { language, notifications } = req.body;
        
        // Валидация языка
        const validLanguages = ['ru', 'uz', 'uzk'];
        if (language && !validLanguages.includes(language)) {
            return res.status(400).json({
                success: false,
                message: 'Недопустимый язык'
            });
        }
        
        const settingsData = {};
        if (language) settingsData.language = language;
        if (typeof notifications === 'boolean') settingsData.notifications = notifications;
        
        const updatedSettings = await req.user.updateSettings(settingsData);
        
        res.json({
            success: true,
            message: 'Настройки успешно обновлены',
            data: {
                settings: updatedSettings
            }
        });
        
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при обновлении настроек'
        });
    }
});

// POST /api/auth/clear-data - Очистка данных пользователя
router.post('/clear-data', authenticateToken, async (req, res) => {
    try {
        await req.user.clearUserData();
        
        res.json({
            success: true,
            message: 'Данные пользователя успешно очищены'
        });
        
    } catch (error) {
        console.error('Ошибка очистки данных:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при очистке данных'
        });
    }
});

// GET /api/auth/verify - Проверка действительности токена
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Токен действителен',
        data: {
            user: req.user.toSafeObject()
        }
    });
});

module.exports = router;
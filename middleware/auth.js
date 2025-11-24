const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Секретный ключ для JWT (в продакшене должен быть в переменных окружения)
const JWT_SECRET = process.env.JWT_SECRET || 'godrive_secret_key_2024_uzbekistan';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Middleware для аутентификации
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Токен доступа не предоставлен' 
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Получаем пользователя из БД
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        // Добавляем пользователя в req для использования в следующих middleware
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Ошибка аутентификации:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Токен истек' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Недействительный токен' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера аутентификации' 
        });
    }
};

// Middleware для проверки роли администратора
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Необходима аутентификация' 
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Доступ запрещен. Требуются права администратора' 
        });
    }
    
    next();
};

// Функция генерации JWT токена
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Функция проверки токена (для использования вне middleware)
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    generateToken,
    verifyToken,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
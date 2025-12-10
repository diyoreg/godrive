const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/favorites
 * @desc    Получить список избранных вопросов пользователя
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
    console.log(`📂 Запрос избранных вопросов для пользователя ${req.user.id}`);
    
    try {
        const result = await pool.query(
            'SELECT favorites FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const favorites = result.rows[0].favorites || [];
        
        console.log(`✅ Найдено ${favorites.length} избранных вопросов`);
        
        res.json({
            success: true,
            favorites: favorites,
            count: favorites.length
        });
    } catch (error) {
        console.error('❌ Ошибка получения избранного:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения избранных вопросов'
        });
    }
});

/**
 * @route   POST /api/favorites
 * @desc    Добавить вопрос в избранное
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
    const { questionId } = req.body;
    
    console.log(`⭐ Добавление вопроса ${questionId} в избранное для пользователя ${req.user.id}`);
    
    try {
        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: 'Не указан ID вопроса'
            });
        }
        
        // Проверяем, не добавлен ли уже вопрос
        const checkResult = await pool.query(
            'SELECT favorites FROM users WHERE id = $1',
            [req.user.id]
        );
        
        const currentFavorites = checkResult.rows[0]?.favorites || [];
        
        if (currentFavorites.includes(questionId)) {
            return res.json({
                success: true,
                message: 'Вопрос уже в избранном',
                favorites: currentFavorites
            });
        }
        
        // Добавляем вопрос в массив
        const result = await pool.query(
            `UPDATE users 
             SET favorites = COALESCE(favorites, '[]'::jsonb) || $1::jsonb 
             WHERE id = $2 
             RETURNING favorites`,
            [JSON.stringify(questionId), req.user.id]
        );
        
        const updatedFavorites = result.rows[0].favorites || [];
        
        console.log(`✅ Вопрос добавлен. Всего избранных: ${updatedFavorites.length}`);
        
        res.json({
            success: true,
            message: 'Вопрос добавлен в избранное',
            favorites: updatedFavorites,
            count: updatedFavorites.length
        });
    } catch (error) {
        console.error('❌ Ошибка добавления в избранное:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка добавления в избранное'
        });
    }
});

/**
 * @route   DELETE /api/favorites
 * @desc    Удалить вопрос из избранного
 * @access  Private
 */
router.delete('/', authenticateToken, async (req, res) => {
    const { questionId } = req.body;
    
    console.log(`🗑️ Удаление вопроса ${questionId} из избранного для пользователя ${req.user.id}`);
    
    try {
        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: 'Не указан ID вопроса'
            });
        }
        
        // Удаляем вопрос из массива
        const result = await pool.query(
            `UPDATE users 
             SET favorites = (
                 SELECT jsonb_agg(elem)
                 FROM jsonb_array_elements(COALESCE(favorites, '[]'::jsonb)) elem
                 WHERE elem::text::int != $1
             )
             WHERE id = $2 
             RETURNING favorites`,
            [questionId, req.user.id]
        );
        
        const updatedFavorites = result.rows[0]?.favorites || [];
        
        console.log(`✅ Вопрос удален. Осталось избранных: ${updatedFavorites.length}`);
        
        res.json({
            success: true,
            message: 'Вопрос удален из избранного',
            favorites: updatedFavorites,
            count: updatedFavorites.length
        });
    } catch (error) {
        console.error('❌ Ошибка удаления из избранного:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления из избранного'
        });
    }
});

/**
 * @route   DELETE /api/favorites/clear
 * @desc    Очистить все избранные вопросы
 * @access  Private
 */
router.delete('/clear', authenticateToken, async (req, res) => {
    console.log(`🗑️ Очистка всех избранных вопросов для пользователя ${req.user.id}`);
    
    try {
        await pool.query(
            `UPDATE users SET favorites = '[]'::jsonb WHERE id = $1`,
            [req.user.id]
        );
        
        console.log('✅ Все избранные вопросы удалены');
        
        res.json({
            success: true,
            message: 'Все избранные вопросы удалены',
            favorites: [],
            count: 0
        });
    } catch (error) {
        console.error('❌ Ошибка очистки избранного:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка очистки избранного'
        });
    }
});

module.exports = router;

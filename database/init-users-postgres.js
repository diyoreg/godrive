const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'questions',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function initializeUsers() {
    const client = await pool.connect();
    
    try {
        console.log('👥 Инициализация пользователей в PostgreSQL...');
        
        // Проверяем, есть ли уже пользователи
        const existingUsers = await client.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(existingUsers.rows[0].count);
        
        if (userCount > 0) {
            console.log(`⚠️  Найдено ${userCount} пользователей. Пропускаем инициализацию.`);
            return;
        }
        
        // Хешируем пароли
        const adminPasswordHash = await bcrypt.hash('admin', 10);
        const userPasswordHash = await bcrypt.hash('user', 10);
        
        // Создаем администратора
        const adminResult = await client.query(`
            INSERT INTO users (username, password, name, email, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, ['admin', adminPasswordHash, 'Администратор', 'admin@godrive.uz', 'admin']);
        
        const adminId = adminResult.rows[0].id;
        console.log(`✅ Администратор создан (ID: ${adminId})`);
        
        // Создаем настройки для администратора
        await client.query(`
            INSERT INTO user_settings (user_id, language, notifications)
            VALUES ($1, $2, $3)
        `, [adminId, 'ru', true]);
        
        // Создаем тестового пользователя
        const userResult = await client.query(`
            INSERT INTO users (username, password, name, email, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, ['user', userPasswordHash, 'Тестовый пользователь', 'user@godrive.uz', 'user']);
        
        const userId = userResult.rows[0].id;
        console.log(`✅ Пользователь user создан (ID: ${userId})`);
        
        // Создаем настройки для пользователя
        await client.query(`
            INSERT INTO user_settings (user_id, language, notifications)
            VALUES ($1, $2, $3)
        `, [userId, 'uz', true]);
        
        console.log('🎉 Инициализация пользователей завершена!');
        console.log('\n📋 Учетные данные:');
        console.log('   👤 admin / admin (Администратор)');
        console.log('   👤 user / user (Пользователь)');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации пользователей:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Запуск
initializeUsers()
    .then(() => {
        console.log('\n✅ Скрипт выполнен успешно');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Ошибка выполнения скрипта:', error);
        process.exit(1);
    });

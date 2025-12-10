const pool = require('./connection');

async function checkFavorites() {
    console.log('🔍 Проверка избранных вопросов в базе данных...\n');
    
    try {
        // Получаем всех пользователей с избранными
        const result = await pool.query(`
            SELECT id, username, favorites 
            FROM users 
            WHERE favorites IS NOT NULL AND jsonb_array_length(favorites) > 0
        `);
        
        console.log(`Найдено пользователей с избранными: ${result.rows.length}\n`);
        
        result.rows.forEach(user => {
            console.log(`👤 Пользователь: ${user.username} (ID: ${user.id})`);
            console.log(`   Избранные: ${JSON.stringify(user.favorites)}`);
            console.log(`   Количество: ${user.favorites.length}`);
            
            // Проверяем формат ID
            user.favorites.forEach(id => {
                const filename = `q${String(id).padStart(4, '0')}.json`;
                console.log(`   → ID ${id} → файл ${filename}`);
            });
            console.log('');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

checkFavorites();

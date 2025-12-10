const pool = require('./connection');

async function addFavoritesColumn() {
    console.log('🔧 Добавление колонки favorites в таблицу users...\n');
    
    try {
        // Проверяем, существует ли колонка
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'favorites'
        `;
        
        const checkResult = await pool.query(checkQuery);
        
        if (checkResult.rows.length > 0) {
            console.log('✅ Колонка favorites уже существует');
            process.exit(0);
        }
        
        console.log('📝 Колонка не найдена, добавляем...');
        
        // Добавляем колонку
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN favorites JSONB DEFAULT '[]'::jsonb
        `);
        
        console.log('✅ Колонка favorites добавлена');
        
        // Создаем индекс
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_favorites 
            ON users USING GIN (favorites)
        `);
        
        console.log('✅ Индекс создан');
        
        // Проверяем результат
        const verifyResult = await pool.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'favorites'
        `);
        
        console.log('\n📋 Результат:');
        console.log(verifyResult.rows[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

addFavoritesColumn();

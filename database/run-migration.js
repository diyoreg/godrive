const pool = require('./connection');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    console.log('🚀 Запуск миграции: добавление колонки favorites...\n');
    
    try {
        // Читаем SQL файл миграции
        const migrationPath = path.join(__dirname, 'migrations', '001_add_favorites.sql');
        const sql = await fs.readFile(migrationPath, 'utf-8');
        
        // Удаляем комментарии и пустые строки
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));
        
        // Выполняем каждый SQL оператор
        for (const statement of statements) {
            if (statement) {
                console.log(`📝 Выполнение: ${statement.substring(0, 80)}...`);
                await pool.query(statement);
            }
        }
        
        console.log('\n✅ Миграция успешно выполнена!');
        console.log('📊 Колонка favorites добавлена в таблицу users');
        
        // Проверяем результат
        const result = await pool.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'favorites'
        `);
        
        if (result.rows.length > 0) {
            console.log('\n📋 Информация о колонке:');
            console.log(result.rows[0]);
        }
        
        // Проверяем индекс
        const indexResult = await pool.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'users' AND indexname = 'idx_users_favorites'
        `);
        
        if (indexResult.rows.length > 0) {
            console.log('\n🔍 Индекс создан:');
            console.log(indexResult.rows[0].indexdef);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Ошибка при выполнении миграции:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Запускаем миграцию
runMigration();

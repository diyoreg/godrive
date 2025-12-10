const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'questions',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD
});

async function checkProgress() {
    try {
        const result = await pool.query(`
            SELECT ticket_id, completed, score, total_questions, answers 
            FROM user_progress 
            ORDER BY ticket_id
        `);
        
        console.log('📊 Детальный анализ билетов:\n');
        
        let completedTrueCount = 0;
        let withAnswersCount = 0;
        let shouldBeColoredCount = 0;
        const shouldBeColoredTickets = [];
        
        result.rows.forEach(row => {
            const answersCount = row.answers ? Object.keys(row.answers).length : 0;
            const hasAnswers = answersCount > 0;
            const shouldBeColored = row.completed || hasAnswers;
            const percentage = Math.round((row.score / row.total_questions) * 100);
            
            if (row.completed) completedTrueCount++;
            if (hasAnswers) withAnswersCount++;
            if (shouldBeColored) {
                shouldBeColoredCount++;
                shouldBeColoredTickets.push(row.ticket_id);
            }
            
            console.log(`Билет ${row.ticket_id}:`);
            console.log(`  completed=${row.completed}`);
            console.log(`  score=${row.score}/${row.total_questions} (${percentage}%)`);
            console.log(`  answers=${answersCount}`);
            console.log(`  shouldBeColored=${shouldBeColored}`);
            console.log('');
        });
        
        console.log('📊 Итого:');
        console.log(`  Всего записей в БД: ${result.rows.length}`);
        console.log(`  completed=true: ${completedTrueCount}`);
        console.log(`  С ответами (answers > 0): ${withAnswersCount}`);
        console.log(`  Должны быть цветными (completed=true ИЛИ answers > 0): ${shouldBeColoredCount}`);
        console.log(`\n📋 Список цветных билетов: [${shouldBeColoredTickets.join(', ')}]`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        await pool.end();
    }
}

checkProgress();

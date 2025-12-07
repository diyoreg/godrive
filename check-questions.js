const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, 'data', 'questions');
const errorsDir = path.join(__dirname, 'data', 'errors');
const outputFile = path.join(__dirname, 'question-errors.txt');

const errors = [];

// Создаем папку errors если её нет
if (!fs.existsSync(errorsDir)) {
    fs.mkdirSync(errorsDir, { recursive: true });
    console.log('📁 Создана папка: data/errors\n');
}

// Проверка всех вопросов
for (let i = 1; i <= 1130; i++) {
    const filename = `q${String(i).padStart(4, '0')}.json`;
    const filepath = path.join(questionsDir, filename);
    
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        const question = JSON.parse(data);
        
        const issues = [];
        
        // Проверка текста вопроса
        const languages = ['uz', 'ru', 'uzk'];
        const missingText = [];
        
        languages.forEach(lang => {
            const translation = question.translations[lang];
            if (!translation) {
                issues.push(`❌ Отсутствует перевод для языка: ${lang}`);
                return;
            }
            
            if (translation.text === "Текст вопроса не найден" || 
                translation.text === "" || 
                !translation.text) {
                missingText.push(lang);
            }
        });
        
        if (missingText.length > 0) {
            issues.push(`❌ Текст вопроса не найден на языках: ${missingText.join(', ')}`);
        }
        
        // Проверка количества ответов
        const optionsCounts = {};
        languages.forEach(lang => {
            const translation = question.translations[lang];
            if (translation && translation.options) {
                optionsCounts[lang] = translation.options.length;
            } else {
                optionsCounts[lang] = 0;
            }
        });
        
        // Проверка на пустые списки ответов
        const emptyOptions = [];
        Object.entries(optionsCounts).forEach(([lang, count]) => {
            if (count === 0) {
                emptyOptions.push(lang);
            }
        });
        
        if (emptyOptions.length > 0) {
            issues.push(`❌ Пустой список ответов на языках: ${emptyOptions.join(', ')}`);
        }
        
        // Проверка на разное количество ответов
        const counts = Object.values(optionsCounts);
        const allSame = counts.every(count => count === counts[0]);
        
        if (!allSame && emptyOptions.length === 0) {
            issues.push(`❌ Разное количество ответов: uz=${optionsCounts.uz}, ru=${optionsCounts.ru}, uzk=${optionsCounts.uzk}`);
        }
        
        // Проверка correctAnswer
        languages.forEach(lang => {
            const translation = question.translations[lang];
            if (translation) {
                const correctAnswer = translation.correctAnswer;
                const optionsCount = translation.options ? translation.options.length : 0;
                
                if (!correctAnswer || correctAnswer < 1 || correctAnswer > optionsCount) {
                    issues.push(`❌ Некорректный correctAnswer для ${lang}: ${correctAnswer} (всего вариантов: ${optionsCount})`);
                }
            }
        });
        
        // Если есть проблемы, добавляем в список
        if (issues.length > 0) {
            errors.push({
                file: filename,
                number: i,
                issues: issues
            });
            
            // Копируем проблемный файл в папку errors
            try {
                const destPath = path.join(errorsDir, filename);
                fs.copyFileSync(filepath, destPath);
            } catch (copyError) {
                console.log(`⚠️  Не удалось скопировать ${filename}: ${copyError.message}`);
            }
        }
        
    } catch (error) {
        errors.push({
            file: filename,
            number: i,
            issues: [`❌ Ошибка чтения файла: ${error.message}`]
        });
        
        // Копируем проблемный файл в папку errors
        try {
            const destPath = path.join(errorsDir, filename);
            fs.copyFileSync(filepath, destPath);
        } catch (copyError) {
            console.log(`⚠️  Не удалось скопировать ${filename}: ${copyError.message}`);
        }
    }
}

// Формирование отчета
let report = '═══════════════════════════════════════════════════════════\n';
report += '  ОТЧЕТ О ПРОВЕРКЕ ВОПРОСОВ\n';
report += `  Дата: ${new Date().toLocaleString('ru-RU')}\n`;
report += '═══════════════════════════════════════════════════════════\n\n';
report += `Всего проверено вопросов: 1130\n`;
report += `Вопросов с ошибками: ${errors.length}\n\n`;

if (errors.length === 0) {
    report += '✅ Все вопросы в порядке!\n';
} else {
    report += '═══════════════════════════════════════════════════════════\n';
    report += '  СПИСОК ПРОБЛЕМНЫХ ВОПРОСОВ\n';
    report += '═══════════════════════════════════════════════════════════\n\n';
    
    errors.forEach((error, index) => {
        report += `${index + 1}. ${error.file} (Вопрос №${error.number})\n`;
        error.issues.forEach(issue => {
            report += `   ${issue}\n`;
        });
        report += '\n';
    });
    
    // Группировка по типам ошибок
    report += '═══════════════════════════════════════════════════════════\n';
    report += '  СТАТИСТИКА ПО ТИПАМ ОШИБОК\n';
    report += '═══════════════════════════════════════════════════════════\n\n';
    
    const stats = {
        missingText: 0,
        emptyOptions: 0,
        differentCounts: 0,
        incorrectAnswer: 0,
        readError: 0
    };
    
    errors.forEach(error => {
        error.issues.forEach(issue => {
            if (issue.includes('Текст вопроса не найден')) stats.missingText++;
            if (issue.includes('Пустой список ответов')) stats.emptyOptions++;
            if (issue.includes('Разное количество ответов')) stats.differentCounts++;
            if (issue.includes('Некорректный correctAnswer')) stats.incorrectAnswer++;
            if (issue.includes('Ошибка чтения файла')) stats.readError++;
        });
    });
    
    report += `• Текст вопроса не найден: ${stats.missingText}\n`;
    report += `• Пустой список ответов: ${stats.emptyOptions}\n`;
    report += `• Разное количество ответов: ${stats.differentCounts}\n`;
    report += `• Некорректный правильный ответ: ${stats.incorrectAnswer}\n`;
    report += `• Ошибки чтения файла: ${stats.readError}\n\n`;
    
    // Список номеров вопросов для быстрого доступа
    report += '═══════════════════════════════════════════════════════════\n';
    report += '  НОМЕРА ПРОБЛЕМНЫХ ВОПРОСОВ (для быстрого поиска)\n';
    report += '═══════════════════════════════════════════════════════════\n\n';
    
    const numbers = errors.map(e => e.number).join(', ');
    report += `${numbers}\n\n`;
}

report += '═══════════════════════════════════════════════════════════\n';
report += '  КОНЕЦ ОТЧЕТА\n';
report += '═══════════════════════════════════════════════════════════\n';

// Сохранение отчета
fs.writeFileSync(outputFile, report, 'utf8');

console.log(report);
console.log(`\n✅ Отчет сохранен в файл: ${outputFile}`);

if (errors.length > 0) {
    console.log(`📁 Проблемные файлы скопированы в папку: data/errors (${errors.length} файлов)`);
}

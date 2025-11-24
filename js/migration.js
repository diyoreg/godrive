// 🔄 Скрипт миграции данных из localStorage в SQLite БД

class DataMigration {
    constructor() {
        this.api = window.api;
        this.migratedKeys = new Set();
        this.migrationReport = {
            success: 0,
            failed: 0,
            errors: []
        };
    }

    // 🚀 Основная функция миграции
    async migrateAllData() {
        console.log('🔄 Начинаем миграцию данных из localStorage в БД...');

        if (!this.api || !this.api.isAuthenticated()) {
            console.error('❌ Пользователь не авторизован, миграция невозможна');
            return false;
        }

        const currentUser = this.api.getCurrentUser();
        console.log(`👤 Миграция для пользователя: ${currentUser.username}`);

        try {
            // Миграция прогресса билетов
            await this.migrateUserProgress();
            
            // Миграция завершенных билетов (legacy)
            await this.migrateCompletedTickets();
            
            // Миграция настроек пользователя
            await this.migrateUserSettings();
            
            // Показать отчет
            this.showMigrationReport();
            
            return true;
        } catch (error) {
            console.error('❌ Критическая ошибка миграции:', error);
            return false;
        }
    }

    // 📊 Миграция прогресса по билетам
    async migrateUserProgress() {
        console.log('📊 Миграция прогресса билетов...');

        const userProgress = localStorage.getItem('userProgress');
        if (!userProgress) {
            console.log('📊 Прогресс билетов не найден в localStorage');
            return;
        }

        try {
            const progress = JSON.parse(userProgress);
            const ticketIds = Object.keys(progress);
            
            console.log(`📊 Найдено ${ticketIds.length} билетов для миграции`);

            for (const ticketId of ticketIds) {
                const ticketData = progress[ticketId];
                
                try {
                    await this.api.saveTicketProgress(ticketId, {
                        answers: ticketData.answers || [],
                        timeSpent: ticketData.timeSpent || 0,
                        score: ticketData.score || 0,
                        completed: ticketData.completed || false,
                        completedAt: ticketData.completedAt || new Date().toISOString()
                    });
                    
                    console.log(`✅ Билет ${ticketId} мигрирован успешно`);
                    this.migrationReport.success++;
                } catch (error) {
                    console.error(`❌ Ошибка миграции билета ${ticketId}:`, error.message);
                    this.migrationReport.failed++;
                    this.migrationReport.errors.push(`Билет ${ticketId}: ${error.message}`);
                }
            }

            this.migratedKeys.add('userProgress');
        } catch (error) {
            console.error('❌ Ошибка парсинга прогресса:', error);
        }
    }

    // ✅ Миграция завершенных билетов (legacy формат)
    async migrateCompletedTickets() {
        console.log('✅ Миграция завершенных билетов...');

        const completedTickets = localStorage.getItem('completedTickets');
        if (!completedTickets) {
            console.log('✅ Завершенные билеты не найдены в localStorage');
            return;
        }

        try {
            const completed = JSON.parse(completedTickets);
            if (!Array.isArray(completed)) return;

            console.log(`✅ Найдено ${completed.length} завершенных билетов`);

            // Получаем текущий прогресс из API
            let existingProgress = {};
            try {
                existingProgress = await this.api.getProgress() || {};
            } catch (error) {
                console.log('📊 Не удалось получить существующий прогресс');
            }

            for (const ticketId of completed) {
                // Проверяем, есть ли уже данные по этому билету
                if (existingProgress[ticketId]) {
                    console.log(`⏭️ Билет ${ticketId} уже существует в БД, пропускаем`);
                    continue;
                }

                try {
                    await this.api.saveTicketProgress(ticketId, {
                        answers: [], // Нет детальных данных в legacy формате
                        timeSpent: 0,
                        score: 20, // Предполагаем максимальный балл
                        completed: true,
                        completedAt: new Date().toISOString()
                    });
                    
                    console.log(`✅ Legacy билет ${ticketId} мигрирован`);
                    this.migrationReport.success++;
                } catch (error) {
                    console.error(`❌ Ошибка миграции legacy билета ${ticketId}:`, error.message);
                    this.migrationReport.failed++;
                }
            }

            this.migratedKeys.add('completedTickets');
        } catch (error) {
            console.error('❌ Ошибка парсинга завершенных билетов:', error);
        }
    }

    // ⚙️ Миграция настроек пользователя
    async migrateUserSettings() {
        console.log('⚙️ Миграция настроек пользователя...');

        const userSettings = localStorage.getItem('userSettings');
        if (!userSettings) {
            console.log('⚙️ Настройки не найдены в localStorage');
            return;
        }

        try {
            const settings = JSON.parse(userSettings);
            
            // Обновляем профиль с настройками
            await this.api.updateProfile({ 
                settings: settings 
            });
            
            console.log('✅ Настройки пользователя мигрированы');
            this.migrationReport.success++;
            this.migratedKeys.add('userSettings');
        } catch (error) {
            console.error('❌ Ошибка миграции настроек:', error.message);
            this.migrationReport.failed++;
            this.migrationReport.errors.push(`Настройки: ${error.message}`);
        }
    }

    // 📋 Показать отчет о миграции
    showMigrationReport() {
        const total = this.migrationReport.success + this.migrationReport.failed;
        
        console.log('\n🎯 ОТЧЕТ О МИГРАЦИИ:');
        console.log(`✅ Успешно: ${this.migrationReport.success}`);
        console.log(`❌ Ошибок: ${this.migrationReport.failed}`);
        console.log(`📊 Всего: ${total}`);
        
        if (this.migrationReport.errors.length > 0) {
            console.log('\n❌ Детали ошибок:');
            this.migrationReport.errors.forEach(error => {
                console.log(`  • ${error}`);
            });
        }

        // Показать пользователю
        const message = `
Миграция данных завершена!

✅ Успешно мигрировано: ${this.migrationReport.success}
❌ Ошибок: ${this.migrationReport.failed}

${this.migrationReport.failed === 0 ? 
    'Все данные успешно перенесены в базу данных!' : 
    'Некоторые данные не удалось перенести. Проверьте консоль для деталей.'
}
        `.trim();

        alert(message);
    }

    // 🗑️ Очистить мигрированные данные из localStorage
    cleanupLocalStorage() {
        if (this.migratedKeys.size === 0) {
            console.log('🗑️ Нет данных для очистки');
            return;
        }

        const confirmMessage = `
Хотите удалить мигрированные данные из localStorage?

Это освободит место и предотвратит дублирование данных.
Мигрированные ключи: ${Array.from(this.migratedKeys).join(', ')}
        `.trim();

        if (confirm(confirmMessage)) {
            this.migratedKeys.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🗑️ Удален ключ: ${key}`);
            });

            console.log('✅ Очистка localStorage завершена');
            alert('Старые данные успешно очищены из localStorage!');
        }
    }

    // 🔍 Анализ данных для миграции
    analyzeDataForMigration() {
        const analysis = {
            userProgress: null,
            completedTickets: null,
            userSettings: null,
            otherKeys: []
        };

        // Анализируем ключи localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);

            if (key === 'userProgress') {
                try {
                    const data = JSON.parse(value);
                    analysis.userProgress = {
                        ticketsCount: Object.keys(data).length,
                        size: value.length
                    };
                } catch (e) {
                    analysis.userProgress = { error: 'Некорректный JSON' };
                }
            } else if (key === 'completedTickets') {
                try {
                    const data = JSON.parse(value);
                    analysis.completedTickets = {
                        count: Array.isArray(data) ? data.length : 0,
                        size: value.length
                    };
                } catch (e) {
                    analysis.completedTickets = { error: 'Некорректный JSON' };
                }
            } else if (key === 'userSettings') {
                analysis.userSettings = {
                    size: value.length
                };
            } else if (!['authToken', 'currentUser', 'isLoggedIn'].includes(key)) {
                analysis.otherKeys.push({
                    key: key,
                    size: value.length
                });
            }
        }

        return analysis;
    }
}

// 🚀 Автоматическая миграция при входе пользователя
async function autoMigrateOnLogin() {
    // Проверяем, нужна ли миграция
    const migrationComplete = localStorage.getItem('migrationComplete');
    
    if (migrationComplete === 'true') {
        console.log('✅ Миграция уже выполнена ранее');
        return;
    }

    if (!window.api || !window.api.isAuthenticated()) {
        console.log('❌ Автомиграция невозможна - пользователь не авторизован');
        return;
    }

    const migration = new DataMigration();
    const analysis = migration.analyzeDataForMigration();

    // Проверяем, есть ли данные для миграции
    const hasDataToMigrate = analysis.userProgress || analysis.completedTickets || analysis.userSettings;

    if (!hasDataToMigrate) {
        console.log('📂 Нет данных для миграции');
        localStorage.setItem('migrationComplete', 'true');
        return;
    }

    // Спрашиваем пользователя о миграции
    const shouldMigrate = confirm(`
Найдены данные для миграции в базу данных:

${analysis.userProgress ? `• Прогресс по ${analysis.userProgress.ticketsCount} билетам` : ''}
${analysis.completedTickets ? `• ${analysis.completedTickets.count} завершенных билетов` : ''}
${analysis.userSettings ? '• Пользовательские настройки' : ''}

Выполнить миграцию сейчас?
    `.trim());

    if (shouldMigrate) {
        const success = await migration.migrateAllData();
        
        if (success) {
            localStorage.setItem('migrationComplete', 'true');
            
            // Предложить очистку
            setTimeout(() => {
                migration.cleanupLocalStorage();
            }, 2000);
        }
    } else {
        localStorage.setItem('migrationComplete', 'skipped');
    }
}

// 🛠️ Ручная миграция (для кнопки на странице)
async function manualMigration() {
    if (!window.api || !window.api.isAuthenticated()) {
        alert('Ошибка: Пользователь не авторизован');
        return;
    }

    const migration = new DataMigration();
    const analysis = migration.analyzeDataForMigration();

    console.log('🔍 Анализ данных для миграции:', analysis);

    const success = await migration.migrateAllData();
    
    if (success) {
        localStorage.setItem('migrationComplete', 'true');
        migration.cleanupLocalStorage();
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.DataMigration = DataMigration;
    window.autoMigrateOnLogin = autoMigrateOnLogin;
    window.manualMigration = manualMigration;
}

// Автоматический запуск при загрузке страницы (если пользователь авторизован)
document.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка для инициализации API
    setTimeout(() => {
        if (window.api && window.api.isAuthenticated()) {
            autoMigrateOnLogin();
        }
    }, 1000);
});
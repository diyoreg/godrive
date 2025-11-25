// 🔗 API клиент для интеграции с backend

class GoDriveAPI {
    constructor(baseURL) {
        // Автоматически определяем API URL
        if (!baseURL) {
            const origin = window.location.origin;
            baseURL = `${origin}/api`;
        }
        this.baseURL = baseURL;
        this.token = localStorage.getItem('authToken');
    }

    // 🔧 Базовый метод для API запросов
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error.message);
            throw error;
        }
    }

    // 🔐 Аутентификация
    async login(username, password) {
        try {
            console.log('🔐 Попытка входа:', { username });
            
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            console.log('📦 Ответ сервера:', response);

            // Backend возвращает данные в объекте data
            const responseData = response.data || response;
            
            // Проверяем структуру ответа
            if (responseData && responseData.token) {
                this.token = responseData.token;
                localStorage.setItem('authToken', this.token);
                
                // Устанавливаем флаг для совместимости со старым кодом
                localStorage.setItem('isLoggedIn', 'true');
                
                // Проверяем наличие данных пользователя
                if (responseData.user) {
                    localStorage.setItem('currentUser', JSON.stringify(responseData.user));
                    console.log('✅ Пользователь сохранен:', responseData.user);
                } else {
                    console.warn('⚠️ Данные пользователя отсутствуют в ответе сервера');
                }
                
                // Возвращаем данные в ожидаемом формате
                return {
                    token: responseData.token,
                    user: responseData.user,
                    settings: responseData.settings
                };
            } else {
                console.error('❌ Некорректная структура ответа:', response);
                throw new Error('Некорректный ответ сервера: отсутствует токен');
            }
        } catch (error) {
            console.error('❌ Ошибка в login():', error);
            throw new Error(`Ошибка входа: ${error.message}`);
        }
    }

    // 🚪 Выход
    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userProgress');
        localStorage.removeItem('isLoggedIn'); // Убираем флаг совместимости
        window.location.href = '/';
    }

    // 👤 Получение профиля
    async getProfile() {
        return await this.request('/auth/profile');
    }

    // 📝 Обновление профиля
    async updateProfile(profileData) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // 📊 Получение статистики
    async getStats() {
        return await this.request('/progress/stats');
    }

    // 📈 Получение прогресса
    async getProgress() {
        return await this.request('/progress');
    }

    // 💾 Сохранение прогресса билета
    async saveTicketProgress(ticketId, ticketData) {
        return await this.request(`/progress/ticket/${ticketId}`, {
            method: 'POST',
            body: JSON.stringify(ticketData)
        });
    }

    // 🗑️ Очистка прогресса
    async clearProgress() {
        return await this.request('/progress', {
            method: 'DELETE'
        });
    }

    // 🗑️ Очистка всех данных пользователя
    async clearAllData() {
        return await this.request('/auth/clear-data', {
            method: 'POST'
        });
    }

    // 👥 Получение списка всех пользователей (только админ)
    async getUsers() {
        return await this.request('/users');
    }

    // 👤 Создание нового пользователя (только админ)
    async createUser(userData) {
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // 🗑️ Удаление пользователя (только админ)
    async deleteUser(userId) {
        return await this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // ✅ Проверка аутентификации
    isAuthenticated() {
        // Проверяем токен в памяти или в localStorage
        if (!this.token) {
            this.token = localStorage.getItem('authToken');
        }
        return !!this.token;
    }

    // 👤 Получение текущего пользователя из localStorage
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                console.log('👤 Текущий пользователь:', user);
                return user;
            }
            console.log('❌ Данные пользователя не найдены в localStorage');
            return null;
        } catch (error) {
            console.error('❌ Ошибка парсинга данных пользователя:', error);
            return null;
        }
    }
}

// 🌐 Глобальный экземпляр API
window.api = new GoDriveAPI();

// 🔄 Автоматическая миграция данных из localStorage
async function migrateFromLocalStorage() {
    if (!window.api.isAuthenticated()) {
        console.log('❓ Пользователь не авторизован, миграция невозможна');
        return;
    }

    try {
        console.log('🔄 Начинаем миграцию данных из localStorage...');

        // Получаем старые данные
        const oldProgress = localStorage.getItem('userProgress');
        const oldSettings = localStorage.getItem('userSettings');

        if (oldProgress) {
            const progress = JSON.parse(oldProgress);
            console.log('📊 Найден старый прогресс:', Object.keys(progress).length, 'билетов');

            // Мигрируем каждый билет
            for (const [ticketId, ticketData] of Object.entries(progress)) {
                try {
                    await window.api.saveTicketProgress(ticketId, ticketData);
                    console.log(`✅ Билет ${ticketId} мигрирован`);
                } catch (error) {
                    console.error(`❌ Ошибка миграции билета ${ticketId}:`, error.message);
                }
            }
        }

        // Мигрируем настройки если есть
        if (oldSettings) {
            const settings = JSON.parse(oldSettings);
            try {
                await window.api.updateProfile({ settings });
                console.log('⚙️ Настройки мигрированы');
            } catch (error) {
                console.error('❌ Ошибка миграции настроек:', error.message);
            }
        }

        console.log('🎉 Миграция завершена успешно!');

        // Удаляем старые данные после успешной миграции
        // localStorage.removeItem('userProgress');
        // localStorage.removeItem('userSettings');
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error.message);
    }
}

// 🔄 Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔌 GoDrive API клиент инициализирован');
    
    // Добавляем задержку для стабильности
    setTimeout(() => {
        if (window.api && window.api.isAuthenticated()) {
            console.log('✅ Пользователь авторизован');
            
            // Запускаем миграцию данных только если не на login странице
            const isLoginPage = window.location.pathname.includes('login.html') || 
                              window.location.pathname.includes('index.html') || 
                              window.location.pathname === '/' || 
                              window.location.pathname === '';
            
            if (!isLoginPage && window.autoMigrateOnLogin) {
                setTimeout(() => {
                    window.autoMigrateOnLogin();
                }, 1000);
            }
        } else {
            console.log('❌ Пользователь не авторизован');
        }
    }, 500);
});

// 📎 Вспомогательные функции для интеграции

// Обновление формы входа
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const username = formData.get('username');
            const password = formData.get('password');

            try {
                await window.api.login(username, password);
                window.location.href = 'index.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }
}

// Загрузка статистики
async function loadUserStats() {
    if (!window.api.isAuthenticated()) return;

    try {
        const stats = await window.api.getStats();
        
        // Обновляем элементы статистики на странице
        const elements = {
            'total-tickets': stats.totalTickets || 0,
            'completed-tickets': stats.completedTickets || 0,
            'average-score': stats.averageScore ? Math.round(stats.averageScore) : 0,
            'total-time': Math.round((stats.totalTimeSpent || 0) / 60) // в минутах
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error.message);
    }
}

// Инициализация на соответствующих страницах
if (typeof window !== 'undefined') {
    // Настройка обработчиков после загрузки DOM
    document.addEventListener('DOMContentLoaded', () => {
        setupLoginForm();
        loadUserStats();
    });
}
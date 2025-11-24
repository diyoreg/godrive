// 🔐 Система авторизации с интеграцией API
class AuthSystem {
    constructor() {
        this.init();
    }

    getApi() {
        // Безопасное получение API клиента
        if (!this.api && window.api) {
            this.api = window.api;
        }
        return this.api;
    }
    
    init() {
        // Инициализировать языковую систему
        this.initLanguage();
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Предотвращаем циклические перенаправления
        this.handleAutoRedirect();
    }

    handleAutoRedirect() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('index.html') || currentPath === '/' || currentPath === '';
        
        // Добавляем небольшую задержку для инициализации API
        setTimeout(() => {
            if (this.isLoggedIn() && isLoginPage && !this._redirecting) {
                console.log('🔄 Авто-перенаправление авторизованного пользователя');
                this._redirecting = true;
                this.redirectToDashboard();
            }
        }, 1000);
    }
    
    initLanguage() {
        if (window.LanguageManager) {
            this.languageManager = new window.LanguageManager();
            
            // Создать кнопки переключения языка
            const body = document.body;
            this.languageManager.createLanguageButtons(body);
            
            // Применить переводы
            this.languageManager.updateInterface();
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        if (!username || !password) {
            this.showError('enterCredentials');
            return;
        }

        // Показать состояние загрузки
        this.showLoading(true);

        try {
            const api = this.getApi();
            
            if (!api) {
                throw new Error('API клиент не доступен. Проверьте подключение к серверу.');
            }
            
            // Попробовать вход через API
            const response = await api.login(username, password);
            
            console.log('✅ Успешный вход, ответ:', response);
            
            // Проверяем, что есть данные пользователя
            if (response && response.user) {
                // Сразу перенаправляем без задержки и сообщений
                this.redirectToDashboard(response.user);
            } else {
                throw new Error('Данные пользователя не получены от сервера');
            }
            
        } catch (error) {
            console.error('Ошибка входа:', error);
            
            // Показать конкретную ошибку
            if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
                this.showError('Сервер недоступен. Убедитесь, что backend запущен на http://localhost:3000');
            } else {
                this.showError(error.message || 'Неверный логин или пароль');
            }
        } finally {
            // Восстановить кнопку только при ошибке (при успехе идет перенаправление)
            if (!this._redirecting) {
                this.showLoading(false);
            }
        }
    }

    redirectToDashboard(user = null) {
        // Предотвращаем множественные перенаправления
        if (this._redirecting) {
            console.log('⚠️ Перенаправление уже в процессе');
            return;
        }
        
        this._redirecting = true;
        
        const api = this.getApi();
        const currentUser = user || (api ? api.getCurrentUser() : null);
        
        console.log('🔄 Перенаправление пользователя:', currentUser);
        
        // Небольшая задержка для предотвращения мигания
        setTimeout(() => {
            if (currentUser && currentUser.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 100);
    }
    
    showError(message) {
        const statusEl = document.getElementById('statusMessage');
        const errorMessage = document.getElementById('errorMessage');
        
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'status-message status-error';
            statusEl.style.display = 'block';
            
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        } else if (errorMessage) {
            // Fallback для старого элемента
            const translatedMessage = this.languageManager ? this.languageManager.translate(message) : message;
            errorMessage.textContent = translatedMessage;
            errorMessage.style.display = 'block';
            
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
        }
    }

    showSuccess(message) {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'status-message status-success';
            statusEl.style.display = 'block';
        }
    }

    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        const button = document.getElementById('loginButton');
        
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
        
        if (button) {
            button.disabled = show;
            button.textContent = show ? 'Обработка...' : 'Войти';
        }
        
        // Автоматически сбрасываем загрузку через 10 секунд на случай зависания
        if (show) {
            setTimeout(() => {
                if (overlay) overlay.style.display = 'none';
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Войти';
                }
            }, 10000);
        }
    }
    
    isLoggedIn() {
        const api = this.getApi();
        if (api) {
            return api.isAuthenticated();
        }
        
        // Fallback: проверяем токен в localStorage напрямую
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        return !!(token && user);
    }
    
    getCurrentUser() {
        const api = this.getApi();
        if (api) {
            return api.getCurrentUser();
        }
        
        // Fallback: читаем напрямую из localStorage
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                console.log('👤 Fallback: получен пользователь из localStorage:', user);
                return user;
            }
            console.log('❌ Fallback: данные пользователя не найдены в localStorage');
            return null;
        } catch (error) {
            console.error('❌ Fallback: ошибка парсинга данных пользователя:', error);
            return null;
        }
    }
    
    logout() {
        if (this.api) {
            this.api.logout();
        } else {
            // Fallback для случаев без API
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
    
    // Проверка авторизации для защищенных страниц
    requireAuth() {
        if (!this.isLoggedIn()) {
            console.log('🔄 Неавторизованный пользователь, перенаправление на login.html');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
    
    // 👤 Получить профиль текущего пользователя через API
    async getUserProfile() {
        if (!this.api || !this.isLoggedIn()) return null;
        
        try {
            return await this.api.getProfile();
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            return null;
        }
    }
    
    // 📝 Обновить профиль пользователя через API
    async updateUserProfile(profileData) {
        console.log('🔄 updateUserProfile вызван с данными:', profileData);
        
        // Проверяем авторизацию
        if (!this.isLoggedIn()) {
            console.log('❌ Пользователь не авторизован');
            return false;
        }
        
        // Получаем API клиент
        let api = this.getApi();
        console.log('🔍 Проверка API клиента:', {
            'this.api': this.api,
            'window.api': window.api,
            'getApi result': api
        });
        
        // Если API не найден, пытаемся инициализировать
        if (!api && window.ApiClient) {
            console.log('🔄 Инициализируем новый API клиент...');
            window.api = new ApiClient();
            this.api = window.api;
            api = this.api;
        }
        
        if (!api) {
            console.log('❌ API клиент недоступен даже после попытки инициализации');
            return false;
        }
        
        console.log('✅ API клиент найден, отправляем запрос...');
        
        try {
            const result = await api.updateProfile(profileData);
            console.log('✅ API updateProfile выполнен, результат:', result);
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления профиля:', error);
            return false;
        }
    }
    
    // 🗑️ Очистить все данные пользователя через API
    async clearUserData() {
        if (!this.api || !this.isLoggedIn()) return false;
        
        try {
            await this.api.clearAllData();
            return true;
        } catch (error) {
            console.error('Ошибка очистки данных:', error);
            return false;
        }
    }

    // 📊 Получить статистику пользователя
    async getUserStats() {
        if (!this.api || !this.isLoggedIn()) return null;
        
        try {
            return await this.api.getStats();
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return null;
        }
    }

    // 📈 Получить прогресс пользователя  
    async getUserProgress() {
        if (!this.api || !this.isLoggedIn()) return null;
        
        try {
            return await this.api.getProgress();
        } catch (error) {
            console.error('Ошибка получения прогресса:', error);
            return null;
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});
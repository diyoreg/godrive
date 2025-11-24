// Система администрирования пользователей
class AdminPanel {
    constructor() {
        this.api = window.api;
        this.deletingUsers = new Set(); // Множество ID пользователей в процессе удаления
        this.init();
    }
    
    async init() {
        try {
            // Инициализировать языковую систему
            this.initLanguage();
            
            // Проверить админские права
            if (!await this.checkAdminAccess()) {
                return;
            }
            
            // Загрузить пользователей и настроить интерфейс
            await this.loadUsers();
            this.setupEventListeners();
            
            console.log('✅ admin.js: Админ панель успешно инициализирована');
        } catch (error) {
            console.error('❌ admin.js: Ошибка инициализации админ панели:', error);
            this.showMessage('Ошибка загрузки админ панели: ' + error.message, 'error');
        }
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
    
    async checkAdminAccess() {
        console.log('🔍 admin.js: Проверяем доступ админа...');
        
        // Ждем готовности API с таймаутом
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            if (this.api && this.api.isAuthenticated()) {
                break;
            }
            
            console.log(`🔄 admin.js: Ожидание готовности API (попытка ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.api || !this.api.isAuthenticated()) {
            console.log('❌ admin.js: API не готов или нет авторизации');
            window.location.href = 'login.html';
            return false;
        }
        
        try {
            const currentUser = this.api.getCurrentUser();
            console.log('👤 admin.js: Пользователь:', currentUser);
            
            if (!currentUser || (currentUser.role !== 'admin' && currentUser.username !== 'admin')) {
                console.log('❌ admin.js: Пользователь не админ');
                alert('Доступ запрещен. Только для администратора.');
                window.location.href = 'dashboard.html';
                return false;
            }
            
            console.log('✅ admin.js: Админ-доступ подтвержден');
            return true;
        } catch (error) {
            console.error('❌ admin.js: Ошибка проверки доступа:', error);
            window.location.href = 'login.html';
            return false;
        }
    }
    
    async loadUsers() {
        try {
            const response = await this.api.getUsers();
            const users = response.data.users;
            
            const usersList = document.getElementById('usersList');
            if (!usersList) return;
            
            usersList.innerHTML = '';
            
            users.forEach(user => {
                const userElement = this.createUserElement(user);
                usersList.appendChild(userElement);
            });
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            this.showMessage('Ошибка загрузки пользователей: ' + error.message, 'error');
        }
    }
    
    createUserElement(user) {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.dataset.userId = user.id;
        userDiv.dataset.username = user.username;
        
        const roleText = user.role === 'admin' ? 'Администратор' : 'Пользователь';
        const isCurrentAdmin = user.username === 'admin';
        
        userDiv.innerHTML = `
            <div class="user-info">
                <span class="username">${user.username}</span>
                <span class="display-name">${user.name || user.username}</span>
                <span class="user-role">${roleText}</span>
            </div>
            <div class="user-actions">
                <button class="delete-btn" 
                        ${isCurrentAdmin ? 'disabled' : ''}
                        data-user-id="${user.id}" 
                        data-username="${user.username}">
                    ${this.languageManager?.translate('deleteButton') || 'Удалить'}
                </button>
            </div>
        `;
        
        // Обработчик событий теперь делегированный в setupEventListeners
        // Индивидуальные обработчики не нужны
        
        return userDiv;
    }
    
    setupEventListeners() {
        // Форма добавления пользователя
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => this.handleAddUser(e));
        }
        
        // Кнопка "Профиль"
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
        
        // Кнопка "Главная"
        const backBtn = document.getElementById('backToHome');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        // Кнопка "Выйти"
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Делегирование событий для кнопок удаления (для динамически добавленных элементов)
        const usersList = document.getElementById('usersList');
        if (usersList) {
            usersList.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-btn') && !e.target.disabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Блокируем кнопку чтобы избежать двойного клика
                    e.target.disabled = true;
                    
                    const userId = e.target.dataset.userId;
                    const username = e.target.dataset.username;
                    
                    if (userId && username) {
                        await this.deleteUser(parseInt(userId), username);
                    }
                    
                    // Разблокируем кнопку через некоторое время
                    setTimeout(() => {
                        e.target.disabled = false;
                    }, 1000);
                }
            });
        }
    }
    
    async handleAddUser(e) {
        e.preventDefault();
        
        const username = document.getElementById('newUsername').value.trim();
        const displayName = document.getElementById('newUserName').value.trim();
        const password = document.getElementById('newPassword').value.trim();
        
        if (!username || !displayName || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }
        
        try {
            const userData = {
                username: username,
                password: password,
                name: displayName
            };
            
            await this.api.createUser(userData);
            
            // Обновить интерфейс
            await this.loadUsers();
            
            // Очистить форму
            document.getElementById('newUsername').value = '';
            document.getElementById('newUserName').value = '';
            document.getElementById('newPassword').value = '';
            
            this.showNotification('Пользователь добавлен', 'success');
        } catch (error) {
            console.error('Ошибка создания пользователя:', error);
            this.showNotification('Ошибка создания', 'error');
        }
    }
    
    async deleteUser(userId, username) {
        console.log(`🗑️ admin.js: Попытка удалить пользователя: ${username} (ID: ${userId})`);
        
        // Проверяем, не выполняется ли уже удаление этого пользователя
        if (this.deletingUsers.has(userId)) {
            console.log(`⏳ admin.js: Удаление пользователя ${userId} уже выполняется, игнорируем`);
            return;
        }
        
        if (username === 'admin') {
            console.log('❌ admin.js: Попытка удалить администратора заблокирована');
            this.showNotification('Нельзя удалить администратора', 'error');
            return;
        }
        
        // Добавляем пользователя в список удаляемых
        this.deletingUsers.add(userId);
        
        try {
            // Показываем красивое подтверждение
            const confirmed = await this.showConfirm(`Удалить пользователя "${username}"?`);
            if (!confirmed) {
                console.log('❌ admin.js: Удаление отменено пользователем');
                return;
            }
            
            console.log(`🔄 admin.js: Отправка запроса на удаление пользователя ${userId}`);
            await this.api.deleteUser(userId);
            console.log(`✅ admin.js: Пользователь ${username} успешно удален`);
            
            await this.loadUsers();
            this.showNotification('Пользователь удален', 'success');
        } catch (error) {
            console.error('❌ admin.js: Ошибка удаления пользователя:', error);
            this.showNotification('Ошибка удаления', 'error');
        } finally {
            // Убираем пользователя из списка удаляемых в любом случае
            this.deletingUsers.delete(userId);
        }
    }
    
    showMessage(text, type) {
        const messageDiv = document.getElementById('addUserMessage');
        if (!messageDiv) return;
        
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Скрыть сообщение через 3 секунды
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
    
    logout() {
        const confirmMessage = this.languageManager?.translate('confirmLogout') || 'Вы уверены, что хотите выйти?';
        
        if (confirm(confirmMessage)) {
            this.api.logout();
            window.location.href = 'login.html';
        }
    }
    
    // Красивое уведомление
    showNotification(message, type = 'info') {
        // Создаем контейнер для уведомлений если его нет
        let container = document.getElementById('notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        // Создаем уведомление
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        
        notification.style.cssText = `
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            pointer-events: auto;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Красивое подтверждение
    async showConfirm(message) {
        return new Promise((resolve) => {
            // Создаем модальное окно
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            `;
            
            dialog.innerHTML = `
                <div style="margin-bottom: 20px; font-size: 16px; color: #374151;">${message}</div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="confirm-cancel" style="
                        background: #f3f4f6;
                        color: #374151;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">Отмена</button>
                    <button id="confirm-ok" style="
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">Удалить</button>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            
            // Анимация появления
            setTimeout(() => {
                modal.style.opacity = '1';
                dialog.style.transform = 'scale(1)';
            }, 10);
            
            // Обработчики кнопок
            const cancelBtn = dialog.querySelector('#confirm-cancel');
            const okBtn = dialog.querySelector('#confirm-ok');
            
            const closeModal = (result) => {
                modal.style.opacity = '0';
                dialog.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve(result);
                }, 300);
            };
            
            cancelBtn.addEventListener('click', () => closeModal(false));
            okBtn.addEventListener('click', () => closeModal(true));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(false);
            });
        });
    }
}

// Функция инициализации с проверкой готовности API
async function initializeAdminPanel() {
    console.log('🔄 admin.js: Начало инициализации админ панели');
    
    // Ждем готовности API
    let attempts = 0;
    const maxAttempts = 50; // 5 секунд максимум
    
    while (attempts < maxAttempts) {
        if (window.api) {
            console.log('✅ admin.js: API готов, инициализируем админ панель');
            window.adminPanel = new AdminPanel();
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.error('❌ admin.js: API не загрузился в течение 5 секунд');
    alert('Ошибка загрузки системы. Перезагрузите страницу.');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeAdminPanel);
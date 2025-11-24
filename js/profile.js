// Система управления профилем пользователя
class ProfileManager {
    constructor() {
        this.authSystem = null;
        this.languageManager = null;
        this.init();
    }

    init() {
        console.log('🚀 Инициализация ProfileManager...');
        
        // Ждем загрузки authSystem
        if (!window.authSystem) {
            console.log('⏳ Ожидание загрузки authSystem...');
            setTimeout(() => this.init(), 100);
            return;
        }
        
        // Проверяем авторизацию
        if (!window.authSystem.isLoggedIn()) {
            console.log('❌ Пользователь не авторизован, перенаправление на login...');
            window.location.href = 'login.html';
            return;
        }
        
        this.authSystem = window.authSystem;
        console.log('✅ AuthSystem загружен');
        
        // Инициализируем языковую систему
        this.languageManager = window.languageManager || new LanguageManager();
        console.log('✅ LanguageManager инициализирован');
        
        this.setupProfile();
        this.setupEventListeners();
    }
    
    setupProfile() {
        this.loadProfileData();
        
        // Инициализируем языковые переводы, если есть languageManager
        if (this.languageManager && typeof this.languageManager.init === 'function') {
            this.languageManager.init();
        }
    }
    
    setupEventListeners() {
        // Сохранение профиля
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProfile();
            });
        }
        
        // Очистка данных
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.showClearDataModal();
            });
        }
        
        // Модальное окно
        const cancelBtn = document.getElementById('cancelBtn');
        const confirmClearBtn = document.getElementById('confirmClearBtn');
        const modal = document.getElementById('confirmModal');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideClearDataModal();
            });
        }
        
        if (confirmClearBtn) {
            confirmClearBtn.addEventListener('click', () => {
                this.clearUserData();
            });
        }
        
        // Закрытие модального окна по клику вне его
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideClearDataModal();
                }
            });
        }
        
        // Навигация
        const backToHome = document.getElementById('backToHome');
        if (backToHome) {
            backToHome.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.authSystem.logout();
            });
        }
    }
    
    loadProfileData() {
        console.log('🔄 Загрузка данных профиля...');
        
        // Проверяем наличие данных в localStorage
        const localStorageData = localStorage.getItem('currentUser');
        console.log('📦 localStorage currentUser:', localStorageData);
        
        // Получаем данные пользователя из localStorage (синхронно)
        const profile = this.authSystem.getCurrentUser();
        console.log('👤 Данные профиля из getCurrentUser():', profile);
        
        if (!profile) {
            console.log('❌ Профиль не найден, попробуем загрузить через API...');
            this.loadProfileFromAPI();
            return;
        }
        
        // Заполняем форму данными пользователя
        const displayNameInput = document.getElementById('displayName');
        
        if (displayNameInput) {
            const displayName = profile.name || profile.username || '';
            displayNameInput.value = displayName;
            console.log('✅ Установлено имя:', displayName);
        }
    }
    
    async loadProfileFromAPI() {
        console.log('🌐 Загрузка профиля через API...');
        try {
            const profile = await this.authSystem.getUserProfile();
            console.log('👤 Данные профиля из API:', profile);
            
            if (profile) {
                // Сохраняем в localStorage для будущих обращений
                localStorage.setItem('currentUser', JSON.stringify(profile));
                
                // Заполняем форму
                const displayNameInput = document.getElementById('displayName');
                if (displayNameInput) {
                    const displayName = profile.name || profile.username || '';
                    displayNameInput.value = displayName;
                    console.log('✅ Установлено имя из API:', displayName);
                }
            } else {
                console.log('❌ Не удалось загрузить профиль через API');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки профиля через API:', error);
        }
    }
    
    async saveProfile() {
        console.log('💾 Начинаем сохранение профиля...');
        
        const displayName = document.getElementById('displayName').value.trim();
        console.log('📝 Новое имя:', displayName);
        
        if (!displayName) {
            console.log('❌ Пустое имя');
            alert(this.languageManager?.translate('nameRequired') || 'Имя обязательно для заполнения');
            return;
        }
        
        const profileData = {
            name: displayName
        };
        console.log('📦 Данные для сохранения:', profileData);
        
        try {
            console.log('🔄 Вызываем updateUserProfile...');
            const success = await this.authSystem.updateUserProfile(profileData);
            console.log('✅ Результат updateUserProfile:', success);
            
            if (success) {
                // Обновляем localStorage с новыми данными
                const currentUser = this.authSystem.getCurrentUser();
                console.log('👤 Текущий пользователь для обновления:', currentUser);
                
                if (currentUser) {
                    currentUser.name = displayName;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    console.log('✅ localStorage обновлен');
                }
                
                alert(this.languageManager?.translate('profileSaved') || 'Профиль сохранен!');
                
                // Перезагружаем данные профиля
                this.loadProfileData();
            } else {
                console.log('❌ updateUserProfile вернул false');
                alert(this.languageManager?.translate('saveError') || 'Ошибка сохранения');
            }
        } catch (error) {
            console.error('❌ Исключение при сохранении профиля:', error);
            alert(this.languageManager?.translate('saveError') || 'Ошибка сохранения');
        }
    }
    
    showClearDataModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    hideClearDataModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    clearUserData() {
        if (this.authSystem.clearUserData()) {
            alert(this.languageManager?.translate('dataCleared') || 'Все данные очищены!');
            this.hideClearDataModal();
        } else {
            alert(this.languageManager?.translate('clearError') || 'Ошибка очистки данных');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});
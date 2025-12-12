// 📊 Система управления билетами с API интеграцией  
class TicketDashboard {
    constructor() {
        this.totalTickets = 113; // 1130 вопросов / 10 вопросов на билет
        this.api = window.api;
        this.authSystem = window.authSystem;
        this.ticketLoader = window.ticketLoader;
        this.init();
    }
    
    async init() {
        console.log('🚀 Инициализация TicketDashboard...');
        console.log('API:', this.api);
        console.log('AuthSystem:', this.authSystem);
        console.log('TicketLoader:', this.ticketLoader);
        
        // Инициализировать языковую систему
        this.initLanguage();
        
        // Проверяем авторизацию с задержкой
        if (!this.checkAuth()) {
            console.log('❌ Авторизация не пройдена, выходим из init');
            return;
        }
        
        // Используем фиксированное количество билетов (генерируются динамически из БД)
        console.log(`📊 Всего билетов: ${this.totalTickets} (генерируются из 1130 вопросов)`);
        
        this.generateTicketGrid();
        this.setupEventListeners();
        
        // Загрузить данные через API
        await this.loadUserProgress();
        await this.loadUserStats();
        await this.loadFavoritesCount();
        await this.displayUserName();
        this.checkAdminAccess();
    }
    
    initLanguage() {
        if (window.LanguageManager) {
            this.languageManager = new window.LanguageManager();
            
            // Применить переводы (без кнопок смены языка)
            this.languageManager.updateInterface();
        }
    }
    
    generateTicketGrid() {
        const ticketsGrid = document.getElementById('ticketsGrid');
        if (!ticketsGrid) return;
        
        ticketsGrid.innerHTML = '';
        
        for (let i = 1; i <= this.totalTickets; i++) {
            const ticketElement = document.createElement('div');
            ticketElement.className = 'ticket-card';
            
            // Create ticket number
            const ticketNumber = document.createElement('div');
            ticketNumber.className = 'ticket-number';
            ticketNumber.textContent = i;
            
            // Create ticket status (will be updated by loadUserProgress)
            const ticketStatus = document.createElement('div');
            ticketStatus.className = 'ticket-status';
            ticketStatus.textContent = '';
            
            ticketElement.appendChild(ticketNumber);
            ticketElement.appendChild(ticketStatus);
            ticketElement.dataset.ticketNumber = i;
            
            ticketElement.addEventListener('click', () => this.openTicket(i));
            ticketsGrid.appendChild(ticketElement);
        }
        
        // Apply translations after generating grid
        if (this.languageManager) {
            this.languageManager.updateInterface();
        }
    }
    
    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
        
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
        }
        
        const favoritesBtn = document.getElementById('favoritesBtn');
        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', () => {
                window.location.href = 'favorites.html';
            });
        }
    }
    
    checkAuth() {
        console.log('🔍 Проверяем авторизацию...');
        console.log('AuthSystem:', this.authSystem);
        
        if (!this.authSystem) {
            console.log('⚠️ AuthSystem не инициализирован, создаем fallback проверку');
            // Fallback проверка
            const token = localStorage.getItem('authToken');
            const user = localStorage.getItem('currentUser');
            if (!token || !user) {
                console.log('❌ Fallback: нет токена/пользователя, перенаправляем на login.html');
                window.location.href = 'login.html';
                return false;
            }
            console.log('✅ Fallback: пользователь авторизован');
            return true;
        }
        
        if (!this.authSystem.isLoggedIn()) {
            console.log('❌ AuthSystem: пользователь не авторизован, перенаправляем на login.html');
            window.location.href = 'login.html';
            return false;
        }
        
        console.log('✅ AuthSystem: пользователь авторизован');
        return true;
    }
    
    logout() {
        // Подтвердить выход
        const confirmMessage = this.languageManager?.translate('confirmLogout') || 'Вы уверены, что хотите выйти?';
        
        if (confirm(confirmMessage)) {
            this.authSystem.logout();
        }
    }
    
    openTicket(ticketNumber) {
        // Сохранить выбранный билет в localStorage
        localStorage.setItem('selectedTicket', ticketNumber);
        
        // Перейти на страницу билета
        window.location.href = `ticket.html?ticket=${ticketNumber}`;
    }
    
    isTicketCompleted(ticketNumber) {
        // Проверить из загруженного прогресса
        if (this.userProgress && this.userProgress[ticketNumber]) {
            return this.userProgress[ticketNumber].completed || false;
        }
        
        // Fallback к localStorage для совместимости
        const completedTickets = JSON.parse(localStorage.getItem('completedTickets') || '[]');
        return completedTickets.includes(ticketNumber);
    }
    
    async loadUserProgress() {
        console.log('📊 Загрузка прогресса пользователя...');
        
        try {
            // Получаем токен для запроса
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('⚠️ Нет токена авторизации');
                return;
            }
            
            // Запрос прогресса напрямую к API
            const response = await fetch('/api/progress', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const progressData = await response.json();
            console.log('✅ Прогресс загружен:', progressData);
            
            // Сохраняем прогресс
            this.userProgress = {};
            
            // Обрабатываем массив прогресса - API возвращает data.progress
            if (progressData.data && progressData.data.progress && Array.isArray(progressData.data.progress)) {
                progressData.data.progress.forEach(item => {
                    this.userProgress[item.ticket_id] = item;
                });
            } else if (progressData.progress && Array.isArray(progressData.progress)) {
                // Fallback на старую структуру
                progressData.progress.forEach(item => {
                    this.userProgress[item.ticket_id] = item;
                });
            }
            
            console.log('📋 Обработанный прогресс:', this.userProgress);
            
            // Обновляем визуальное отображение билетов
            this.updateTicketVisuals();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки прогресса:', error);
            // Fallback к localStorage
            this.loadProgressFromLocalStorage();
        }
    }
    
    updateTicketVisuals() {
        console.log('🎨 Обновление визуального отображения билетов...');
        
        if (!this.userProgress) return;
        
        Object.keys(this.userProgress).forEach(ticketId => {
            const ticketData = this.userProgress[ticketId];
            const ticketElement = document.querySelector(`[data-ticket-number="${ticketId}"]`);
            
            if (ticketElement) {
                // Удаляем старые классы
                ticketElement.classList.remove('completed', 'completed-low', 'in-progress');
                
                // Определяем статус билета
                if (ticketData.completed) {
                    // Билет завершен (все вопросы отвечены)
                    const score = ticketData.score || 0;
                    const total = ticketData.total_questions || 10;
                    const percentage = Math.round((score / total) * 100);
                    
                    // Выбираем цвет в зависимости от процента
                    if (percentage >= 90) {
                        ticketElement.classList.add('completed'); // Зеленый
                    } else {
                        ticketElement.classList.add('completed-low'); // Оранжевый
                    }
                    
                    // Обновляем текст статуса - только процент
                    const statusElement = ticketElement.querySelector('.ticket-status');
                    if (statusElement) {
                        statusElement.textContent = `${percentage}%`;
                    }
                    
                    console.log(`✅ Билет ${ticketId} завершен: ${percentage}%`);
                } else if (ticketData.answers && Object.keys(ticketData.answers).length > 0) {
                    // Билет начат, но не завершен
                    const answeredCount = Object.keys(ticketData.answers).length;
                    const score = ticketData.score || 0;
                    const total = ticketData.total_questions || 10;
                    const percentage = Math.round((score / total) * 100);
                    
                    // Выбираем цвет в зависимости от процента
                    if (percentage >= 90) {
                        ticketElement.classList.add('completed'); // Зеленый
                    } else {
                        ticketElement.classList.add('completed-low'); // Оранжевый
                    }
                    
                    // Обновляем текст статуса - только процент
                    const statusElement = ticketElement.querySelector('.ticket-status');
                    if (statusElement) {
                        statusElement.textContent = `${percentage}%`;
                    }
                    
                    console.log(`⏳ Билет ${ticketId} в процессе: ${percentage}% (${answeredCount}/10)`);
                }
            }
        });
    }

    loadProgressFromLocalStorage() {
        // Загрузить прогресс пользователя из localStorage (fallback)
        const completedTickets = JSON.parse(localStorage.getItem('completedTickets') || '[]');
        
        completedTickets.forEach(ticketNumber => {
            const ticketElement = document.querySelector(`[data-ticket-number="${ticketNumber}"]`);
            if (ticketElement) {
                ticketElement.classList.add('completed');
            }
        });
    }
    
    async markTicketCompleted(ticketNumber, ticketData = null) {
        try {
            if (this.api && this.authSystem.isLoggedIn()) {
                // Сохранить через API
                if (ticketData) {
                    await this.api.saveTicketProgress(ticketNumber, {
                        ...ticketData,
                        completed: true,
                        completedAt: new Date().toISOString()
                    });
                }
            } else {
                // Fallback к localStorage
                const completedTickets = JSON.parse(localStorage.getItem('completedTickets') || '[]');
                
                if (!completedTickets.includes(ticketNumber)) {
                    completedTickets.push(ticketNumber);
                    localStorage.setItem('completedTickets', JSON.stringify(completedTickets));
                }
            }
            
            // Обновить отображение
            const ticketElement = document.querySelector(`[data-ticket-number="${ticketNumber}"]`);
            if (ticketElement) {
                ticketElement.classList.add('completed');
            }
        } catch (error) {
            console.error('Ошибка сохранения завершения билета:', error);
        }
    }
    
    checkAdminAccess() {
        const currentUser = this.authSystem ? this.authSystem.getCurrentUser() : null;
        
        // Показать кнопку админ панели только для админа
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn && currentUser && currentUser.role === 'admin') {
            adminBtn.style.display = 'inline-block';
        }
    }
    
    async displayUserName() {
        const userDisplayNameEl = document.getElementById('userDisplayName');
        if (!userDisplayNameEl) return;
        
        try {
            // Получаем профиль пользователя через API
            if (this.authSystem && this.authSystem.getUserProfile) {
                const userProfile = await this.authSystem.getUserProfile();
                if (userProfile && userProfile.name) {
                    userDisplayNameEl.textContent = userProfile.name;
                    return;
                }
            }
            
            // Fallback на данные из токена
            const currentUser = this.authSystem ? this.authSystem.getCurrentUser() : null;
            if (currentUser) {
                userDisplayNameEl.textContent = currentUser.name || currentUser.username || 'Пользователь';
            } else {
                userDisplayNameEl.textContent = 'Пользователь';
            }
        } catch (error) {
            console.error('Ошибка получения имени пользователя:', error);
            userDisplayNameEl.textContent = 'Пользователь';
        }
    }

    // 📊 Загрузить и отобразить статистику
    async loadUserStats() {
        if (!this.api || !this.authSystem.isLoggedIn()) return;
        
        try {
            const stats = await this.api.getStats();
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }

    async loadFavoritesCount() {
        if (!this.authSystem || !this.authSystem.isLoggedIn()) return;
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/favorites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const count = data.favorites?.length || 0;
                
                // Обновляем кнопку через языковой менеджер для сохранения локализации
                if (this.languageManager) {
                    const badge = document.getElementById('favoritesCountBadge');
                    if (badge) {
                        badge.textContent = count;
                    }
                    // Перерисовываем кнопку с правильным переводом
                    this.languageManager.updateFavoritesButton();
                }
                
                console.log(`⭐ Избранных вопросов: ${count}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки счетчика избранного:', error);
        }
    }

    updateStatsDisplay(stats) {
        // Обновляем элементы статистики если они есть на странице
        const elements = {
            'completedTicketsCount': stats.completedTickets || 0,
            'totalTicketsCount': this.totalTickets,
            'averageScore': stats.averageScore ? Math.round(stats.averageScore) : 0,
            'totalTimeSpent': stats.totalTimeSpent ? Math.round(stats.totalTimeSpent / 60) : 0 // в минутах
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }

        // Обновляем прогресс-бар если есть
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        if (progressBar && stats.completedTickets) {
            const percentage = Math.round((stats.completedTickets / this.totalTickets) * 100);
            progressBar.style.width = `${percentage}%`;
            if (progressText) {
                progressText.textContent = `${percentage}%`;
            }
        }
    }
}

// Инициализация убрана - теперь происходит из dashboard.html
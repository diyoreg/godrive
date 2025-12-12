// Система переводов для интерфейса
const translations = {
    ru: {
        // Страница входа
        loginTitle: "GoDrive",
        loginSubtitle: "Вход в систему",
        loginPlaceholder: "Логин",
        passwordPlaceholder: "Пароль", 
        loginButton: "Войти",
        
        // Панель билетов
        dashboardTitle: "Экзаменационные билеты",
        ticketsListTitle: "Список всех билетов",
        welcome: "Добро пожаловать",
        logoutButton: "Выйти",
        ticketCompleted: "✓ Пройден",
        ticketNotCompleted: "Не пройден",
        
        // Страница теста
        ticketTitle: "Билет №",
        backButton: "← Назад",
        resultsTitle: "Результаты теста",
        correctAnswers: "Правильных ответов:",
        outOf: "из",
        percentage: "Процент:",
        question: "Вопрос",
        closeButton: "Закрыть",
        
        // Профиль пользователя
        profileTitle: "Профиль пользователя",
        profileInfo: "Информация профиля",
        displayName: "Отображаемое имя",
        username: "Логин", 
        language: "Язык интерфейса",
        notifications: "Уведомления",
        saveProfile: "Сохранить профиль",
        statistics: "Статистика",
        testsCompleted: "Тестов завершено",
        averageScore: "Средний балл",
        bestScore: "Лучший результат",
        deleteStatistics: "Удалить статистику",
        clearAllData: "Стереть все данные",
        clearDataDescription: "Это действие удалит всю вашу статистику, прогресс и результаты тестов. Эти действия необратимы. Будьте осторожны!",
        confirmAction: "Подтвердите действие",
        clearDataConfirm: "Вы уверены, что хотите удалить все свои данные? Это действие нельзя отменить.",
        cancel: "Отмена",
        confirmClear: "Да, удалить все",
        nameRequired: "Имя обязательно для заполнения",
        profileSaved: "Профиль сохранен!",
        saveError: "Ошибка сохранения",
        dataCleared: "Все данные очищены!",
        clearError: "Ошибка очистки данных",
        profileButton: "Профиль",
        
        // Админ панель
        adminPanel: "Админ панель",
        adminPanelTitle: "Админ панель",
        mainTitle: "Главная",
        backToHome: "Главная",
        favoritesButton: "Избранное",
        addUserTitle: "Добавить пользователя",
        usersListTitle: "Список пользователей",
        usernamePlaceholder: "Логин",
        displayNamePlaceholder: "Имя пользователя",
        addUserButton: "Добавить пользователя",
        deleteButton: "Удалить",
        
        // Сообщения об ошибках
        enterCredentials: "Пожалуйста, введите логин и пароль",
        wrongCredentials: "Неверный логин или пароль",
        ticketNotFound: "Билет не найден!",
        confirmLogout: "Вы уверены, что хотите выйти?"
    },
    
    uz: {
        // Страница входа
        loginTitle: "GoDrive",
        loginSubtitle: "Tizimga kirish",
        loginPlaceholder: "Login",
        passwordPlaceholder: "Parol",
        loginButton: "Kirish",
        
        // Панель билетов
        dashboardTitle: "Imtihon biletlari",
        ticketsListTitle: "Biletlar ro'yxati",
        welcome: "Xush kelibsiz",
        logoutButton: "Chiqish",
        ticketCompleted: "✓ O'tilgan",
        ticketNotCompleted: "O'tilmagan",
        
        // Страница теста
        ticketTitle: "Bilet №",
        backButton: "← Orqaga",
        resultsTitle: "Test natijalari",
        correctAnswers: "To'g'ri javoblar:",
        outOf: "dan",
        percentage: "Foiz:",
        question: "Savol",
        closeButton: "Yopish",
        
        // Профиль пользователя
        profileTitle: "Foydalanuvchi profili",
        profileInfo: "Profil ma'lumotlari",
        displayName: "Ko'rsatiladigan ism",
        username: "Login",
        language: "Interfeys tili",
        notifications: "Bildirishnomalar",
        saveProfile: "Profilni saqlash",
        statistics: "Statistika",
        testsCompleted: "Bajarilgan testlar",
        averageScore: "O'rtacha ball",
        bestScore: "Eng yaxshi natija",
        deleteStatistics: "Statistikani o'chirish",
        clearAllData: "Barcha ma'lumotlarni o'chirish",
        clearDataDescription: "Bu harakat sizning barcha statistika, progress va test natijalarini o'chiradi. Bu harakatlarni qaytarib bo'lmaydi. Ehtiyot bo'ling!",
        confirmAction: "Harakatni tasdiqlang",
        clearDataConfirm: "Barcha ma'lumotlaringizni o'chirishga ishonchingiz komilmi? Bu harakatni qaytarib bo'lmaydi.",
        cancel: "Bekor qilish",
        confirmClear: "Ha, barchasini o'chirish",
        nameRequired: "Ism majburiy maydon",
        profileSaved: "Profil saqlandi!",
        saveError: "Saqlashda xatolik",
        dataCleared: "Barcha ma'lumotlar tozalandi!",
        clearError: "Ma'lumotlarni tozalashda xatolik",
        profileButton: "Profil",
        
        // Админ панель
        adminPanel: "Admin panel",
        adminPanelTitle: "Admin panel",
        mainTitle: "Bosh sahifa",
        backToHome: "Bosh sahifa",
        favoritesButton: "Tanlanganlar",
        addUserTitle: "Foydalanuvchi qo'shish",
        usersListTitle: "Foydalanuvchilar ro'yxati",
        usernamePlaceholder: "Login",
        displayNamePlaceholder: "Foydalanuvchi nomi",
        addUserButton: "Foydalanuvchi qo'shish",
        deleteButton: "O'chirish",
        
        // Сообщения об ошибках
        enterCredentials: "Iltimos, login va parolni kiriting",
        wrongCredentials: "Noto'g'ri login yoki parol",
        ticketNotFound: "Bilet topilmadi!",
        confirmLogout: "Chiqishni xohlaysizmi?"
    },
    
    uzk: {
        // Страница входа
        loginTitle: "GoDrive",
        loginSubtitle: "Тизимга кириш",
        loginPlaceholder: "Логин",
        passwordPlaceholder: "Парол",
        loginButton: "Кириш",
        
        // Панель билетов
        dashboardTitle: "Имтиҳон билетлари",
        ticketsListTitle: "Билетлар рўйхати",
        welcome: "Хуш келибсиз",
        logoutButton: "Чиқиш",
        ticketCompleted: "✓ Ўтилган",
        ticketNotCompleted: "Ўтилмаган",
        
        // Страница теста
        ticketTitle: "Билет №",
        backButton: "← Орқага",
        resultsTitle: "Тест натижалари", 
        correctAnswers: "Тўғри жавоблар:",
        outOf: "дан",
        percentage: "Фоиз:",
        question: "Савол",
        closeButton: "Ёпиш",
        
        // Профиль пользователя  
        profileTitle: "Фойдаланувчи профили",
        profileInfo: "Профил маълумотлари",
        displayName: "Кўрсатиладиган ном",
        username: "Логин",
        language: "Интерфейс тили",
        notifications: "Билдиришномалар", 
        saveProfile: "Профилни сақлаш",
        statistics: "Статистика",
        testsCompleted: "Бажарилган тестлар",
        averageScore: "Ўртача балл",
        bestScore: "Энг яхши натижа",
        deleteStatistics: "Статистикани ўчириш",
        clearAllData: "Барча маълумотларни ўчириш", 
        clearDataDescription: "Бу ҳаракат сизнинг барча статистика, прогресс ва тест натижаларини ўчиради. Бу харакатларни қайтариб бўлмайди. Эҳтиёт бўлинг!",
        confirmAction: "Ҳаракатни тасдиқланг", 
        clearDataConfirm: "Барча маълумотларингизни ўчиришга ишончингиз комилми? Бу ҳаракатни қайтариб бўлмайди.",
        cancel: "Бекор қилиш",
        confirmClear: "Ҳа, барчасини ўчириш",
        nameRequired: "Ном мажбурий майдон",
        profileSaved: "Профил сақланди!",
        saveError: "Сақлашда хатолик",
        dataCleared: "Барча маълумотлар тозаланди!",
        clearError: "Маълумотларни тозалашда хатолик",
        profileButton: "Профил",
        
        // Админ панель
        adminPanel: "Админ панель",
        adminPanelTitle: "Админ панель",
        mainTitle: "Бош саҳифа",
        backToHome: "Бош саҳифа",
        favoritesButton: "Танланганлар",
        addUserTitle: "Фойдаланувчи қўшиш",
        usersListTitle: "Фойдаланувчилар рўйхати",
        usernamePlaceholder: "Логин",
        displayNamePlaceholder: "Фойдаланувчи номи",
        addUserButton: "Фойдаланувчи қўшиш",
        deleteButton: "Ўчириш",
        
        // Сообщения об ошибках
        enterCredentials: "Илтимос, логин ва паролни киритинг",
        wrongCredentials: "Нотўғри логин ёки парол",
        ticketNotFound: "Билет топилмади!",
        confirmLogout: "Чиқишни хоҳлайсизми?"
    }
};

// Система управления языком
class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'uz';
        this.translations = translations;
    }
    
    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('language', language);
            this.updateInterface();
            
            // Генерируем событие смены языка для других компонентов
            window.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: { language: language } 
            }));
        }
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
    
    updateInterface() {
        // Обновить все элементы с data-translate атрибутом
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            
            if (element.tagName === 'INPUT') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Обновить активную языковую кнопку
        this.updateLanguageButtons();
        
        // Обновить кнопку избранного
        this.updateFavoritesButton();
        
        // Если находимся на странице теста, обновить контент теста
        if (window.testSystem) {
            window.testSystem.updateLanguage();
        }
    }
    
    updateLanguageButtons() {
        const languageButtons = document.querySelectorAll('.language-btn');
        languageButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === this.currentLanguage) {
                btn.classList.add('active');
            }
        });
    }
    
    updateFavoritesButton() {
        const favoritesBtn = document.getElementById('favoritesBtn');
        if (favoritesBtn) {
            const badge = document.getElementById('favoritesCountBadge');
            const count = badge ? badge.textContent : '0';
            const translation = this.translate('favoritesButton');
            
            // Обновляем только текст, сохраняя badge
            favoritesBtn.innerHTML = `⭐ ${translation} <span id="favoritesCountBadge" style="background: rgba(251, 191, 36, 0.3); padding: 2px 8px; border-radius: 6px; margin-left: 4px; font-size: 12px;">${count}</span>`;
        }
    }
    
    createLanguageButtons(container) {
        const languages = [
            { code: 'ru', name: 'РУС' },
            { code: 'uz', name: 'UZ' },
            { code: 'uzk', name: 'ЎЗ' }
        ];
        
        // Проверяем есть ли специальный контейнер в header
        const headerContainer = document.getElementById('languageSwitcher');
        const targetContainer = headerContainer || container;
        const isHeaderPlacement = !!headerContainer;
        
        const langContainer = document.createElement('div');
        langContainer.className = isHeaderPlacement ? 'language-switcher-header' : 'language-switcher';
        
        languages.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'language-btn';
            btn.dataset.lang = lang.code;
            btn.textContent = lang.name;
            
            if (lang.code === this.currentLanguage) {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => this.setLanguage(lang.code));
            langContainer.appendChild(btn);
        });
        
        if (isHeaderPlacement) {
            // Если размещаем в header, вставляем кнопки напрямую без дополнительного контейнера
            headerContainer.innerHTML = '';
            languages.forEach(lang => {
                const btn = document.createElement('button');
                btn.className = 'language-btn';
                btn.dataset.lang = lang.code;
                btn.textContent = lang.name;
                
                if (lang.code === this.currentLanguage) {
                    btn.classList.add('active');
                }
                
                btn.addEventListener('click', () => this.setLanguage(lang.code));
                headerContainer.appendChild(btn);
            });
        } else {
            // Обычное размещение
            targetContainer.appendChild(langContainer);
        }
    }
}

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LanguageManager, translations };
} else {
    window.LanguageManager = LanguageManager;
    window.translations = translations;
}
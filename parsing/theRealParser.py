# Полуавтоматический парсер для вопросов экзамена с сайта avtoimtihon.uz
# Создан для обхода проблем с JavaScript-приложением

"""
Полуавтоматический парсер для извлечения вопросов экзамена
с сайта https://avtoimtihon.uz/practice?ticket=all

Алгоритм работы:
1. Пользователь открывает https://avtoimtihon.uz/practice?ticket=all
2. Пользователь выбирает язык на сайте (ru, uz, uzk)
3. Парсер подключается к открытой странице через Selenium
4. Парсер извлекает вопросы только для выбранного языка
5. Данные сохраняются в правильном порядке (uz, ru, uzk) без перезаписи
"""

import json
import os
import re
import time
import requests
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def setup_driver():
    """Настройка Chrome драйвера для подключения к существующей сессии"""
    options = Options()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    options.add_argument('--disable-web-security')
    options.add_argument('--disable-features=VizDisplayCompositor')
    
    try:
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        print(f"❌ Ошибка создания WebDriver: {e}")
        print("Убедитесь, что Chrome установлен")
        raise

def create_directories():
    """Создает необходимые директории"""
    questions_dir = os.path.join("parsing", "questions")
    images_dir = os.path.join("parsing", "images")
    
    os.makedirs(questions_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)
    
    print(f"📁 Директории готовы:")
    print(f"   📝 Вопросы: {questions_dir}")
    print(f"   🖼️  Изображения: {images_dir}")

def get_user_input():
    """Получает ввод пользователя для языка и диапазона вопросов"""
    print("\n" + "="*60)
    print("🌍 ВЫБОР ЯЗЫКА")
    print("="*60)
    print("Доступные языки:")
    print("  uz  - Узбекский (латиница)")
    print("  ru  - Русский")
    print("  uzk - Узбекский (кириллица)")
    
    # Получаем язык
    while True:
        language = input("\n📝 Введите код языка (uz/ru/uzk): ").strip().lower()
        if language in ['uz', 'ru', 'uzk']:
            break
        print("❌ Неверный код! Используйте: uz, ru или uzk")
    
    # Получаем диапазон вопросов
    print(f"\n📋 ДИАПАЗОН ВОПРОСОВ для языка {language.upper()}")
    print("="*60)
    print("Примеры ввода:")
    print("  7     - только вопрос 7")
    print("  1-100 - вопросы с 1 по 100")
    print("  17-75 - вопросы с 17 по 75")
    
    while True:
        try:
            range_input = input("\n📝 Введите номер или диапазон: ").strip()
            
            if '-' in range_input:
                start, end = map(int, range_input.split('-'))
                if start > end:
                    start, end = end, start
                questions = list(range(start, end + 1))
            else:
                questions = [int(range_input)]
            
            print(f"✅ Выбрано {len(questions)} вопросов: {questions[:5]}{'...' if len(questions) > 5 else ''}")
            break
            
        except ValueError:
            print("❌ Неверный формат! Используйте: 7 или 7-10")
        except KeyboardInterrupt:
            print("\n👋 Выход")
            return None, None
    
    return language, questions

def click_question(driver, question_num):
    """Кликает на вопрос по номеру с прокруткой и поиском в контейнере"""
    print(f"  🔍 Ищем кнопку вопроса {question_num}...")
    
    # Сначала пробуем найти контейнер с кнопками
    container = None
    try:
        # Ищем контейнер с классом "flex min-w-max space-x-1.5 p-2"
        container = driver.find_element(By.CSS_SELECTOR, ".flex.min-w-max.space-x-1\\.5.p-2")
        print(f"  📦 Найден контейнер с кнопками")
        
        # Прокручиваем к контейнеру
        driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", container)
        time.sleep(1)
        
        # КРИТИЧНО: Прокручиваем ВНУТРИ контейнера к нужной кнопке
        print(f"  📜 Прокручиваем внутри контейнера к кнопке {question_num}...")
        
        # Вычисляем примерную позицию кнопки внутри контейнера
        # Предполагаем что кнопки идут по порядку и каждая занимает ~50px
        scroll_position = max(0, (question_num - 1) * 50 - 200)  # Отступ 200px для видимости
        
        driver.execute_script(f"""
            var container = arguments[0];
            container.scrollLeft = {scroll_position};
        """, container)
        time.sleep(2)  # Ждем прокрутки
        
        print(f"  ✅ Прокрутка контейнера выполнена (позиция: {scroll_position}px)")
        
    except Exception as e:
        print(f"  ⚠️ Контейнер кнопок не найден или ошибка прокрутки: {e}")
    
    # Расширенные селекторы для поиска кнопки вопроса
    selectors = [
        # Основные селекторы
        f"//button[@title='Savol {question_num}']",
        f"//button[text()='{question_num}']",
        f"//button[normalize-space(text())='{question_num}']",
        
        # Поиск внутри контейнера
        f"//div[contains(@class, 'flex') and contains(@class, 'min-w-max')]//button[text()='{question_num}']",
        f"//div[contains(@class, 'space-x-1.5')]//button[text()='{question_num}']",
        
        # Универсальные селекторы
        f"//*[text()='{question_num}' and (name()='button' or @role='button')]",
        f"//*[normalize-space(text())='{question_num}' and contains(@class, 'button')]"
    ]
    
    for i, selector in enumerate(selectors, 1):
        try:
            print(f"    Пробуем селектор {i}: ищем элемент...")
            
            # Ищем элемент
            elements = driver.find_elements(By.XPATH, selector)
            
            if elements:
                print(f"    Найдено {len(elements)} элемент(ов)")
                
                for element in elements:
                    try:
                        # УБИРАЕМ проверку is_displayed() - пробуем кликнуть принудительно
                        print(f"    🎯 Пробуем принудительный клик по элементу...")
                        
                        # Агрессивная прокрутка к элементу в контейнере
                        if container:
                            try:
                                # Получаем позицию элемента относительно контейнера
                                element_pos = driver.execute_script("""
                                    var element = arguments[0];
                                    var container = arguments[1];
                                    var elementRect = element.getBoundingClientRect();
                                    var containerRect = container.getBoundingClientRect();
                                    return elementRect.left - containerRect.left + container.scrollLeft;
                                """, element, container)
                                
                                # Прокручиваем контейнер к элементу
                                target_scroll = max(0, element_pos - 200)
                                driver.execute_script(f"arguments[0].scrollLeft = {target_scroll};", container)
                                print(f"    📜 Прокрутка к элементу: {target_scroll}px")
                                time.sleep(1)
                            except Exception as scroll_error:
                                print(f"    ⚠️ Ошибка точной прокрутки: {scroll_error}")
                        
                        # Принудительный клик через JavaScript
                        driver.execute_script("arguments[0].click();", element)
                        print(f"  ✅ УСПЕХ: Принудительный клик по вопросу {question_num}")
                        time.sleep(2)  # Даем больше времени на обработку клика
                        return True
                        
                    except Exception as e:
                        print(f"    ❌ Ошибка принудительного клика: {e}")
                        continue
            else:
                print(f"    🔍 Элементы не найдены для селектора {i}")
                
        except Exception as e:
            print(f"    ❌ Ошибка селектора {i}: {e}")
            continue
    
    # Последняя попытка - поиск всех кнопок с цифрами
    try:
        print(f"  🔄 Последняя попытка: поиск среди всех кнопок...")
        all_buttons = driver.find_elements(By.TAG_NAME, "button")
        print(f"  📊 Найдено {len(all_buttons)} кнопок всего")
        
        for button in all_buttons:
            try:
                button_text = button.text.strip()
                if button_text == str(question_num) and button.is_displayed():
                    print(f"  🎯 Найдена кнопка с текстом '{button_text}'")
                    driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", button)
                    time.sleep(1)
                    driver.execute_script("arguments[0].click();", button)
                    print(f"  ✅ УСПЕХ: Клик по вопросу {question_num} (поиск среди всех)")
                    return True
            except:
                continue
                
    except Exception as e:
        print(f"  ❌ Ошибка поиска среди всех кнопок: {e}")
    
    # Финальная попытка - принудительная прокрутка контейнера
    if container:
        try:
            print(f"  🔄 Финальная попытка: прокручиваем контейнер в разные стороны...")
            
            # Прокручиваем к началу
            driver.execute_script("arguments[0].scrollLeft = 0;", container)
            time.sleep(1)
            
            # Поиск после прокрутки к началу
            try:
                button = driver.find_element(By.XPATH, f"//button[text()='{question_num}']")
                driver.execute_script("arguments[0].click();", button)
                print(f"  ✅ УСПЕХ: Найдена кнопка после прокрутки к началу")
                return True
            except:
                pass
            
            # Прокручиваем к концу
            driver.execute_script("arguments[0].scrollLeft = arguments[0].scrollWidth;", container)
            time.sleep(1)
            
            # Поиск после прокрутки к концу
            try:
                button = driver.find_element(By.XPATH, f"//button[text()='{question_num}']")
                driver.execute_script("arguments[0].click();", button)
                print(f"  ✅ УСПЕХ: Найдена кнопка после прокрутки к концу")
                return True
            except:
                pass
                
            # Прокручиваем по частям
            print(f"  🔍 Поиск по частям контейнера...")
            scroll_steps = 10
            max_scroll = driver.execute_script("return arguments[0].scrollWidth - arguments[0].clientWidth;", container)
            
            for i in range(scroll_steps + 1):
                scroll_pos = int((max_scroll / scroll_steps) * i)
                driver.execute_script(f"arguments[0].scrollLeft = {scroll_pos};", container)
                time.sleep(0.5)
                
                try:
                    button = driver.find_element(By.XPATH, f"//button[text()='{question_num}']")
                    driver.execute_script("arguments[0].click();", button)
                    print(f"  ✅ УСПЕХ: Найдена кнопка на позиции {scroll_pos}px")
                    return True
                except:
                    continue
                    
        except Exception as e:
            print(f"  ❌ Ошибка финальной прокрутки: {e}")
    
    print(f"  ❌ НЕ УДАЛОСЬ найти кнопку для вопроса {question_num}")
    return False

def extract_question_data(driver, question_num):
    """Извлекает данные вопроса с текущей страницы"""
    try:
        # Даем время на загрузку вопроса
        time.sleep(2)
        
        # Кликаем на любой ответ чтобы показать правильный
        try:
            for option_num in [0, 1, 2, 3]:
                option_selector = f"//label[@for='{question_num}-opt-{option_num}']"
                try:
                    option = driver.find_element(By.XPATH, option_selector)
                    driver.execute_script("arguments[0].click();", option)
                    time.sleep(1)
                    break
                except:
                    continue
        except Exception as e:
            print(f"    ⚠️ Не удалось кликнуть по варианту ответа: {e}")
        
        # Автоклик на кнопку объяснения (универсально для всех языков)
        try:
            print("    🔍 Ищем кнопку объяснения...")
            
            # Ищем кнопку с иконкой info (универсальный подход)
            explanation_selectors = [
                "//button[contains(text(), 'Показать объяснение')]",  # Русский
                "//button[contains(text(), 'Izohni ko')]",             # Узбекский латиница
                "//button[contains(text(), 'Izohni yashirish')]",      # Узбекский (скрыть)
                "//button[contains(text(), 'Изоҳни кўриш')]",          # Узбекский кириллица
                "//button[contains(text(), 'Изоҳни яшириш')]",         # Узбекский кириллица (скрыть)
                "//button[.//svg[contains(@class, 'lucide-info')]]"    # По иконке
            ]
            
            explanation_button = None
            for selector in explanation_selectors:
                try:
                    elements = driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        if element.is_displayed():
                            explanation_button = element
                            print(f"    ✅ Найдена кнопка: {element.text[:30]}...")
                            break
                    if explanation_button:
                        break
                except:
                    continue
            
            if explanation_button:
                # Кликаем на кнопку объяснения
                driver.execute_script("arguments[0].click();", explanation_button)
                time.sleep(2)  # Ждем загрузки объяснения
                print("    👆 Клик по кнопке объяснения выполнен")
            else:
                print("    ⚠️ Кнопка объяснения не найдена")
                
        except Exception as e:
            print(f"    ⚠️ Ошибка при клике на объяснение: {e}")
        
        # Получаем HTML страницы
        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        
        # Извлекаем данные
        question_text = extract_question_text(soup)
        options = extract_options(soup, driver)  # Передаем driver для улучшенного поиска
        correct_answer = extract_correct_answer(soup)
        correct_answer_index = extract_correct_answer_index(soup)
        image_url = extract_image_url(soup)
        explanation = extract_explanation(soup, driver)  # Передаем driver для дополнительного поиска
        
        return {
            'text': question_text,
            'options': options,
            'correct_answer': correct_answer,
            'correct_answer_index': correct_answer_index,
            'explanation': explanation,
            'image_url': image_url
        }
        
    except Exception as e:
        print(f"  ❌ Ошибка извлечения данных: {e}")
        return None

def extract_question_text(soup):
    """Извлекает текст вопроса из HTML"""
    selectors = [
        'h3[class*="tracking-tight"]', 
        'h3[class*="font-semibold"]', 
        'h3',
        '.question-text',
        'div[class*="question"]',
        'p[class*="question"]'
    ]
    
    for selector in selectors:
        try:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                if len(text) > 10 and ('?' in text or '?' in text) and 'Назад' not in text:
                    return text
        except:
            continue
    
    # Дополнительный поиск по всем текстам с вопросительными знаками
    try:
        all_texts = soup.find_all(text=True)
        question_candidates = []
        for text in all_texts:
            clean_text = str(text).strip()
            if (len(clean_text) > 15 and ('?' in clean_text or '?' in clean_text) 
                and clean_text not in ['Назад', 'Далее', 'Завершить']):
                question_candidates.append(clean_text)
        
        if question_candidates:
            return max(question_candidates, key=len)
    except:
        pass
    
    return "Текст вопроса не найден"

def extract_options(soup, driver=None):
    """Извлекает варианты ответов через BeautifulSoup и Selenium"""
    options = []
    
    # Метод 1: Через BeautifulSoup (оригинальный)
    option_spans = soup.find_all('span', class_=lambda x: x and 'flex-1' in x and 'text-sm' in x)
    
    for span in option_spans:
        text = span.get_text(strip=True)
        if (text and len(text) > 1 and 
            not any(skip in text.lower() for skip in ['savol', 'izoh', 'oldingi', 'keyingi'])):
            options.append(text)
    
    print(f"    📝 BeautifulSoup нашел {len(options)} вариантов")
    
    # Метод 2: Через Selenium если BeautifulSoup не нашел варианты
    if len(options) == 0 and driver:
        try:
            print(f"    🔍 Пробуем найти варианты через Selenium...")
            
            # Ищем все label элементы с вариантами ответов
            label_selectors = [
                "label[for*='-opt-']",  # Основной селектор для вариантов
                "label:has(input[type='radio'])",  # Label с радиокнопками
                ".option-label",  # По классу
                "label span"  # Label со span внутри
            ]
            
            for selector in label_selectors:
                try:
                    label_elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    print(f"      Селектор '{selector}': найдено {len(label_elements)} элементов")
                    
                    for label in label_elements:
                        try:
                            # Ищем текст внутри label
                            spans = label.find_elements(By.TAG_NAME, "span")
                            for span in spans:
                                text = span.text.strip()
                                if (text and len(text) > 3 and 
                                    not any(skip in text.lower() for skip in ['savol', 'izoh', 'oldingi', 'keyingi', 'показать', 'объяснение'])):
                                    if text not in options:
                                        options.append(text)
                                        print(f"        ✅ Найден вариант: {text[:30]}...")
                        except:
                            continue
                            
                    if len(options) > 0:
                        break
                        
                except Exception as e:
                    print(f"      ❌ Ошибка селектора '{selector}': {e}")
                    continue
                    
        except Exception as e:
            print(f"    ❌ Ошибка поиска через Selenium: {e}")
    
    # Метод 3: Поиск по всем span элементам если предыдущие не сработали
    if len(options) == 0:
        try:
            print(f"    🔄 Поиск по всем span элементам...")
            all_spans = soup.find_all('span')
            
            candidate_options = []
            for span in all_spans:
                text = span.get_text(strip=True)
                # Ищем тексты которые выглядят как варианты ответов
                if (text and 5 <= len(text) <= 200 and  # Разумная длина
                    not any(skip in text.lower() for skip in ['savol', 'izoh', 'oldingi', 'keyingi', 'bilet', 'natija', 'показать', 'объяснение', 'изоҳ']) and
                    not text.isdigit() and  # Не просто цифра
                    '?' not in text and  # Не вопрос
                    len([c for c in text if c.isalpha()]) > 3):  # Минимум 3 буквы
                    candidate_options.append(text)
            
            # Берем самые длинные уникальные тексты
            unique_candidates = list(set(candidate_options))
            unique_candidates.sort(key=len, reverse=True)
            options = unique_candidates[:4]  # Максимум 4
            
            print(f"    📋 Найдено кандидатов: {len(unique_candidates)}, выбрано: {len(options)}")
            
        except Exception as e:
            print(f"    ❌ Ошибка поиска по всем span: {e}")
    
    # Удаляем дубликаты и оставляем только уникальные
    unique_options = []
    seen = set()
    for option in options:
        if option not in seen and len(option) > 3:
            seen.add(option)
            unique_options.append(option)
    
    print(f"    ✅ Итого найдено вариантов: {len(unique_options)}")
    for i, opt in enumerate(unique_options, 1):
        print(f"      {i}. {opt[:50]}...")
    
    return unique_options

def extract_correct_answer(soup):
    """Извлекает правильный ответ"""
    check_icons = soup.find_all('svg', class_=lambda x: x and 'lucide-check-circle' in x)
    for check_icon in check_icons:
        parent = check_icon.find_parent('label')
        if parent:
            span = parent.find('span', class_=lambda x: x and 'flex-1' in x)
            if span:
                return span.get_text(strip=True)
    return "Правильный ответ не определен"

def extract_correct_answer_index(soup):
    """Извлекает индекс правильного ответа (1-4)"""
    check_icons = soup.find_all('svg', class_=lambda x: x and 'lucide-check-circle' in x)
    for check_icon in check_icons:
        parent = check_icon.find_parent('label')
        if parent:
            for_attr = parent.get('for', '')
            if '-opt-' in for_attr:
                try:
                    opt_num = int(for_attr.split('-opt-')[-1])
                    return opt_num + 1  # Конвертируем 0-3 в 1-4
                except:
                    pass
    return 1  # По умолчанию первый вариант

def extract_explanation(soup, driver=None):
    """Извлекает объяснение к вопросу из <p class="text-xs sm:text-sm text-foreground/80">"""
    try:
        # Ищем конкретно <p> с нужным классом
        explanation_paragraphs = soup.find_all('p', class_=lambda x: x and 
            'text-xs' in str(x) and 'sm:text-sm' in str(x) and 'text-foreground/80' in str(x))
        
        for p_elem in explanation_paragraphs:
            text = p_elem.get_text(strip=True)
            if text and len(text) > 10:
                print(f"    📝 Найдено объяснение из <p>: {text[:50]}...")
                return text
        
        # Если через BeautifulSoup не нашли, пробуем через Selenium
        if driver:
            try:
                explanation_elements = driver.find_elements(By.CSS_SELECTOR, 
                    "p.text-xs.sm\\:text-sm.text-foreground\\/80")
                
                for elem in explanation_elements:
                    if elem.is_displayed():
                        text = elem.text.strip()
                        if text and len(text) > 10:
                            print(f"    📝 Найдено объяснение (Selenium): {text[:50]}...")
                            return text
            except Exception as e:
                print(f"    ⚠️ Ошибка поиска через Selenium: {e}")
        
        print("    ⚠️ Объяснение не найдено в <p> элементах")
        return ""
        
    except Exception as e:
        print(f"    ❌ Ошибка извлечения объяснения: {e}")
        return ""

def extract_image_url(soup):
    """Извлекает URL изображения"""
    img = soup.find('img', src=lambda x: x and '/quiz-images/' in x)
    if img:
        src = img.get('src')
        if src.startswith('/'):
            return f"https://avtoimtihon.uz{src}"
        return src
    return None

def download_image_if_needed(image_url, question_num):
    """Скачивает изображение если его еще нет"""
    if not image_url:
        return "data/images/defaultpic.jpg"
    
    parsed_url = urlparse(image_url)
    extension = os.path.splitext(parsed_url.path)[1] or '.webp'
    filename = f"ticket_1_q{question_num}{extension}"
    filepath = os.path.join("parsing", "images", filename)
    
    if os.path.exists(filepath):
        print(f"    📁 Изображение уже существует: {filename}")
        return f"data/images/{filename}"
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(image_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"    💾 Изображение скачано: {filename}")
        return f"data/images/{filename}"
        
    except Exception as e:
        print(f"    ❌ Ошибка скачивания изображения: {e}")
        return "data/images/defaultpic.jpg"

def load_existing_question_data(question_num):
    """Загружает существующие данные вопроса или создает новую структуру"""
    filename = f"q{question_num:04d}.json"
    filepath = os.path.join("parsing", "questions", filename)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"    ⚠️ Ошибка загрузки {filename}: {e}")
    
    # Создаем новую структуру
    return {
        "questionId": question_num,
        "image": "data/images/defaultpic.jpg",
        "translations": {}
    }

def save_question_data(question_data, question_num):
    """Сохраняет данные вопроса в JSON файл"""
    filename = f"q{question_num:04d}.json"
    filepath = os.path.join("parsing", "questions", filename)
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(question_data, f, ensure_ascii=False, indent=4)
        print(f"    💾 Сохранен: {filename}")
        return True
    except Exception as e:
        print(f"    ❌ Ошибка сохранения {filename}: {e}")
        return False

def parse_questions(driver, language, questions_list):
    """Основной процесс парсинга вопросов"""
    print(f"\n🚀 НАЧИНАЕМ ПАРСИНГ")
    print(f"🌍 Язык: {language.upper()}")
    print(f"📊 Вопросов: {len(questions_list)}")
    print("="*60)
    
    successful = 0
    failed = 0
    
    for i, question_num in enumerate(questions_list, 1):
        print(f"\n📝 [{i}/{len(questions_list)}] Вопрос #{question_num}")
        
        # Кликаем на вопрос
        if not click_question(driver, question_num):
            print(f"  ❌ Пропускаем вопрос {question_num}")
            failed += 1
            continue
        
        # Извлекаем данные
        question_data_new = extract_question_data(driver, question_num)
        if not question_data_new:
            print(f"  ❌ Не удалось извлечь данные для вопроса {question_num}")
            failed += 1
            continue
        
        # Загружаем существующие данные
        question_data = load_existing_question_data(question_num)
        
        # Скачиваем изображение (только если его еще нет)
        if question_data["image"] == "data/images/defaultpic.jpg":
            question_data["image"] = download_image_if_needed(
                question_data_new['image_url'], question_num
            )
        
        # Подготавливаем варианты ответов с префиксом F (без дополнения до 4-х)
        options = question_data_new['options'][:]
        formatted_options = [f"F{i+1}. {opt}" for i, opt in enumerate(options)]
        
        # Добавляем данные для текущего языка
        question_data["translations"][language] = {
            "text": question_data_new['text'],
            "options": formatted_options,
            "correctAnswer": question_data_new.get('correct_answer_index', 1),
            "explanation": question_data_new.get('explanation', '')
        }
        
        # Сохраняем
        if save_question_data(question_data, question_num):
            successful += 1
            print(f"  ✅ Вопрос {question_num} обработан успешно")
        else:
            failed += 1
        
        # Небольшая пауза между вопросами
        time.sleep(1)
    
    print(f"\n🎉 ПАРСИНГ ЗАВЕРШЕН!")
    print(f"✅ Успешно: {successful}")
    print(f"❌ Ошибок: {failed}")
    print(f"📊 Всего: {len(questions_list)}")

def main():
    """
    Основная функция парсера
    """
    print("🎯 ПОЛУАВТОМАТИЧЕСКИЙ ПАРСЕР ВОПРОСОВ")
    print("="*60)
    print("📋 Инструкция:")
    print("1. Парсер автоматически откроет страницу")
    print("2. Выберите нужный язык на сайте вручную")
    print("3. Введите параметры парсинга")
    print("="*60)
    
    # Создаем директории
    create_directories()
    
    # Получаем пользовательский ввод
    language, questions_list = get_user_input()
    if not language or not questions_list:
        return
    
    print(f"\n🚀 Запуск браузера и открытие страницы...")
    
    # Подключаемся к браузеру
    try:
        driver = setup_driver()
        
        # Открываем страницу парсинга
        print("🔗 Открываем https://avtoimtihon.uz/practice?ticket=all")
        driver.get("https://avtoimtihon.uz/practice?ticket=all")
        time.sleep(5)  # Ждем загрузки страницы
        
        print("✅ Страница загружена")
        print(f"❗ ВАЖНО: Выберите язык {language.upper()} на сайте!")
        print("   🌍 Найдите переключатель языка и выберите нужный")
        
        input("\n⌨️  Нажмите Enter когда выберете язык и будете готовы к парсингу...")
        
        # Начинаем парсинг
        parse_questions(driver, language, questions_list)
        
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
    finally:
        try:
            driver.quit()
            print("🔒 Браузер закрыт")
        except:
            pass

if __name__ == "__main__":
    main()
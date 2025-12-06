# GoDrive - Project Instructions for AI Assistant

## 🎯 Project Overview

**GoDrive** is a comprehensive web-based driving exam preparation service for Uzbekistan. The project serves as the primary platform after team restructuring, with all development responsibilities now consolidated.

### Business Model
- **Primary Access**: Telegram Bot (WebApp) with auto-registration
- **Secondary Access**: Direct browser access (desktop/mobile)
- **Monetization**: Paid subscriptions via CLICK/PAYME payment systems
- **Free Tier**: Limited access to basic question set without registration

### Target Scale
- **Expected Users**: 100 - 1,000,000
- **Peak Concurrent Users**: 70,000 - 80,000
- **Current Question Database**: 1,180 questions (expandable)
- **Question Structure**: 118 tickets × 10 questions each

---

## 🏗️ Technical Architecture

### Tech Stack
- **Backend**: Node.js + Express
- **Database**: SQLite (with migration path to PostgreSQL for scale)
- **Frontend**: Vanilla JavaScript (no framework dependencies)
- **Deployment**: Railway (current), scalable to dedicated infrastructure
- **Integration**: Telegram Bot API (WebApp)

### Current Project State
- ✅ Basic authentication system (login/password)
- ✅ Question database (1,180 questions in 3 languages: uz/ru/uzk)
- ✅ Admin panel with question editor
- ✅ Ticket viewing system (118 tickets × 10 questions)
- ✅ Basic UI with dark theme, responsive design
- ⏳ Telegram Bot integration (pending)
- ⏳ Payment system integration (pending)
- ⏳ Advanced exam modes (pending)

### File Structure Priority
```
godrive/
├── server.js                    # Main entry point
├── database/
│   ├── godrive.db              # SQLite database (production)
│   ├── connection.js           # DB connection manager
│   ├── init.js                 # DB initialization
│   └── schema.sql              # Database schema
├── routes/
│   ├── auth.js                 # Authentication routes
│   ├── users.js                # User management
│   └── progress.js             # User progress tracking
├── models/
│   ├── User.js                 # User model
│   └── Progress.js             # Progress tracking model
├── data/
│   ├── questions/              # 1,180 JSON files (q0001.json - q1180.json)
│   └── images/                 # Question images
├── js/
│   ├── api-client.js           # Frontend API client
│   ├── auth.js                 # Frontend auth logic
│   ├── ticket-loader.js        # Ticket display logic
│   └── language.js             # Multilingual support
├── admin.html                  # Admin panel (question editor)
├── ticket.html                 # Question display page
├── dashboard.html              # User dashboard
└── login.html                  # Login page
```

---

## 🎮 Required Functionality

### 1. Ticket Viewing Mode ✅ (COMPLETED)
- Display 118 tickets in grid layout
- Each ticket = mini exam (10 questions)
- Navigate between questions with prev/next
- Show images, 2-5 answer options
- Display correct answer with explanation after submission
- Track completion status per ticket

### 2. Exam Mode (20 Random Questions) 🚧 (TO IMPLEMENT)
**Requirements:**
- Select 20 random questions from entire pool (1,180)
- 25-minute countdown timer
- No navigation between questions during exam
- Submit all answers at end
- Pass threshold: 18/20 (90%)
- Show results with correct/incorrect breakdown
- Save exam history to user profile

**Implementation Priority**: HIGH
**Database Schema Needed**: `user_exam_history` table

### 3. Rapid Mode (Sequential All Questions) 🚧 (TO IMPLEMENT)
**Requirements:**
- Display all 1,180 questions in order
- Counter for correct/incorrect answers (real-time)
- No time limit
- Allow skipping questions
- Save progress (resume capability)
- Final summary with statistics

**Implementation Priority**: HIGH
**Key Feature**: Progress persistence across sessions

### 4. Random Rapid Mode 🚧 (TO IMPLEMENT)
**Requirements:**
- Same as Rapid Mode but randomized order
- Shuffle algorithm must ensure no duplicates
- Same progress tracking as Rapid Mode
- Option to restart with new randomization

**Implementation Priority**: MEDIUM

### 5. Traffic Rules Page 📚 (TO IMPLEMENT)
**Requirements:**
- Static content pages with traffic rules
- Multilingual support (uz/ru/uzk)
- Searchable/categorized content
- Images/diagrams for road signs
- Reference links to official sources

**Implementation Priority**: LOW
**Content Format**: Markdown or HTML with embedded images

### 6. Error Analysis & Statistics 📊 (TO IMPLEMENT)

#### User-Specific Statistics
**Requirements:**
- Track all user answers (question_id, correct/incorrect, timestamp)
- Generate "Most Mistakes" page showing frequently failed questions
- Allow re-attempting mistake questions only
- Show improvement trend over time

#### Global Statistics (All Users)
**Requirements:**
- Aggregate statistics across all users
- Identify hardest questions (highest error rate)
- Display global difficulty rating per question
- Admin view: question difficulty dashboard

**Implementation Priority**: MEDIUM-HIGH
**Database Schema Needed**: 
```sql
CREATE TABLE user_answers (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    question_id INTEGER,
    is_correct BOOLEAN,
    answer_selected INTEGER,
    timestamp DATETIME,
    mode TEXT -- 'ticket', 'exam', 'rapid', 'random_rapid'
);

CREATE TABLE global_question_stats (
    question_id INTEGER PRIMARY KEY,
    total_attempts INTEGER,
    correct_attempts INTEGER,
    error_rate REAL,
    last_updated DATETIME
);
```

---

## 🔐 Authentication & User Management

### Current System
- Username/password authentication
- JWT token-based sessions
- Roles: `user`, `admin`
- Session persistence in localStorage

### Required Integration: Telegram Bot
**Flow:**
1. User starts bot in Telegram
2. Bot generates unique credentials: `username` + `password`
3. Bot creates account via backend API call
4. User can now access:
   - WebApp inside Telegram (iframe)
   - Direct browser login with generated credentials
5. Single unified account across all access methods

**API Endpoints to Create:**
```javascript
POST /api/telegram/register
{
    telegram_id: number,
    telegram_username: string,
    first_name: string,
    last_name: string
}
// Returns: { username, password, token }

POST /api/telegram/login
{
    telegram_id: number
}
// Returns: { token, user_info }
```

**Database Schema Addition:**
```sql
ALTER TABLE users ADD COLUMN telegram_id INTEGER UNIQUE;
ALTER TABLE users ADD COLUMN telegram_username TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_expires DATETIME;
```

---

## 💳 Payment System Integration

### Payment Providers
- **CLICK** (Uzbekistan)
- **PAYME** (Uzbekistan)

### Subscription Tiers
1. **Free**: Limited access (e.g., 100 questions, 5 tickets)
2. **Premium**: Full access to all 1,180 questions, all modes
3. **Admin-Granted**: Unlimited access assigned manually

### Payment Flow
1. User initiates payment in Telegram Bot or Web Interface
2. Redirect to CLICK/PAYME payment gateway
3. Payment provider sends webhook on success
4. Backend verifies payment, updates `subscription_status`
5. User gains immediate access

**API Endpoints to Create:**
```javascript
POST /api/payment/create-invoice
{
    user_id: number,
    amount: number,
    provider: 'click' | 'payme'
}
// Returns: { invoice_url, invoice_id }

POST /api/payment/webhook/click
// Handles CLICK payment notifications

POST /api/payment/webhook/payme
// Handles PAYME payment notifications

GET /api/user/subscription
// Returns: { status, expires, has_access }
```

**Database Schema:**
```sql
CREATE TABLE payments (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    provider TEXT,
    amount REAL,
    currency TEXT DEFAULT 'UZS',
    status TEXT, -- 'pending', 'completed', 'failed'
    invoice_id TEXT,
    transaction_id TEXT,
    created_at DATETIME,
    completed_at DATETIME
);
```

---

## 🚀 Performance & Scalability Requirements

### Caching Strategy
1. **Question Caching** (Redis when scaled)
   - Cache frequently accessed questions in memory
   - Invalidate on admin edits
   - TTL: 1 hour for question data

2. **User Session Caching**
   - Cache active user sessions
   - Reduce database reads for auth checks

3. **Statistics Caching**
   - Pre-calculate global statistics hourly
   - Cache per-user statistics for 5 minutes

### Database Optimization
- **Current**: SQLite (adequate for <10K users)
- **Migration Path**: PostgreSQL when >50K users
- **Indexing Strategy**:
  ```sql
  CREATE INDEX idx_user_answers_user_id ON user_answers(user_id);
  CREATE INDEX idx_user_answers_question_id ON user_answers(question_id);
  CREATE INDEX idx_users_telegram_id ON users(telegram_id);
  ```

### API Rate Limiting
```javascript
// Current: 100 requests/15 minutes (dev)
// Production: 1000 requests/15 minutes per IP
// Premium users: 5000 requests/15 minutes
```

### CDN for Static Assets
- Move `data/images/` to CDN when traffic increases
- Use Railway's built-in CDN or Cloudflare

---

## 🎨 UI/UX Design Standards

### Design System (Current)
- **Theme**: Dark gradient background with animated waves
- **Colors**: 
  - Primary: #60a5fa (blue)
  - Success: #22c55e (green)
  - Error: #ef4444 (red)
  - Background: #0f172a → #1e293b gradient
- **Typography**: Montserrat (300-700 weights)
- **Components**: 
  - Cards with `rgba(255, 255, 255, 0.05)` background
  - Glassmorphism effects
  - Smooth transitions (0.3s ease)

### Key UX Features
1. **Spoiler Effect**: Blur explanations until clicked (Telegram-style)
2. **Image Modal**: Full-screen zoom (50%-300%) with mouse wheel
3. **Language Switcher**: Globe button with 3 languages (uz/ru/uzk)
4. **Progress Indicators**: Visual feedback on all actions
5. **Mobile-First**: Responsive design for phones/tablets/desktop

### Consistency Rules
- All user-facing text MUST be localized (uz/ru/uzk)
- All forms MUST have loading states
- All API errors MUST show user-friendly messages
- All actions MUST have confirmation for destructive operations

---

## 🔧 Development Workflow

### Developer Context
- **Primary Developer**: Non-programmer with Python syntax knowledge
- **AI Assistant Role**: Full implementation, code generation, debugging
- **Human Role**: Architecture decisions, feature requirements, testing

### Code Quality Standards
1. **Readability First**: Extensive comments in Russian
2. **Error Handling**: Always wrap async operations in try-catch
3. **Logging**: Console.log all critical operations for debugging
4. **Validation**: Server-side validation for ALL user inputs
5. **Security**: No SQL injection, XSS protection, CSRF tokens

### Git Workflow
```bash
# Always commit with descriptive messages
git add .
git commit -m "feat: add exam mode with 20 random questions"
git push origin main

# Railway auto-deploys on push to main
```

### Testing Before Deployment
1. Test locally: `npm start`
2. Test all user flows manually
3. Check browser console for errors
4. Test on mobile device
5. Push to Railway
6. Monitor Railway logs for errors

---

## 📋 Implementation Priority Queue

### Phase 1: Core Exam Modes (CURRENT)
1. ✅ Ticket Mode (10 questions per ticket)
2. 🚧 Exam Mode (20 random questions, 25-min timer)
3. 🚧 Rapid Mode (all 1,180 questions sequential)
4. 🚧 Random Rapid Mode

### Phase 2: Telegram Integration
1. Bot registration flow
2. WebApp embedding
3. Single-login system
4. Bot commands (/start, /login, /stats)

### Phase 3: Statistics & Analytics
1. User answer tracking
2. Personal mistake analysis
3. Global difficulty statistics
4. Progress charts/graphs

### Phase 4: Payment Integration
1. CLICK API integration
2. PAYME API integration
3. Subscription management
4. Admin subscription control

### Phase 5: Additional Features
1. Traffic rules content pages
2. Advanced filtering/search
3. Leaderboards
4. Social sharing

### Phase 6: Optimization & Scale
1. Redis caching
2. PostgreSQL migration
3. CDN for images
4. Load balancing

---

## 🐛 Known Issues & Technical Debt

### Current Issues
1. ❌ Railway deployment requires database file in Git (not ideal for production)
   - **Solution**: Migrate to PostgreSQL with Railway database service
2. ❌ Content Security Policy blocks some API calls
   - **Workaround**: Added `connectSrc` exceptions
3. ❌ Duplicate login handlers causing double submissions
   - **Status**: Fixed in latest commit

### Technical Debt
1. **Hardcoded configuration**: Move to environment variables
2. **No input sanitization**: Add express-validator
3. **No API versioning**: Implement /api/v1/ structure
4. **No automated tests**: Add Jest for unit tests
5. **No CI/CD pipeline**: Set up GitHub Actions

---

## 🔒 Security Considerations

### Current Security Measures
- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting (express-rate-limit)
- Password hashing (bcrypt)
- JWT token authentication

### Required Security Additions
1. **HTTPS Only**: Enforce SSL in production
2. **CSRF Protection**: Add csurf middleware
3. **Input Validation**: Validate all user inputs
4. **SQL Injection Prevention**: Use parameterized queries (already done)
5. **XSS Protection**: Sanitize all user-generated content
6. **Session Management**: Implement refresh tokens
7. **Audit Logging**: Log all admin actions

### Pre-Release Security Checklist
- [ ] Professional security audit
- [ ] Penetration testing
- [ ] OWASP Top 10 compliance check
- [ ] Privacy policy & GDPR compliance
- [ ] Payment security audit (PCI DSS if applicable)

---

## 📞 API Documentation (To Be Implemented)

### User Management
```
POST   /api/auth/register     - Register new user (Telegram only)
POST   /api/auth/login        - Login with username/password
POST   /api/auth/logout       - Logout user
GET    /api/user/profile      - Get user profile
PUT    /api/user/profile      - Update user profile
GET    /api/user/subscription - Check subscription status
```

### Questions & Tickets
```
GET    /api/tickets           - Get all tickets (118 tickets)
GET    /api/tickets/:id       - Get single ticket (10 questions)
GET    /api/questions/random  - Get random questions for exam
GET    /api/questions/:id     - Get single question
```

### Progress Tracking
```
POST   /api/progress/answer   - Submit answer
GET    /api/progress/stats    - Get user statistics
GET    /api/progress/mistakes - Get most common mistakes
GET    /api/progress/history  - Get exam/rapid history
```

### Admin
```
GET    /api/admin/users       - List all users
PUT    /api/admin/users/:id   - Update user (grant subscription)
POST   /api/admin/question    - Create question
PUT    /api/admin/question/:id - Update question
DELETE /api/admin/question/:id - Delete question
GET    /api/admin/stats/global - Global question statistics
```

### Payments
```
POST   /api/payment/invoice   - Create payment invoice
POST   /api/payment/webhook/click - CLICK webhook
POST   /api/payment/webhook/payme - PAYME webhook
GET    /api/payment/history   - User payment history
```

---

## 💡 AI Assistant Guidelines

### When Implementing Features
1. **Always ask clarifying questions** if requirements are ambiguous
2. **Provide multiple implementation options** when trade-offs exist
3. **Explain technical decisions** in simple terms
4. **Show code samples** before full implementation
5. **Test locally first** before committing to Git

### Code Style
- Use **Russian comments** for complex logic
- Use **English** for variable/function names
- Follow **Express.js best practices**
- Maintain **consistent indentation** (2 spaces)
- Add **error handling** to all async functions

### Communication Style
- Be **concise but thorough**
- Use **emojis** for visual clarity (✅ ❌ ⚠️ 🚀)
- **Avoid jargon** unless necessary
- Always provide **next steps** at the end

### Problem-Solving Approach
1. Understand the user's goal
2. Identify potential issues
3. Propose solution(s)
4. Implement and test
5. Document changes
6. Commit to Git with clear message

---

## 📝 Final Notes

This project is a **production-ready web service** with significant business impact. Quality, security, and user experience are paramount. The AI assistant should act as a **senior full-stack developer** while maintaining clear communication with a **non-technical project owner**.

**Remember**: The goal is not just to build features, but to build a **reliable, scalable, profitable product** that serves tens of thousands of users preparing for their driving exams.

---

**Last Updated**: November 25, 2025  
**Project Repository**: https://github.com/diyoreg/godrive  
**Deployment**: Railway (https://godrive-production.up.railway.app)

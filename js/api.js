/**
 * عميل الـ API المتقدم لمنظومة حصة الشهيد أبانوب
 * يدعم الربط مع MongoDB Atlas والـ Backend مع نظام استرجاع احتياطي ذكي (Offline Fallback)
 */

const API_BASE_URL = window.location.protocol === 'file:' 
    ? 'http://localhost:5000/api'
    : (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const ChurchAPI = {
    isOnline: false,

    // فحص الاتصال بالـ Backend
    async checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                this.isOnline = true;
                return true;
            }
        } catch (e) {
            this.isOnline = false;
        }
        return false;
    },

    // تسجيل الدخول
    async login(username, password, role) {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role })
                });
                const data = await res.json();
                if (data.success) return { success: true, user: data.user, source: 'mongodb' };
                return { success: false, message: data.message };
            } catch (err) {
                console.warn('تعذر الاتصال بالخادم، الانتقال للتحقق المحلي...');
            }
        }

        // تحقق محلي احتياطي (Offline Fallback)
        const accounts = JSON.parse(localStorage.getItem('abanoub_accounts')) || OFFICIAL_CHURCH_DATA.accounts;
        const user = accounts.find(a => 
            (a.username === username || a.code === username) && 
            a.password === password && 
            (!role || a.role === role)
        );

        if (user) {
            return {
                success: true,
                user: { code: user.code, name: user.name, username: user.username, role: user.role, year: user.year },
                source: 'offline_local'
            };
        }
        return { success: false, message: 'بيانات الدخول غير صحيحة' };
    },

    // جلب قائمة المخدومين
    async getStudents(params = {}) {
        if (await this.checkBackendHealth()) {
            try {
                const query = new URLSearchParams(params).toString();
                const res = await fetch(`${API_BASE_URL}/students?${query}`);
                const data = await res.json();
                if (data.success) return data.data;
            } catch (e) {}
        }
        return JSON.parse(localStorage.getItem('abanoub_students')) || OFFICIAL_CHURCH_DATA.students;
    },

    // تسجيل الحضور والغياب
    async recordAttendance(record) {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                const data = await res.json();
                if (data.success) return data.data;
            } catch (e) {}
        }
        return null;
    },

    // جلب التقرير اليومي المفصل
    async getDailyReport(date, session, grade) {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/attendance/reports/daily?date=${date}&session=${encodeURIComponent(session)}&grade=${encodeURIComponent(grade)}`);
                const data = await res.json();
                if (data.success) return data;
            } catch (e) {}
        }
        return null; // سيتم الحساب محلياً في الواجهة
    },

    // جلب التقرير الأسبوعي التحليلي
    async getWeeklyReport(week, grade) {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/attendance/reports/weekly?week=${week}&grade=${encodeURIComponent(grade)}`);
                const data = await res.json();
                if (data.success) return data;
            } catch (e) {}
        }
        return null;
    },

    // جلب التقرير الشهري التراكمي
    async getMonthlyReport(month, grade, sort) {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/attendance/reports/monthly?month=${month}&grade=${encodeURIComponent(grade)}&sort=${sort}`);
                const data = await res.json();
                if (data.success) return data;
            } catch (e) {}
        }
        return null;
    },

    // جلب الألحان
    async getHymns() {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/hymns`);
                const data = await res.json();
                if (data.success) return data.data;
            } catch (e) {}
        }
        return JSON.parse(localStorage.getItem('abanoub_hymns')) || OFFICIAL_CHURCH_DATA.hymns;
    },

    // جلب المعاملات المالية
    async getFinances() {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/finances`);
                const data = await res.json();
                if (data.success) return data.data;
            } catch (e) {}
        }
        return JSON.parse(localStorage.getItem('abanoub_finances')) || OFFICIAL_CHURCH_DATA.finances;
    },

    // إضافة حركة مالية
    async addFinance(entry) {
        if (await this.checkBackendHealth()) {
            try {
                const res = await fetch(`${API_BASE_URL}/finances`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry)
                });
                const data = await res.json();
                if (data.success) return data.data;
            } catch (e) {}
        }
        return null;
    }
};

window.ChurchAPI = ChurchAPI;

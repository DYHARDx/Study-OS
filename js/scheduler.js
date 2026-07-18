// Scheduler handles day transitions and data archiving

const Scheduler = {
    checkDayTransition() {
        const user = Storage.get(Storage.KEYS.USER);
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        
        if (!user.lastActiveDate) {
            user.lastActiveDate = today;
            Storage.set(Storage.KEYS.USER, user);
            return;
        }

        if (user.lastActiveDate !== today) {
            this.handleNewDay(user, today);
        }
    },

    handleNewDay(user, today) {
        const lastDate = new Date(user.lastActiveDate);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Archive previous day's log
        this.archiveDailyLog(user.lastActiveDate);

        // --- Calculate Carry Forwards for NIMCET Others ---
        // Note: Planner.getTodayTargets will use the state BEFORE mode changes
        if (window.Planner) {
            const yesterdayTargets = Planner.getTodayTargets();
            const history = Storage.get(Storage.KEYS.HISTORY) || {};
            const yesterdayLogs = history[user.lastActiveDate] || {categories: {}};
            
            user.carryForwards = user.carryForwards || [];
            ['reasoning', 'computer', 'english'].forEach(cat => {
                const target = (yesterdayTargets[cat] || 0) * 60;
                const actual = yesterdayLogs.categories[cat] || 0;
                if (target > 0 && actual < target * 0.7) {
                    if (!user.carryForwards.includes(cat)) user.carryForwards.push(cat);
                } else {
                    user.carryForwards = user.carryForwards.filter(c => c !== cat);
                }
            });
        }

        // Streak Logic
        if (diffDays === 1) {
            const history = Storage.get(Storage.KEYS.HISTORY);
            const yesterdayLog = history[user.lastActiveDate];
            if (yesterdayLog && yesterdayLog.totalMinutes > 0) {
                user.streak += 1;
                if (user.streak > user.longestStreak) {
                    user.longestStreak = user.streak;
                }
            } else {
                user.streak = 0; 
                user.missedDays += 1;
            }
        } else {
            user.streak = 0;
            user.missedDays += (diffDays - 1);
        }

        user.currentDayNumber += diffDays;
        user.lastActiveDate = today;
        Storage.set(Storage.KEYS.USER, user);
    },

    archiveDailyLog(dateStr) {
        // Find how much time was spent on `dateStr`
        // We use the LOGS array which stores `{ date, category, topicId, minutes }`
        const logs = Storage.get(Storage.KEYS.LOGS) || [];
        const history = Storage.get(Storage.KEYS.HISTORY) || {};

        const dailyLogs = logs.filter(log => log.date === dateStr);
        
        const summary = {
            totalMinutes: 0,
            categories: {}
        };

        dailyLogs.forEach(log => {
            summary.totalMinutes += log.minutes;
            if (!summary.categories[log.category]) summary.categories[log.category] = 0;
            summary.categories[log.category] += log.minutes;
        });

        // Only save if there's actual data to avoid clutter, or save to show 0 hours
        history[dateStr] = summary;
        Storage.set(Storage.KEYS.HISTORY, history);
    },

    logTime(category, topicId, minutes) {
        const today = new Date().toISOString().split('T')[0];
        const logs = Storage.get(Storage.KEYS.LOGS) || [];
        
        logs.push({
            date: today,
            category,
            topicId,
            minutes,
            timestamp: Date.now()
        });

        Storage.set(Storage.KEYS.LOGS, logs);

        // Update User Total
        const user = Storage.get(Storage.KEYS.USER);
        user.totalStudyHours += (minutes / 60);
        Storage.set(Storage.KEYS.USER, user);

        // Update Syllabus TimeSpent
        const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
        const topic = syllabus[category].find(t => t.id === topicId);
        if (topic) {
            topic.timeSpent += minutes;
            Storage.set(Storage.KEYS.SYLLABUS, syllabus);
        }
    }
};

// Planner handles targets, dynamic adjustments, and progress logic

const Planner = {
    isInternshipDay() {
        const today = new Date().getDay();
        return today === 0 || today === 6; // Sunday or Saturday
    },

    getTodayTargets() {
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        let targets = { ...settings.targets }; 
        const user = Storage.get(Storage.KEYS.USER) || Storage.DEFAULT_USER;

        // Reset NIMCET Cats
        const nimcetCats = ['maths', 'reasoning', 'computer', 'english'];
        nimcetCats.forEach(c => targets[c] = 0);

        // Advanced 3+3+1 Logic
        targets.maths = 3;
        
        let pendingCount = 0;
        const pendingQueue = user.carryForwards || [];
        
        ['reasoning', 'computer', 'english'].forEach(cat => {
            if (pendingQueue.includes(cat)) {
                targets[cat] = 1;
                pendingCount++;
            }
        });
        
        // Maths priority rule: Maths only appears if 0 or 1 subject is pending
        if (pendingCount >= 2) {
            targets.maths = 0;
        } else if (pendingCount === 1) {
            targets.maths = 2;
        } else {
            targets.maths = 3;
        }

        // Internship Day Override
        if (this.isInternshipDay()) {
            targets.webdev = 0;
        }

        return targets;
    },

    getActiveTopic(category) {
        const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
        if (!syllabus[category]) return null;
        return syllabus[category].find(t => t.status === 'unlocked' && !t.completed) || null;
    },

    markTopicComplete(category, topicId) {
        const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
        const index = syllabus[category].findIndex(t => t.id === topicId);
        if (index !== -1) {
            syllabus[category][index].completed = true;
            syllabus[category][index].status = 'completed';
            if (index + 1 < syllabus[category].length) {
                syllabus[category][index + 1].status = 'unlocked';
            }
            Storage.set(Storage.KEYS.SYLLABUS, syllabus);
        }
        
        // Add Reasoning, Computer, English to Pending Queue when Maths chapter finishes
        if (category === 'maths') {
            const user = Storage.get(Storage.KEYS.USER) || Storage.DEFAULT_USER;
            user.carryForwards = user.carryForwards || [];
            ['reasoning', 'computer', 'english'].forEach(cat => {
                if (!user.carryForwards.includes(cat)) {
                    user.carryForwards.push(cat);
                }
            });
            Storage.set(Storage.KEYS.USER, user);
        }
    },

    getTodayCompletedTime() {
        const today = new Date().toISOString().split('T')[0];
        const logs = Storage.get(Storage.KEYS.LOGS) || [];
        const summary = { total: 0, webdev: 0, nimcet: 0, maths: 0, reasoning: 0, computer: 0, english: 0, revision: 0 };

        logs.filter(log => log.date === today).forEach(log => {
            const mins = parseFloat(log.minutes) || 0;
            summary.total += mins;
            if (log.category === 'webdev') summary.webdev += mins;
            else {
                summary.nimcet += mins;
                if (summary[log.category] !== undefined) summary[log.category] += mins;
            }
        });
        return summary;
    },

    calculateOverallProgress() {
        const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
        const progress = {};
        for (const cat in syllabus) {
            const total = syllabus[cat].length;
            const completed = syllabus[cat].filter(t => t.completed).length;
            progress[cat] = { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
        }
        const webdevProgress = progress.webdev ? progress.webdev.percentage : 0;
        const nimcetCats = ['maths', 'reasoning', 'computer', 'english', 'revision'];
        let nimcetTotal = 0, nimcetCompleted = 0;
        nimcetCats.forEach(c => {
            if (progress[c]) { nimcetTotal += progress[c].total; nimcetCompleted += progress[c].completed; }
        });
        return {
            categories: progress,
            webdev: webdevProgress,
            nimcet: nimcetTotal === 0 ? 0 : Math.round((nimcetCompleted / nimcetTotal) * 100)
        };
    },

    // =========================================================
    //  GENERATE TODAY'S PLAN
    //  Priority: carry-forward pending > webdev > maths >
    //            reasoning > computer > english > revision
    // =========================================================
    generateTodayPlan() {
        const targets = this.getTodayTargets();
        const completed = this.getTodayCompletedTime();
        const catOrder = ['webdev', 'maths', 'reasoning', 'computer', 'english', 'revision'];
        const normal = [];
        const priority = [];

        catOrder.forEach(cat => {
            const topic = this.getActiveTopic(cat);
            if (!topic) return;

            const targetMins = Math.round(parseFloat(targets[cat] || 0) * 60);
            if (targetMins <= 0) return; // Skip subjects with 0 target

            const spentMins = completed[cat] || 0;
            const isCompleted = spentMins >= targetMins;
            const isCarryForward = this._wasCarryForward(cat);

            const task = {
                id: topic.id,
                category: cat,
                title: topic.title,
                targetMins,
                spentMins,
                completed: isCompleted,
                locked: false,
                priority: isCarryForward ? 'high' : 'normal'
            };

            if (isCarryForward) priority.push(task);
            else normal.push(task);
        });

        // Carry-forward tasks come first (highest priority)
        return [...priority, ...normal];
    },

    _wasCarryForward(cat) {
        const history = Storage.get(Storage.KEYS.HISTORY) || {};
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yd = yesterday.toISOString().split('T')[0];
        const ydLog = history[yd];
        if (!ydLog || !ydLog.categories) return false;
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        const target = parseFloat(settings.targets[cat] || 0) * 60;
        const actual = ydLog.categories[cat] || 0;
        return target > 0 && actual < target * 0.7;
    }
};

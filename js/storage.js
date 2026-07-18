// LocalStorage Wrapper for StudyOS

const Storage = {
    // Keys
    KEYS: {
        SETTINGS: 'studyos_settings',
        USER: 'studyos_user',
        SYLLABUS: 'studyos_syllabus',
        HISTORY: 'studyos_history',
        LOGS: 'studyos_logs',
        CHECKINS: 'studyos_checkins'
    },

    // Default Configurations
    DEFAULT_SETTINGS: {
        theme: 'dark',
        targets: {
            webdev: 3, // Hours
            maths: 3,
            reasoning: 0,
            computer: 0,
            english: 0,
            revision: 1
        }
    },

    DEFAULT_USER: {
        streak: 0,
        lastActiveDate: null,
        totalStudyHours: 0,
        currentDayNumber: 1,
        longestStreak: 0,
        missedDays: 0,
        carryForwards: []
    },

    // Get Data
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    // Save Data
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    // Initialize if empty
    init() {
        if (!this.get(this.KEYS.SETTINGS)) {
            this.set(this.KEYS.SETTINGS, this.DEFAULT_SETTINGS);
        }
        
        if (!this.get(this.KEYS.USER)) {
            // Set current date as lastActive to start tracking today
            const user = { ...this.DEFAULT_USER, startDate: new Date().toISOString().split('T')[0] };
            this.set(this.KEYS.USER, user);
        }

        if (!this.get(this.KEYS.HISTORY)) {
            this.set(this.KEYS.HISTORY, {}); // key: date YYYY-MM-DD
        }

        if (!this.get(this.KEYS.LOGS)) {
            this.set(this.KEYS.LOGS, []);
        }

        if (!this.get(this.KEYS.CHECKINS)) {
            this.set(this.KEYS.CHECKINS, []);
        }

        if (!this.get(this.KEYS.SYLLABUS)) {
            this.initializeSyllabusProgress();
        } else {
            this.migrateSyllabus();
        }
    },

    initializeSyllabusProgress() {
        const progress = {};
        
        // Loop over all categories defined in data.js
        for (const [category, topics] of Object.entries(ALL_TOPICS)) {
            progress[category] = topics.map((topic, index) => {
                let status = 'locked';
                let completed = false;
                
                if (topic.isPreCompleted) {
                    status = 'completed';
                    completed = true;
                }
                
                return {
                    id: topic.id,
                    title: topic.title,
                    status: status,
                    timeSpent: 0, // In minutes
                    completed: completed,
                    isRecurring: topic.isRecurring || false
                };
            });
            
            // Unlock the first incomplete topic
            const firstIncompleteIndex = progress[category].findIndex(t => !t.completed);
            if (firstIncompleteIndex !== -1) {
                progress[category][firstIncompleteIndex].status = 'unlocked';
            }
        }

        this.set(this.KEYS.SYLLABUS, progress);
    },

    migrateSyllabus() {
        const syllabus = this.get(this.KEYS.SYLLABUS);
        let changed = false;
        
        for (const [category, topics] of Object.entries(ALL_TOPICS)) {
            if (!syllabus[category]) {
                syllabus[category] = [];
            }
            
            // Remove any topics that no longer exist in ALL_TOPICS
            const originalLength = syllabus[category].length;
            syllabus[category] = syllabus[category].filter(savedTopic => 
                topics.some(t => t.id === savedTopic.id)
            );
            if (syllabus[category].length !== originalLength) {
                changed = true;
            }
            
            // Add missing topics and update existing titles
            topics.forEach(topic => {
                const existingTopic = syllabus[category].find(t => t.id === topic.id);
                if (!existingTopic) {
                    let status = 'locked';
                    let completed = false;
                    
                    if (topic.isPreCompleted) {
                        status = 'completed';
                        completed = true;
                    }
                    
                    syllabus[category].push({
                        id: topic.id,
                        title: topic.title,
                        status: status,
                        timeSpent: 0,
                        completed: completed,
                        isRecurring: topic.isRecurring || false
                    });
                    changed = true;
                } else {
                    // Update title if it changed (e.g. numbering changed)
                    if (existingTopic.title !== topic.title) {
                        existingTopic.title = topic.title;
                        changed = true;
                    }
                }
            });
            
            // Re-sort the syllabus to match ALL_TOPICS order
            if (changed) {
                syllabus[category].sort((a, b) => {
                    const indexA = topics.findIndex(t => t.id === a.id);
                    const indexB = topics.findIndex(t => t.id === b.id);
                    return indexA - indexB;
                });
                
                // Ensure the first incomplete topic is unlocked
                const firstIncompleteIndex = syllabus[category].findIndex(t => !t.completed);
                if (firstIncompleteIndex !== -1 && syllabus[category][firstIncompleteIndex].status === 'locked') {
                    syllabus[category][firstIncompleteIndex].status = 'unlocked';
                }
            }
        }
        
        if (changed) {
            this.set(this.KEYS.SYLLABUS, syllabus);
        }
    },

    // Export Data to JSON file
    exportData() {
        const data = {
            settings: this.get(this.KEYS.SETTINGS),
            user: this.get(this.KEYS.USER),
            syllabus: this.get(this.KEYS.SYLLABUS),
            history: this.get(this.KEYS.HISTORY)
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StudyOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Import Data from JSON file
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);
            if (data.user) this.set(this.KEYS.USER, data.user);
            if (data.syllabus) this.set(this.KEYS.SYLLABUS, data.syllabus);
            if (data.history) this.set(this.KEYS.HISTORY, data.history);
            return true;
        } catch (e) {
            console.error('Error importing data', e);
            return false;
        }
    },

    // Reset All Data
    resetAll() {
        localStorage.clear();
        this.init();
    }
};

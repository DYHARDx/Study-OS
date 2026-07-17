# StudyOS

StudyOS is a **Premium, Offline-First Study Management System** designed to track progress for Full Stack Web Development and NIMCET Preparation.

Built entirely as a frontend Single Page Application (SPA), it requires **zero backend** and relies completely on the browser's `localStorage` for offline persistence.

## Features
- **Premium Glassmorphism UI**: Beautiful, modern dashboard with dark mode and smooth animations.
- **Offline First**: All data is securely stored in your browser's LocalStorage.
- **Smart Planning**: Automatically calculates daily targets. Reduces targets intelligently on weekends (Internship Days).
- **Time Tracking**: Built-in stopwatch timer and manual entry mode.
- **Syllabus Tracking**: Chapters unlock dynamically as previous ones are completed.
- **Comprehensive Analytics**: Visualizes study trends using Chart.js.
- **Daily Check-in**: Track sleep, water intake, and mood.
- **Data Export & Import**: Never lose your progress. Backup your data to a JSON file and restore it at any time.

## Technology Stack
- HTML5
- CSS3 (Vanilla, CSS Variables, Glassmorphism)
- Vanilla JavaScript (ES6+)
- [Chart.js](https://www.chartjs.org/) for data visualization
- FontAwesome for icons

## File Structure
- `index.html`: Main Application Layout
- `style.css`: Design System & Responsive Layout
- `js/data.js`: Centralized syllabus definitions
- `js/storage.js`: LocalStorage wrapper and data migration logic
- `js/scheduler.js`: Logic for detecting day changes, streak calculation, and archiving
- `js/planner.js`: Logic for dynamic target adjustment and syllabus state checks
- `js/analytics.js`: Chart rendering and complex metric computations (ETA, Longest Streak)
- `js/script.js`: Core DOM manipulation, event listeners, and View routing

## How to Run
Since this app relies solely on frontend technologies and local storage, you can just open `index.html` in your favorite web browser. No local web server is strictly required, though using one like `Live Server` in VSCode provides a better development experience.

## Resetting Data
If you need to start over, you can use the **Reset All Data** button in the Settings panel, or manually clear your browser's LocalStorage for the file/domain.

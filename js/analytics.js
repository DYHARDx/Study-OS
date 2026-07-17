// ==========================================================
//  Analytics – Chart Rendering
// ==========================================================

const Analytics = {
  charts: {},

  init() {
    this.renderBarChart(1, 'weeklyChart');      // Dashboard chart defaults to 24 hours
    this.renderBarChart(7, 'an-weeklyChart');   // Analytics page chart
    this.renderDistChart('distributionChart');
    this.renderDistChart('an-distChart');
    this.updateStats();
    this.updateDashboardMetrics();
  },

  // ---- Bar Chart (Study Hours over time) ----
  renderBarChart(days, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const history = Storage.get(Storage.KEYS.HISTORY) || {};
    const today = new Date().toISOString().split('T')[0];

    const labels = [];
    const data = [];

    if (days === 1) {
      // Hourly breakdown
      const logs = Storage.get(Storage.KEYS.LOGS) || [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i, 0, 0, 0);
        const next = new Date(hour); next.setHours(hour.getHours() + 1);
        labels.push(`${pad(hour.getHours())}:00`);
        const mins = logs
          .filter(l => l.timestamp && new Date(l.timestamp) >= hour && new Date(l.timestamp) < next)
          .reduce((s, l) => s + (l.minutes || 0), 0);
        data.push(+(mins / 60).toFixed(2));
      }
    } else {
      // Daily breakdown
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];

        // Label: show full date for <=14 days, else compact
        if (days <= 14) {
          labels.push(ds.slice(5).replace('-', '/'));
        } else {
          labels.push(i % Math.ceil(days / 12) === 0 ? ds.slice(5).replace('-','/') : '');
        }

        let mins = 0;
        if (ds === today) {
          const logs = Storage.get(Storage.KEYS.LOGS) || [];
          mins = logs.filter(l => l.date === today && l.minutes).reduce((s, l) => s + l.minutes, 0);
        } else if (history[ds]) {
          mins = history[ds].totalMinutes || 0;
        }
        data.push(+(mins / 60).toFixed(2));
      }
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9BA3C4' : '#4A5577';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,22,41,0.05)';

    if (this.charts[canvasId]) { this.charts[canvasId].destroy(); }

    this.charts[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Hours',
          data,
          backgroundColor: isDark ? 'rgba(123,127,212,0.7)' : 'rgba(91,95,199,0.75)',
          borderColor: isDark ? '#7B7FD4' : '#5B5FC7',
          borderWidth: 0,
          borderRadius: 5,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} hrs` } }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            border: { dash: [4, 4] },
            ticks: { color: textColor, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10 }, maxRotation: 0 }
          }
        }
      }
    });
  },

  // ---- Doughnut Chart (Subject Distribution) ----
  renderDistChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const history = Storage.get(Storage.KEYS.HISTORY) || {};
    const today = new Date().toISOString().split('T')[0];
    const cats = { webdev: 0, maths: 0, reasoning: 0, computer: 0, english: 0, revision: 0 };

    Object.values(history).forEach(log => {
      if (log.categories) for (const cat in cats) cats[cat] += log.categories[cat] || 0;
    });

    const logs = Storage.get(Storage.KEYS.LOGS) || [];
    logs.filter(l => l.date === today && l.minutes).forEach(l => {
      if (cats[l.category] !== undefined) cats[l.category] += l.minutes;
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9BA3C4' : '#4A5577';

    if (this.charts[canvasId]) { this.charts[canvasId].destroy(); }

    this.charts[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Web Dev', 'Maths', 'Reasoning', 'Computer', 'English', 'Revision'],
        datasets: [{
          data: Object.values(cats),
          backgroundColor: ['#5B5FC7','#10B981','#F59E0B','#EF4444','#8B5CF6','#14B8A6'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        animation: { duration: 500 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 },
              color: textColor
            }
          },
          tooltip: { callbacks: { label: ctx => ` ${(ctx.parsed / 60).toFixed(1)} hrs` } }
        }
      }
    });
  },

  // ---- Stats ----
  updateStats() {
    const user = Storage.get(Storage.KEYS.USER);
    setText('an-longest-streak', user.longestStreak || 0);
    setText('an-total-hours', (user.totalStudyHours || 0).toFixed(1));
    setText('an-missed', user.missedDays || 0);

    const prog = Planner.calculateOverallProgress();
    let total = 0, done = 0;
    for (const cat in prog.categories) { total += prog.categories[cat].total; done += prog.categories[cat].completed; }
    const remaining = total - done;
    const daysActive = Math.max(1, user.currentDayNumber);
    const avgPerDay = done > 0 ? done / daysActive : 2;
    const daysLeft = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : 0;
    const etaDate = new Date(); etaDate.setDate(etaDate.getDate() + daysLeft);
    setText('an-eta', daysLeft > 0 ? etaDate.toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '🎉');
    setText('an-eta-sub', daysLeft > 0 ? `${daysLeft} days left` : '');
  },

  // ---- Dashboard overview metrics ----
  updateDashboardMetrics() {
    const history = Storage.get(Storage.KEYS.HISTORY) || {};
    const settings = Storage.get(Storage.KEYS.SETTINGS);
    const targets = settings.targets || {};

    // Compute today's total (24 hours)
    let totalTarget = Object.values(targets).reduce((s, v) => s + parseFloat(v) * 60, 0);
    let totalActual = 0;
    const today = new Date().toISOString().split('T')[0];
    
    const logs = Storage.get(Storage.KEYS.LOGS) || [];
    totalActual += logs.filter(l => l.date === today && l.minutes).reduce((s, l) => s + l.minutes, 0);

    const completion = totalTarget > 0 ? Math.min(100, Math.round(totalActual / totalTarget * 100)) : 0;
    setText('chart-target', fmtTimeShort(totalTarget));
    setText('chart-actual', fmtTimeShort(totalActual));
    setText('chart-completion', `${completion}%`);
  }
};

function fmtTimeShort(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }

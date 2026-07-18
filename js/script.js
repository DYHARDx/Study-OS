// ==========================================================
//  StudyOS – Main Application Script
// ==========================================================

// Subject configs
const SUBJECT_CONFIG = {
  webdev: { label: 'Web Dev', color: '#5B5FC7', icon: '💻', colorVar: 'indigo' },
  maths: { label: 'Maths', color: '#10B981', icon: '📐', colorVar: 'green' },
  reasoning: { label: 'Reasoning', color: '#F59E0B', icon: '🧩', colorVar: 'amber' },
  computer: { label: 'Computer', color: '#EF4444', icon: '🖥️', colorVar: 'red' },
  english: { label: 'English', color: '#8B5CF6', icon: '📖', colorVar: 'purple' },
  revision: { label: 'Revision', color: '#14B8A6', icon: '📝', colorVar: 'teal' }
};

const QUOTES = [
  { q: 'Consistency is the key to success.', sub: 'Keep going, your future self is proud of you! 💪', author: '' },
  { q: '"Small daily improvements lead to stunning results."', sub: '', author: '– Robin Sharma' },
  { q: 'Success is the sum of small efforts, repeated day-in and day-out.', sub: '', author: '– Robert Collier' },
  { q: '"Don\'t watch the clock; do what it does. Keep going."', sub: '', author: '– Sam Levenson' },
  { q: 'The secret of getting ahead is getting started.', sub: '', author: '– Mark Twain' },
  { q: '"Hard work beats talent when talent doesn\'t work hard."', sub: '', author: '– Tim Notke' },
  { q: 'It always seems impossible until it\'s done.', sub: '', author: '– Nelson Mandela' },
  { q: '"A little progress each day adds up to big results."', sub: '', author: '' }
];

// Timer state
let timerInterval = null;
let timerSecs = 0;
let timerCat = null;
let timerTopicId = null;

// Checkin state
let checkinState = { mood: 4, sleep: 7.0, water: 3, note: '' };

// ==========================================================
//  INIT
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  Storage.init();
  Scheduler.checkDayTransition();

  const settings = Storage.get(Storage.KEYS.SETTINGS);
  document.documentElement.setAttribute('data-theme', settings.theme || 'light');
  updateThemeIcon(settings.theme || 'light');

  setupNav();
  setupThemeToggle();
  setupMobileMenu();
  setupTimerModal();
  setupSettingsPage();
  setupNimcetTabs();
  setupSearches();
  setupChartPeriodDropdowns();
  setupQuickAdd();
  setupCheckinListeners();

  renderAll();
});

// ==========================================================
//  RENDER ALL
// ==========================================================
function renderAll() {
  renderHeader();
  renderDashboard();
}

// ==========================================================
//  NAVIGATION
// ==========================================================
function setupNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(`view-${viewId}`);
  const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (view) view.classList.add('active');
  if (navItem) navItem.classList.add('active');

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('show');

  // Lazy render each view
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'planner') renderPlannerView();
  if (viewId === 'webdev') renderWebdevView();
  if (viewId === 'nimcet') renderNimcetView('maths');
  if (viewId === 'checkin') renderCheckinView();
  if (viewId === 'analytics') Analytics.init();
  if (viewId === 'settings') loadSettingsValues();
}

// ==========================================================
//  HEADER
// ==========================================================
function renderHeader() {
  const user = Storage.get(Storage.KEYS.USER);
  const now = new Date();
  const h = now.getHours();
  const emoji = h < 12 ? '☀️' : h < 17 ? '🌤️' : '🌙';
  const greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';

  const el = document.getElementById('header-greeting');
  if (el) el.textContent = `${greeting}, Amu! ${emoji}`;

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sub = document.getElementById('header-sub');
  if (sub) sub.textContent = `${dateStr} • Day ${user.currentDayNumber}`;

  const st = document.getElementById('header-streak');
  if (st) st.textContent = user.streak;
}

// ==========================================================
//  DASHBOARD
// ==========================================================
function renderDashboard() {
  renderHeader();
  renderStatCards();
  renderTodayPlanList();
  renderSubjectProgress();
  renderUpcomingLists();
  renderQuote();
  renderInternshipBanner();
  renderCheckinWidget();
}

function renderStatCards() {
  const user = Storage.get(Storage.KEYS.USER);
  const targets = Planner.getTodayTargets();
  const completed = Planner.getTodayCompletedTime();
  const prog = Planner.calculateOverallProgress();

  const totalTargetMins = Object.values(targets).reduce((s, v) => s + parseFloat(v) * 60, 0);
  const completedMins = completed.total;
  const remainingMins = Math.max(0, totalTargetMins - completedMins);
  const pct = totalTargetMins > 0 ? Math.min(100, Math.round(completedMins / totalTargetMins * 100)) : 0;

  setText('stat-today-hours', fmtTime(completedMins));
  setText('stat-today-goal', `Goal: ${fmtTime(totalTargetMins)}`);
  setStyle('stat-today-bar', 'width', `${pct}%`);

  setText('stat-remaining', fmtTime(remainingMins));
  setText('stat-remaining-sub', `${pct}% of daily goal done`);
  setStyle('stat-remaining-bar', 'width', `${Math.max(0, 100 - pct)}%`);

  // Overall progress
  let totalT = 0, completedT = 0;
  for (const cat in prog.categories) {
    totalT += prog.categories[cat].total;
    completedT += prog.categories[cat].completed;
  }
  const overallPct = totalT > 0 ? Math.round(completedT / totalT * 100) : 0;
  setText('stat-overall-pct', `${overallPct}%`);
  setText('stat-tasks-done', `${completedT} / ${totalT} Tasks Done`);

  setText('stat-streak', `${user.streak} Days`);
  setText('stat-best-streak', `Best: ${user.longestStreak} Days`);

  // ETA
  const remaining = totalT - completedT;
  const daysActive = Math.max(1, user.currentDayNumber);
  const avgPerDay = completedT > 0 ? completedT / daysActive : 2;
  const daysLeft = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : 0;
  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + daysLeft);
  setText('stat-eta', daysLeft > 0 ? etaDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '🎉 Done!');
  setText('stat-eta-sub', daysLeft > 0 ? `${daysLeft} days left` : 'Completed!');
}

function renderInternshipBanner() {
  const banner = document.getElementById('internship-banner');
  const tag = document.getElementById('planner-internship-tag');
  const show = Planner.isInternshipDay();
  if (banner) banner.style.display = show ? 'flex' : 'none';
  if (tag) tag.style.display = show ? 'flex' : 'none';
}

function renderTodayPlanList() {
  const container = document.getElementById('today-plan-list');
  if (!container) return;

  const tasks = Planner.generateTodayPlan();
  container.innerHTML = '';

  if (!tasks.length) {
    container.innerHTML = `<div style="text-align:center; padding:24px; color:var(--color-text-3); font-size:0.875rem;">🎉 All tasks done for today!</div>`;
    setText('plan-total-time', '0h 0m');
    return;
  }

  let totalMins = 0;
  tasks.forEach(task => {
    totalMins += task.targetMins;
    container.appendChild(createPlanCard(task, false));
  });
  setText('plan-total-time', fmtTime(totalMins));
}

function renderSubjectProgress() {
  const prog = Planner.calculateOverallProgress();
  const container = document.getElementById('subject-progress-list');
  if (!container) return;
  container.innerHTML = '';

  const catOrder = ['webdev', 'maths', 'reasoning', 'computer', 'english', 'revision'];
  catOrder.forEach(cat => {
    const cfg = SUBJECT_CONFIG[cat];
    const p = prog.categories[cat];
    const pct = p ? p.percentage : 0;
    const div = document.createElement('div');
    div.className = 'prog-item';
    div.innerHTML = `
      <div class="prog-item-dot" style="background:${cfg.color};"></div>
      <div class="prog-item-name">${cfg.label}</div>
      <div style="flex:1; height:4px; background:var(--color-surface-3); border-radius:99px; overflow:hidden; margin:0 8px;">
        <div style="height:100%; border-radius:99px; background:${cfg.color}; width:${pct}%; transition:width 0.8s var(--ease);"></div>
      </div>
      <div class="prog-item-pct">${pct}%</div>
    `;
    container.appendChild(div);
  });
}

function renderUpcomingLists() {
  // Web Dev
  const wdContainer = document.getElementById('upcoming-webdev-list');
  if (wdContainer) {
    wdContainer.innerHTML = '';
    const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
    const items = syllabus.webdev.filter(t => !t.completed).slice(0, 6);
    items.forEach(t => wdContainer.appendChild(createTopicRow(t, 'webdev')));
  }

  // NIMCET Maths
  const nmContainer = document.getElementById('upcoming-nimcet-list');
  if (nmContainer) {
    nmContainer.innerHTML = '';
    const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
    const items = syllabus.maths.filter(t => !t.completed).slice(0, 5);
    items.forEach(t => nmContainer.appendChild(createTopicRow(t, 'maths')));
  }
}

function createTopicRow(topic, cat) {
  const div = document.createElement('div');
  div.className = 'topic-row';

  let tagHtml = '';
  if (topic.completed) {
    tagHtml = `<span class="topic-tag done">✓ Done</span>`;
  } else if (topic.status === 'unlocked') {
    tagHtml = `<span class="topic-tag next-up">Next Up</span>`;
  } else if (topic.status === 'in-progress') {
    tagHtml = `<span class="topic-tag in-progress">In Progress</span>`;
  } else {
    tagHtml = `<span class="topic-tag locked"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked</span>`;
  }

  const numMatch = topic.title.match(/^(\d+)\./);
  const num = numMatch ? numMatch[1] : '?';

  const timeSpentHtml = topic.timeSpent > 0 ? `<span class="topic-time">${fmtTime(topic.timeSpent)}</span>` : `<span class="topic-time">1h</span>`;

  div.innerHTML = `
    <div class="topic-num">${num}</div>
    <div class="topic-name">${topic.title.replace(/^\d+\.\s*/, '')}</div>
    ${tagHtml}
    ${timeSpentHtml}
  `;
  return div;
}

function renderQuote() {
  const user = Storage.get(Storage.KEYS.USER);
  const q = QUOTES[user.currentDayNumber % QUOTES.length];
  const qMain = document.getElementById('quote-main');
  const qSub = document.getElementById('quote-sub');
  const qSec = document.getElementById('quote-secondary');
  if (qMain) qMain.textContent = q.q;
  if (qSub) qSub.textContent = q.sub;
  if (qSec) qSec.textContent = q.author;
}

// ==========================================================
//  PLANNER VIEW
// ==========================================================
function renderPlannerView() {
  renderInternshipBanner();
  const sub = document.getElementById('planner-date-sub');
  const now = new Date();
  if (sub) sub.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const container = document.getElementById('planner-task-list');
  if (!container) return;
  container.innerHTML = '';

  const tasks = Planner.generateTodayPlan();
  if (!tasks.length) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--color-text-3);">🎉 All tasks complete for today!</div>`;
    return;
  }
  tasks.forEach(task => container.appendChild(createPlanCard(task, true)));
}

function createPlanCard(task, expandable) {
  const cfg = SUBJECT_CONFIG[task.category];
  const pct = task.targetMins > 0 ? Math.min(100, Math.round(task.spentMins / task.targetMins * 100)) : 0;
  const remainingMins = Math.max(0, task.targetMins - task.spentMins);

  let statusClass = 'pending', statusLabel = 'Pending', statusDot = 'var(--color-amber)';
  if (task.completed) { statusClass = 'completed'; statusLabel = 'Done'; statusDot = 'var(--color-green)'; }
  else if (task.spentMins > 0) { statusClass = 'in-progress'; statusLabel = 'In Progress'; statusDot = 'var(--color-blue)'; }
  else if (task.locked) { statusClass = 'locked'; statusLabel = 'Locked'; statusDot = 'var(--color-text-4)'; }
  if (task.priority === 'high' && !task.completed) { statusClass = 'priority'; statusLabel = 'Priority'; statusDot = 'var(--color-red)'; }

  const progressColor = cfg.color;

  const div = document.createElement('div');
  div.className = `plan-card${expandable ? ' expandable' : ''}`;
  div.dataset.topicId = task.id;
  div.dataset.cat = task.category;

  const trackBtnHtml = (!task.completed && !task.locked) 
    ? `<button class="play-inline-btn" title="Start Tracking" onclick="event.stopPropagation(); openTimer('${task.category}', '${task.id}', '${task.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
       </button>`
    : ``;

  div.innerHTML = `
    <div class="plan-card-header" onclick="${expandable ? `togglePlanCard(this.parentElement)` : ''}">
      <div class="plan-subject-icon" style="background:${cfg.color}15; color:${cfg.color};">
        ${cfg.icon}
      </div>
      
      <div class="plan-info">
        <div class="plan-subject-name">${cfg.label}</div>
        <div class="plan-chapter-name">${task.title}</div>
        
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <span class="plan-status-badge ${statusClass}">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${statusDot}; margin-right:4px;"></span>
            ${statusLabel}
          </span>
          <span class="plan-time-badge">${fmtTime(task.targetMins)}</span>
        </div>
      </div>
      
      <div style="display:flex; align-items:center; margin-left:auto;">
        ${trackBtnHtml}
      </div>
    </div>

    <div style="padding: 0 16px 12px; display:flex; align-items:center; gap:8px;">
      <div class="plan-progress-bar-wrap">
        <div class="plan-progress-bar-fill" style="width:${pct}%; background:${progressColor};"></div>
      </div>
      <div class="plan-progress-pct">${pct}%</div>
    </div>

    ${expandable ? `
    <div class="plan-card-body">
      <div class="plan-body-grid">
        <div class="plan-body-stat">
          <div class="plan-body-stat-label">Target</div>
          <div class="plan-body-stat-val">${fmtTime(task.targetMins)}</div>
        </div>
        <div class="plan-body-stat">
          <div class="plan-body-stat-label">Studied</div>
          <div class="plan-body-stat-val">${fmtTime(task.spentMins)}</div>
        </div>
        <div class="plan-body-stat">
          <div class="plan-body-stat-label">Remaining</div>
          <div class="plan-body-stat-val">${fmtTime(remainingMins)}</div>
        </div>
      </div>
      <div class="plan-body-actions">
        ${!task.completed && !task.locked ? `<button class="btn btn-success btn-sm" onclick="markTopicDone('${task.category}', '${task.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Mark Complete
        </button>` : ''}
        ${!task.completed && !task.locked ? `<button class="btn btn-ghost btn-sm" onclick="openTimer('${task.category}', '${task.id}', '${task.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', true)">
          ✍ Manual Hours
        </button>` : ''}
      </div>
    </div>
    ` : `
    `}
  `;
  return div;
}

function togglePlanCard(card) {
  card.classList.toggle('expanded');
}

// ==========================================================
//  WEB DEV VIEW
// ==========================================================
function renderWebdevView(query = '') {
  const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
  const prog = Planner.calculateOverallProgress();
  const targets = Planner.getTodayTargets();
  const completed = Planner.getTodayCompletedTime();

  setText('wd-daily-target', `${targets.webdev}h`);
  setText('wd-today-done', fmtTime(completed.webdev));

  const wdProg = prog.categories.webdev;
  const pct = wdProg.percentage;
  setText('wd-progress-pct', `${pct}%`);
  setStyle('wd-progress-bar', 'width', `${pct}%`);
  setText('wd-progress-sub', `${wdProg.completed} / ${wdProg.total} chapters completed`);

  const container = document.getElementById('webdev-list');
  if (!container) return;
  container.innerHTML = '';

  const q = query.toLowerCase();
  syllabus.webdev
    .filter(t => t.title.toLowerCase().includes(q))
    .forEach(t => container.appendChild(createChapterCard(t, 'webdev')));
}

// ==========================================================
//  NIMCET VIEW
// ==========================================================
let activeCat = 'maths';

function renderNimcetView(cat) {
  activeCat = cat;
  const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
  const targets = Planner.getTodayTargets();
  const prog = Planner.calculateOverallProgress();
  const completed = Planner.getTodayCompletedTime();

  const catProg = prog.categories[cat];
  const label = SUBJECT_CONFIG[cat].label;
  const nimTotal = ['maths', 'reasoning', 'computer', 'english', 'revision']
    .reduce((s, c) => s + (completed[c] || 0), 0);

  setText('nimcet-today-done', fmtTime(nimTotal));
  setText('nimcet-section-label', `${label} Progress`);
  setText('nimcet-section-pct', `${catProg.percentage}%`);
  setStyle('nimcet-section-bar', 'width', `${catProg.percentage}%`);
  setText('nimcet-section-sub', `Daily target: ${targets[cat]}h • ${catProg.completed}/${catProg.total} done`);

  // Tabs
  document.querySelectorAll('#nimcet-tabs .btn').forEach(b => {
    b.classList.toggle('btn-primary', b.dataset.cat === cat);
    b.classList.toggle('btn-ghost', b.dataset.cat !== cat);
  });

  const container = document.getElementById('nimcet-list');
  if (!container) return;
  container.innerHTML = '';

  const q = (document.getElementById('search-nimcet')?.value || '').toLowerCase();
  (syllabus[cat] || [])
    .filter(t => t.title.toLowerCase().includes(q))
    .forEach(t => container.appendChild(createChapterCard(t, cat)));
}

function setupNimcetTabs() {
  document.querySelectorAll('#nimcet-tabs .btn').forEach(btn => {
    btn.addEventListener('click', () => renderNimcetView(btn.dataset.cat));
  });
}

// ==========================================================
//  CHAPTER CARD (Web Dev & NIMCET list views)
// ==========================================================
function createChapterCard(topic, cat) {
  const cfg = SUBJECT_CONFIG[cat];
  const div = document.createElement('div');
  div.className = `plan-card`;

  let statusClass = 'pending', statusLabel = 'Pending';
  if (topic.completed) { statusClass = 'completed'; statusLabel = '✓ Done'; }
  else if (topic.status === 'unlocked') { statusClass = 'in-progress'; statusLabel = 'Active'; }
  else { statusClass = 'locked'; statusLabel = '🔒 Locked'; }

  const pct = topic.completed ? 100 : 0;
  const trackBtn = !topic.completed && topic.status === 'unlocked'
    ? `<button class="btn btn-primary btn-sm" onclick="openTimer('${cat}','${topic.id}','${topic.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">▶ Track</button>`
    : '';
  const completeBtn = !topic.completed && topic.status === 'unlocked'
    ? `<button class="btn btn-success btn-sm" onclick="markTopicDone('${cat}','${topic.id}')">✓ Complete</button>`
    : '';

  div.innerHTML = `
    <div class="plan-card-header">
      <div class="plan-subject-icon" style="background:${cfg.color}20; color:${cfg.color};">${cfg.icon}</div>
      <div class="plan-info">
        <div class="plan-chapter-name">${topic.title}</div>
        <div class="plan-subject-name">${fmtTime(topic.timeSpent)} logged</div>
      </div>
      <span class="plan-status-badge ${statusClass}">${statusLabel}</span>
    </div>
    <div style="padding:0 16px 10px; display:flex; align-items:center; gap:8px;">
      <div class="plan-progress-bar-wrap">
        <div class="plan-progress-bar-fill" style="width:${pct}%; background:${cfg.color};"></div>
      </div>
      <div class="plan-progress-pct">${pct}%</div>
    </div>
    ${trackBtn || completeBtn ? `<div style="padding:0 16px 14px; display:flex; gap:6px;">${trackBtn}${completeBtn}</div>` : ''}
  `;
  return div;
}

// ==========================================================
//  TIMER MODAL
// ==========================================================
function setupTimerModal() {
  document.getElementById('timer-start-btn').addEventListener('click', startTimer);
  document.getElementById('timer-pause-btn').addEventListener('click', pauseTimer);
  document.getElementById('timer-save-btn').addEventListener('click', saveTimerTime);
  document.getElementById('manual-add-btn').addEventListener('click', saveManualTime);
  document.getElementById('mark-complete-btn').addEventListener('click', markCurrentComplete);
}

function openTimer(cat, topicId, title, focusManual = false) {
  timerCat = cat;
  timerTopicId = topicId;
  timerSecs = 0;
  updateStopwatch();

  setText('timer-modal-title', title);
  const sub = document.getElementById('stopwatch-topic-sub');
  if (sub) sub.textContent = `${SUBJECT_CONFIG[cat]?.label} • ${SUBJECT_CONFIG[cat]?.icon}`;

  document.getElementById('timer-start-btn').style.display = 'inline-flex';
  document.getElementById('timer-pause-btn').style.display = 'none';
  document.getElementById('timer-start-btn').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start`;
  document.getElementById('manual-h').value = 0;
  document.getElementById('manual-m').value = 0;

  openModal('timer-modal');
}

function quickAdd(cat) {
  const syllabus = Storage.get(Storage.KEYS.SYLLABUS);
  const topic = syllabus[cat]?.find(t => t.status === 'unlocked' && !t.completed);
  if (topic) openTimer(cat, topic.id, topic.title);
  else toast(`No active ${SUBJECT_CONFIG[cat].label} topic`);
}

function startTimer() {
  if (timerInterval) return;
  document.getElementById('timer-start-btn').style.display = 'none';
  document.getElementById('timer-pause-btn').style.display = 'inline-flex';
  timerInterval = setInterval(() => { timerSecs++; updateStopwatch(); }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById('timer-start-btn').style.display = 'inline-flex';
  document.getElementById('timer-pause-btn').style.display = 'none';
  document.getElementById('timer-start-btn').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume`;
}

function saveTimerTime() {
  if (timerInterval) pauseTimer();
  const mins = Math.floor(timerSecs / 60);
  if (mins < 1) { toast('Study at least 1 minute!', 'error'); return; }
  Scheduler.logTime(timerCat, timerTopicId, mins);
  timerSecs = 0;
  updateStopwatch();
  toast(`${fmtTime(mins)} saved! ✅`, 'success');
  refreshAll();
}

function saveManualTime() {
  const h = parseInt(document.getElementById('manual-h').value) || 0;
  const m = parseInt(document.getElementById('manual-m').value) || 0;
  const total = h * 60 + m;
  if (total < 1) { toast('Enter valid time!', 'error'); return; }
  Scheduler.logTime(timerCat, timerTopicId, total);
  document.getElementById('manual-h').value = 0;
  document.getElementById('manual-m').value = 0;
  toast(`${fmtTime(total)} added! ✅`, 'success');
  refreshAll();
}

function markCurrentComplete() {
  if (timerInterval) pauseTimer();
  Planner.markTopicComplete(timerCat, timerTopicId);
  toast('Chapter complete! Next one unlocked 🎉', 'success');
  closeModal('timer-modal');
  refreshAll();
}

function markTopicDone(cat, topicId) {
  Planner.markTopicComplete(cat, topicId);
  toast('Chapter complete! 🎉', 'success');
  refreshAll();
}

function updateStopwatch() {
  const h = Math.floor(timerSecs / 3600);
  const m = Math.floor((timerSecs % 3600) / 60);
  const s = timerSecs % 60;
  const el = document.getElementById('stopwatch-display');
  if (el) el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}



// ==========================================================
//  SETTINGS
// ==========================================================
function setupSettingsPage() {
  document.getElementById('save-settings-btn').addEventListener('click', () => {
    const settings = Storage.get(Storage.KEYS.SETTINGS);
    settings.targets.webdev = parseFloat(document.getElementById('s-webdev').value) || 4;
    const nimcetTarget = parseFloat(document.getElementById('s-nimcet').value) || 3;
    settings.targets.maths = nimcetTarget;
    settings.targets.reasoning = 0;
    settings.targets.computer = 0;
    settings.targets.english = 0;
    Storage.set(Storage.KEYS.SETTINGS, settings);
    toast('Settings saved!', 'success');
    refreshAll();
  });

  document.getElementById('export-btn').addEventListener('click', () => Storage.exportData());

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Sab data delete ho jayega! Are you sure?')) {
      Storage.resetAll();
      window.location.reload();
    }
  });

  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (Storage.importData(evt.target.result)) {
        toast('Data imported!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast('Import failed', 'error');
      }
    };
    reader.readAsText(file);
  });
}

function loadSettingsValues() {
  const t = Storage.get(Storage.KEYS.SETTINGS).targets;
  setValue('s-webdev', t.webdev);
  
  // Combine all NIMCET targets into one for the display
  const nimcetTotal = (t.maths || 0) + (t.reasoning || 0) + (t.computer || 0) + (t.english || 0) + (t.revision || 0);
  setValue('s-nimcet', nimcetTotal);
}

// ==========================================================
//  SEARCH
// ==========================================================
function setupSearches() {
  document.getElementById('search-webdev')?.addEventListener('input', e => renderWebdevView(e.target.value));
  document.getElementById('search-nimcet')?.addEventListener('input', e => renderNimcetView(activeCat));
}

// ==========================================================
//  THEME
// ==========================================================
function setupThemeToggle() {
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    updateThemeIcon(next);
    const s = Storage.get(Storage.KEYS.SETTINGS);
    s.theme = next;
    Storage.set(Storage.KEYS.SETTINGS, s);
    // re-render charts
    Analytics.init();
  });
}

function updateThemeIcon(theme) {
  const el = document.getElementById('theme-icon');
  if (!el) return;
  if (theme === 'dark') {
    el.outerHTML = `<svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  } else {
    el.outerHTML = `<svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>`;
  }
}

// ==========================================================
//  MOBILE MENU
// ==========================================================
function setupMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  });

  backdrop?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
  });
}

// ==========================================================
//  CHART PERIOD DROPDOWNS
// ==========================================================
function setupChartPeriodDropdowns() {
  ['chart-period-select', 'an-chart-period'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      const days = parseInt(e.target.value);
      const labels = { 1: 'Last 24 Hours', 7: 'Last 7 Days', 30: 'Last 30 Days', 60: 'Last 60 Days', 90: 'Last 90 Days' };
      const lEl = document.getElementById('an-chart-label');
      if (lEl) lEl.textContent = `Study Hours – ${labels[days]}`;
      Analytics.renderBarChart(days, id === 'chart-period-select' ? 'weeklyChart' : 'an-weeklyChart');
    });
  });
}

function setupQuickAdd() {
  // buttons already have onclick attrs
}

// ==========================================================
//  MODAL UTILS
// ==========================================================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  if (id === 'timer-modal' && timerInterval) pauseTimer();
  document.getElementById(id).classList.remove('open');
}

// ==========================================================
//  REFRESH
// ==========================================================
function refreshAll() {
  const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
  renderHeader();
  renderStatCards();

  if (activeView === 'dashboard') renderDashboard();
  if (activeView === 'planner') renderPlannerView();
  if (activeView === 'webdev') renderWebdevView(document.getElementById('search-webdev')?.value || '');
  if (activeView === 'nimcet') renderNimcetView(activeCat);
  if (activeView === 'checkin') renderCheckinView();
  if (activeView === 'analytics') Analytics.init();
}

// ==========================================================
//  HELPERS
// ==========================================================
function fmtTime(mins) {
  if (!mins || isNaN(mins)) return '0h 0m';
  const m = Math.round(mins);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
function setStyle(id, prop, val) { const el = document.getElementById(id); if (el) el.style[prop] = val; }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

function toast(msg, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s var(--ease) both';
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ==========================================================
//  CHECK-IN LOGIC
// ==========================================================
let currentCheckin = { mood: 4, sleep: 7.0, water: 3 };

function setupCheckinListeners() {
  document.querySelectorAll('#mood-row .checkin-emoji').forEach(el => {
    el.addEventListener('click', (e) => {
      document.querySelectorAll('#mood-row .checkin-emoji').forEach(x => x.classList.remove('selected'));
      e.target.classList.add('selected');
      currentCheckin.mood = parseInt(e.target.dataset.mood);
    });
  });
  
  document.querySelectorAll('[data-mood2]').forEach(el => {
    el.addEventListener('click', (e) => {
      document.querySelectorAll('[data-mood2]').forEach(x => x.classList.remove('selected'));
      e.target.classList.add('selected');
      currentCheckin.mood = parseInt(e.target.dataset.mood2);
    });
  });
}



function saveCheckinPage() {
  const sleep = parseFloat(document.getElementById('ci-sleep')?.value || 7);
  const water = parseInt(document.getElementById('ci-water')?.value || 3);
  const win = document.getElementById('ci-win')?.value || '';
  const note = document.getElementById('ci-note')?.value || '';
  
  _saveCheckin(currentCheckin.mood, sleep, water, note, win);
  renderCheckinView();
  toast('Check-in saved successfully!', 'success');
}

function _saveCheckin(mood, sleep, water, note, win) {
  const checkins = Storage.get(Storage.KEYS.CHECKINS) || [];
  const today = new Date().toISOString().split('T')[0];
  
  const existingIdx = checkins.findIndex(c => c.date === today);
  const data = { date: today, mood, sleep, water, note, win, timestamp: Date.now() };
  
  if (existingIdx >= 0) checkins[existingIdx] = data;
  else checkins.unshift(data);
  
  Storage.set(Storage.KEYS.CHECKINS, checkins);
}

function hasCheckedInToday() {
  const checkins = Storage.get(Storage.KEYS.CHECKINS) || [];
  const today = new Date().toISOString().split('T')[0];
  return checkins.some(c => c.date === today);
}

function renderCheckinWidget() {
  const form = document.getElementById('checkin-form-body');
  const done = document.getElementById('checkin-done-state');
  if (!form || !done) return;
  
  if (hasCheckedInToday()) {
    form.style.display = 'none';
    done.style.display = 'block';
  } else {
    form.style.display = 'block';
    done.style.display = 'none';
  }
}

function renderCheckinView() {
  const hasDone = hasCheckedInToday();
  const formCard = document.getElementById('checkin-page-form');
  const doneBanner = document.getElementById('checkin-page-done');
  
  if (formCard && doneBanner) {
    if (hasDone) {
      formCard.style.display = 'none';
      doneBanner.style.display = 'block';
    } else {
      formCard.style.display = 'block';
      doneBanner.style.display = 'none';
    }
  }

  const list = document.getElementById('checkin-history-list');
  if (!list) return;
  list.innerHTML = '';
  
  const checkins = Storage.get(Storage.KEYS.CHECKINS) || [];
  if (checkins.length === 0) {
    list.innerHTML = '<div style="color:var(--color-text-3); font-size:0.85rem;">No past entries found.</div>';
    return;
  }
  
  const moodEmoji = {1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😁'};
  
  checkins.forEach(c => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = '16px';
    
    let html = `
      <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <div style="font-weight:600; font-size:0.9rem;">${new Date(c.date).toLocaleDateString('en-IN', {weekday:'long', month:'short', day:'numeric'})}</div>
        <div style="font-size:1.2rem;">${moodEmoji[c.mood] || '😐'}</div>
      </div>
      <div style="display:flex; gap:16px; font-size:0.8rem; color:var(--color-text-2); margin-bottom:8px;">
        <div>💤 ${c.sleep}h</div>
        <div>💧 ${c.water} glasses</div>
      </div>
    `;
    if (c.win) html += `<div style="font-size:0.8rem; margin-top:8px;">🏆 <strong>Win:</strong> ${c.win}</div>`;
    if (c.note) html += `<div style="font-size:0.8rem; margin-top:4px; color:var(--color-text-3); font-style:italic;">"${c.note}"</div>`;
    
    div.innerHTML = html;
    list.appendChild(div);
  });
}


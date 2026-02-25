/* ════════════════════════════════════════════
   KANBAN — Application Logic
   Features: LocalStorage, Drag & Drop, CRUD
   ════════════════════════════════════════════ */

'use strict';

/* ── Constants ── */
const COLS      = ['todo', 'progress', 'done'];
const LABELS    = { todo: 'To Do', progress: 'In Progress', done: 'Done' };
const STORE_KEY = 'kanban_editorial_v1';

/* ── State ── */
let tasks    = [];
let nextId   = 1;
let dragId   = null;
let formOpen = false;
let toastTimer;

/* ════ PERSISTENCE ════ */
function saveToStorage() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ tasks, nextId }));
  } catch (e) {
    console.warn('Storage error:', e);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      tasks  = Array.isArray(data.tasks) ? data.tasks : [];
      nextId = typeof data.nextId === 'number' ? data.nextId : tasks.length + 1;
      return;
    }
  } catch (e) {
    console.warn('Storage read error:', e);
  }

  /* ── Default seed tasks ── */
  tasks = [
    { id: 1, title: 'Build Api',        desc: 'Setup Node.js and Express for the backend',   col: 'todo',     date: 'Feb 20' },
    { id: 2, title: 'Register Page',    desc: 'Create register page with React',              col: 'todo',     date: 'Feb 21' },
    { id: 3, title: 'Integrate Login',  desc: 'Connect Login APIs to the frontend',           col: 'todo',     date: 'Feb 22' },
    { id: 4, title: 'Login Page',       desc: 'Create Login page with React',                 col: 'progress', date: 'Feb 23' },
    { id: 5, title: 'Initiate Project', desc: 'Setup the environment for the MERN project',  col: 'done',     date: 'Feb 18' },
  ];
  nextId = 10;
  saveToStorage();
}

/* ════ TOAST ════ */
function showToast(message) {
  clearTimeout(toastTimer);
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ════ UTILITIES ════ */
const sanitize = str => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const padNum = n => String(n).padStart(2, '0');

function todayDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ════ RENDER ════ */
function render() {
  COLS.forEach(col => {
    const zone  = document.getElementById('zone-' + col);
    const ghost = zone.querySelector('.drop-ghost');

    /* Clear existing cards (keep ghost) */
    Array.from(zone.children).forEach(child => {
      if (child !== ghost) child.remove();
    });

    const colTasks = tasks.filter(t => t.col === col);
    const colIdx   = COLS.indexOf(col);

    /* Update count badge */
    document.getElementById('cnt-' + col).textContent = padNum(colTasks.length);

    /* Empty state */
    if (colTasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-hint';
      empty.textContent = '— no items —';
      zone.appendChild(empty);
    }

    /* Render cards */
    colTasks.forEach((task, i) => {
      const card = buildCard(task, colIdx, i + 1);
      zone.appendChild(card);
    });
  });

  /* Global stat */
  document.getElementById('stat').textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
}

function buildCard(task, colIdx, itemNum) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable  = true;
  card.dataset.id = task.id;

  /* Animate new cards */
  card.style.animationDelay = `${itemNum * 0.04}s`;

  card.innerHTML = `
    <div class="card-grip">
      <span></span><span></span>
      <span></span><span></span>
      <span></span><span></span>
    </div>
    <span class="card-number mono">#${padNum(task.id)}</span>
    <div class="card-title">${sanitize(task.title)}</div>
    ${task.desc ? `<div class="card-desc">${sanitize(task.desc)}</div>` : ''}
    <div class="card-divider"></div>
    <div class="card-foot">
      <span class="card-date">${sanitize(task.date || '')}</span>
      <div class="card-actions">
        <button class="btn-arrow" title="Move left"
          onclick="moveTask(${task.id}, -1)"
          ${colIdx === 0 ? 'disabled' : ''}>←</button>
        <button class="btn-arrow" title="Move right"
          onclick="moveTask(${task.id}, 1)"
          ${colIdx === 2 ? 'disabled' : ''}>→</button>
        <button class="btn-del" title="Delete task"
          onclick="deleteTask(${task.id})">✕</button>
      </div>
    </div>`;

  card.addEventListener('dragstart', onDragStart);
  card.addEventListener('dragend',   onDragEnd);

  return card;
}

/* ════ DRAG & DROP ════ */
function onDragStart(e) {
  dragId = parseInt(this.dataset.id, 10);
  e.dataTransfer.effectAllowed = 'move';
  /* Small delay so browser captures the un-faded version as ghost image */
  setTimeout(() => this.classList.add('is-dragging'), 0);
}

function onDragEnd() {
  this.classList.remove('is-dragging');
  document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-active'));
  dragId = null;
}

/* Attach drag-over / drop listeners to every column */
document.querySelectorAll('.column').forEach(colEl => {
  colEl.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    colEl.classList.add('drag-over-active');
  });

  colEl.addEventListener('dragleave', e => {
    /* Only remove class if truly leaving the column */
    if (!colEl.contains(e.relatedTarget)) {
      colEl.classList.remove('drag-over-active');
    }
  });

  colEl.addEventListener('drop', e => {
    e.preventDefault();
    colEl.classList.remove('drag-over-active');

    if (dragId === null) return;

    const task = tasks.find(t => t.id === dragId);
    if (!task) return;

    const dest = colEl.dataset.col;
    if (task.col === dest) return; /* dropped in same column, no-op */

    task.col = dest;
    saveToStorage();
    render();
    showToast(`→ Moved to ${LABELS[dest]}`);
  });
});

/* ════ TASK OPERATIONS ════ */
function moveTask(id, direction) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const newIdx = COLS.indexOf(task.col) + direction;
  if (newIdx < 0 || newIdx > 2) return;

  task.col = COLS[newIdx];
  saveToStorage();
  render();
  showToast(`→ Moved to ${LABELS[task.col]}`);
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveToStorage();
  render();
  showToast('Task deleted');
}

function clearAll() {
  if (!tasks.length) return;
  if (!confirm('Clear all tasks from the board? This cannot be undone.')) return;
  tasks  = [];
  nextId = 1;
  saveToStorage();
  render();
  showToast('Board cleared');
}

/* ════ ADD FORM ════ */
function openForm() {
  formOpen = true;
  document.getElementById('open-btn').style.display  = 'none';
  document.getElementById('task-form').classList.add('open');
  document.getElementById('f-title').focus();
}

function closeForm() {
  formOpen = false;
  document.getElementById('open-btn').style.display = '';
  document.getElementById('task-form').classList.remove('open');
  /* Reset fields */
  document.getElementById('f-title').value = '';
  document.getElementById('f-desc').value  = '';
  document.getElementById('f-title').classList.remove('err');
}

function addTask() {
  const titleEl = document.getElementById('f-title');
  const title   = titleEl.value.trim();

  if (!title) {
    titleEl.classList.add('err');
    titleEl.focus();
    showToast('Please enter a task title');
    return;
  }

  titleEl.classList.remove('err');
  const desc = document.getElementById('f-desc').value.trim();

  tasks.push({
    id:    nextId++,
    title,
    desc,
    col:   'todo',
    date:  todayDate(),
  });

  saveToStorage();
  render();

  /* Keep form open for rapid entry — just clear title */
  titleEl.value = '';
  document.getElementById('f-desc').value = '';
  titleEl.focus();
  showToast('Task posted to To Do ✓');
}

/* ════ KEYBOARD SHORTCUTS ════ */
document.addEventListener('keydown', e => {
  const active = document.activeElement;
  const inInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA';

  if (inInput) {
    if (e.key === 'Escape') { closeForm(); return; }
    if (e.key === 'Enter' && active.id === 'f-title') { e.preventDefault(); addTask(); }
    return;
  }

  switch (e.key) {
    case 'n':
    case 'N':
      if (!formOpen) openForm();
      break;
    case 'Escape':
      if (formOpen) closeForm();
      break;
  }
});

/* ════ LIVE DATE IN HEADER ════ */
function updateHeaderDate() {
  const el = document.getElementById('live-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  }).toUpperCase();
}

/* Expose globals for inline handlers */
window.openForm   = openForm;
window.closeForm  = closeForm;
window.addTask    = addTask;
window.deleteTask = deleteTask;
window.moveTask   = moveTask;
window.clearAll   = clearAll;

/* Wire up the clear button */
document.getElementById('clear-btn').addEventListener('click', clearAll);

/* ════ INIT ════ */
loadFromStorage();
updateHeaderDate();
render();

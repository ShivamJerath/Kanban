const COLS   = ['todo','progress','done'];
const LABELS = { todo:'To Do', progress:'In Progress', done:'Done' };
const KEY    = 'kanban_v3';

let tasks  = [];
let nextId = 1;
let dragId = null;
let formOpen = false;
let toastTimer;

/* ── Persistence ── */
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ tasks, nextId })); } catch(e) {}
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      tasks  = d.tasks  || [];
      nextId = d.nextId || (tasks.length ? Math.max(...tasks.map(t=>t.id))+1 : 1);
      return;
    }
  } catch(e) {}
  tasks = [
    { id:1, title:'Build Api',        desc:'Setup Node.js and Express for the backend',       col:'todo',     date:'Feb 20' },
    { id:2, title:'Register Page',    desc:'Create register page with React',                  col:'todo',     date:'Feb 21' },
    { id:3, title:'Integrate Login',  desc:'Connect Login APIs to the frontend',               col:'todo',     date:'Feb 22' },
    { id:4, title:'Login Page',       desc:'Create Login page with React',                     col:'progress', date:'Feb 23' },
    { id:5, title:'Initiate Project', desc:'Setup the MERN project environment',               col:'done',     date:'Feb 18' },
  ];
  nextId = 10;
  save();
}

/* ── Toast ── */
function toast(msg) {
  clearTimeout(toastTimer);
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ── Render ── */
function render() {
  COLS.forEach(col => {
    const zone  = document.getElementById('zone-' + col);
    const ghost = zone.querySelector('.drop-ghost');
    Array.from(zone.children).forEach(c => { if (c !== ghost) c.remove(); });

    const colTasks = tasks.filter(t => t.col === col);
    document.getElementById('cnt-' + col).textContent = colTasks.length;

    if (!colTasks.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.innerHTML = `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <line x1="9" y1="9" x2="15" y2="9"/>
          <line x1="9" y1="13" x2="13" y2="13"/>
        </svg>
        Drop cards here`;
      zone.appendChild(hint);
    }

    const ci = COLS.indexOf(col);
    colTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'card';
      card.draggable = true;
      card.dataset.id = task.id;
      card.innerHTML = `
        <div class="card-handle">
          <span><i></i><i></i></span>
          <span><i></i><i></i></span>
          <span><i></i><i></i></span>
        </div>
        <div class="card-title">${esc(task.title)}</div>
        ${task.desc ? `<div class="card-desc">${esc(task.desc)}</div>` : ''}
        <div class="card-foot">
          <span class="card-meta">${esc(task.date||'')}</span>
          <div class="card-actions">
            <button class="btn-icon" title="Move left"  onclick="moveTask(${task.id},-1)" ${ci===0?'disabled':''}>◀</button>
            <button class="btn-icon" title="Move right" onclick="moveTask(${task.id}, 1)" ${ci===2?'disabled':''}>▶</button>
            <button class="btn-icon del" title="Delete" onclick="delTask(${task.id})">✕</button>
          </div>
        </div>`;
      card.addEventListener('dragstart', onDragStart);
      card.addEventListener('dragend',   onDragEnd);
      zone.appendChild(card);
    });
  });

  document.getElementById('stat').textContent = tasks.length + ' task' + (tasks.length !== 1 ? 's' : '');
}

/* ── Drag & Drop ── */
function onDragStart(e) {
  dragId = +this.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => this.classList.add('is-dragging'), 0);
}

function onDragEnd() {
  this.classList.remove('is-dragging');
  document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-active'));
  dragId = null;
}

document.querySelectorAll('.column').forEach(col => {
  col.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('drag-over-active');
  });
  col.addEventListener('dragleave', e => {
    if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over-active');
  });
  col.addEventListener('drop', e => {
    e.preventDefault();
    col.classList.remove('drag-over-active');
    if (dragId === null) return;
    const task = tasks.find(t => t.id === dragId);
    if (!task || task.col === col.dataset.col) return;
    task.col = col.dataset.col;
    save();
    render();
    toast('Moved to ' + LABELS[task.col] + ' ✓');
  });
});

/* ── Move buttons ── */
function moveTask(id, dir) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const ni = COLS.indexOf(task.col) + dir;
  if (ni < 0 || ni > 2) return;
  task.col = COLS[ni];
  save(); render();
  toast('Moved to ' + LABELS[task.col] + ' ✓');
}

/* ── Delete ── */
function delTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save(); render();
  toast('Task deleted');
}

/* ── Clear all ── */
function clearAll() {
  if (!tasks.length || !confirm('Delete all tasks? This cannot be undone.')) return;
  tasks = []; nextId = 1;
  save(); render();
  toast('Board cleared');
}

/* ── Add form (Todo column only) ── */
function openForm() {
  formOpen = true;
  document.getElementById('open-btn').style.display = 'none';
  document.getElementById('inline-form').classList.add('open');
  document.getElementById('f-title').focus();
}

function closeForm() {
  formOpen = false;
  document.getElementById('open-btn').style.display = '';
  document.getElementById('inline-form').classList.remove('open');
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
    return;
  }
  titleEl.classList.remove('err');
  const desc = document.getElementById('f-desc').value.trim();
  const date = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric' });
  tasks.push({ id: nextId++, title, desc, col: 'todo', date });
  save(); render();
  // Stay open for rapid entry
  document.getElementById('f-title').value = '';
  document.getElementById('f-desc').value  = '';
  document.getElementById('f-title').focus();
  toast('Task added to To Do ✓');
}

/* ── Keyboard ── */
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    if (e.key === 'Escape') { closeForm(); return; }
    if (e.key === 'Enter' && document.activeElement.id === 'f-title') { e.preventDefault(); addTask(); }
    return;
  }
  if ((e.key === 'n' || e.key === 'N') && !formOpen) openForm();
  if (e.key === 'Escape' && formOpen) closeForm();
});

load();
render();

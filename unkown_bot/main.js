const GRID_SIZE = 4;
const FILLED_COUNT = 6;
const ATTEMPTS = 7;
const directions = ['U', 'R', 'D', 'L'];
const todaySeed = getDailySeed();
let rng = makeRng(todaySeed);

let solution = buildSolution();
let guess = Array(GRID_SIZE * GRID_SIZE).fill(0); // 0: empty, 1: filled, 'maybe': memo
let attempts = Array.from({ length: ATTEMPTS }, () => emptyAttempt());
let currentAttempt = 0;
let cellEmojis = [];
let usedQuestions = 0;
let gameOver = false;

const gridEl = document.getElementById('guess-grid');
const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submit-btn');
const questionResultEl = document.getElementById('question-result');
const attemptsContainer = document.getElementById('attempts');
const keyboardButtons = document.querySelectorAll('.key');
const tutorialBtn = document.getElementById('tutorial-btn');
const tutorialModal = document.getElementById('tutorial-modal');
const closeTutorialBtn = document.getElementById('close-tutorial');
const startGridEl = document.getElementById('start-grid');
const titleEl = document.querySelector('h1');
const tutorialTitleEl = document.querySelector('#tutorial-modal h3');
const tutorialBodyEl = document.querySelector('.tutorial-body');
const langButtons = document.querySelectorAll('.lang-btn');

const strings = {
  ko: {
    title: 'Sliding Bot Puzzle',
    submit: 'Submit',
    tutorialTitle: 'Tutorial',
    tutorialBody:
      '<p>Goal: Find the exact 6 filled cells in the 4x4 grid.</p>' +'<ul>' +'<li>Grid tap/click cycles: empty ? filled ? ? memo ? empty. ? is ignored when checking the answer.</li>' +'<li>Question: pick a start emoji and enter 3 directions, then press Enter. No same or opposite directions back-to-back. Total 7 tries.</li>' +'<li>Movement: the grid wraps. The bot slides through empty cells and stops right before the first filled cell. If the start cell is filled, treat filled/empty as inverted.</li>' +'<li>If the entire row/column is empty, the result is ??.</li>' +'</ul>',
    filledCount: (n) => `Filled: ${n}/6`,
    success: 'Solved!',
    failure: 'Incorrect.',
    solutionLabel: 'Solution',
    warnLocked: 'No editable row.',
    warnNeedStart: 'Pick a start emoji first.',
    warnSlotsFull: 'All 4 slots filled. Press Enter.',
    warnStartSlotOnly: 'Pick the start from the emoji grid.',
    warnDirOnly: 'Use arrow keys only (⬆️➡️⬇️⬅️).',
    warnNeedAll: 'Select a start emoji and 3 directions.',
    warnLockedSubmit: 'This row is already submitted.',
    warnNoAttempts: 'All question attempts are used.',
    warnNoQuestionsLeft: 'No question attempts remain.',
    warnDirAdj12: 'Dir1 and Dir2 cannot be same or opposite.',
    warnDirAdj23: 'Dir2 and Dir3 cannot be same or opposite.',
  },
  en: {
    title: 'Sliding Bot Puzzle',
    submit: 'Submit',
    tutorialTitle: 'Tutorial',
    tutorialBody:
      '<p>Goal: Find the exact 6 filled cells in the 4x4 grid.</p>' +'<ul>' +'<li>Grid tap/click cycles: empty ? filled ? ? memo ? empty. ? is ignored when checking the answer.</li>' +'<li>Question: pick a start emoji and enter 3 directions, then press Enter. No same or opposite directions back-to-back. Total 7 tries.</li>' +'<li>Movement: the grid wraps. The bot slides through empty cells and stops right before the first filled cell. If the start cell is filled, treat filled/empty as inverted.</li>' +'<li>If the entire row/column is empty, the result is ??.</li>' +'</ul>',
    filledCount: (n) => `Filled: ${n}/6`,
    success: 'Solved!',
    failure: 'Incorrect.',
    solutionLabel: 'Solution',
    warnLocked: 'No editable row.',
    warnNeedStart: 'Pick a start emoji first.',
    warnSlotsFull: 'All 4 slots filled. Press Enter.',
    warnStartSlotOnly: 'Pick the start from the emoji grid.',
    warnDirOnly: 'Use arrow keys only (⬆️➡️⬇️⬅️).',
    warnNeedAll: 'Select a start emoji and 3 directions.',
    warnLockedSubmit: 'This row is already submitted.',
    warnNoAttempts: 'All question attempts are used.',
    warnNoQuestionsLeft: 'No question attempts remain.',
    warnDirAdj12: 'Dir1 and Dir2 cannot be same or opposite.',
    warnDirAdj23: 'Dir2 and Dir3 cannot be same or opposite.',
  },
};
let currentLang = 'ko';

function t(key, ...args) {
  const pack = strings[currentLang] || strings.ko;
  const value = pack[key] ?? strings.ko[key] ?? '';
  return typeof value === 'function' ? value(...args) : value;
}

function emptyAttempt() {
  return {
    slots: ['', '', '', ''], // [startEmoji, dir1, dir2, dir3]
    startIdx: null,
    result: '',
    resultEmoji: '',
    locked: false,
  };
}

function buildSolution() {
  const grid = Array(GRID_SIZE * GRID_SIZE).fill(0);
  const indices = [...Array(grid.length).keys()];
  shuffle(indices);
  indices.slice(0, FILLED_COUNT).forEach((idx) => (grid[idx] = 1));
  return grid;
}

function assignEmojis() {
  const fallbackPool = [
    // Faces & gestures
    '😀', '😎', '🤩', '🤖', '👾', '🧠', '🫶', '✌️',
    // Animals
    '🦊', '🐱', '🐶', '🐙', '🐢', '🦄', '🐸', '🐧',
    // Nature & weather
    '🍀', '🌵', '🌸', '🌈', '⛰️', '🌙', '⭐', '⚡',
    // Food & drink
    '🍉', '🍍', '🍣', '🍩', '🥑', '🥨', '🧋', '🍕',
    // Objects & symbols
    '🎲', '🧩', '🛼', '🎧', '🎈', '🎉', '🧭', '🪐',
  ];
  const pool = Array.isArray(window.EMOJI_POOL) && window.EMOJI_POOL.length ? window.EMOJI_POOL : fallbackPool;
  const uniquePool = [...new Set(pool)];
  const shuffled = shuffle([...uniquePool]);
  cellEmojis = shuffled.slice(0, GRID_SIZE * GRID_SIZE);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const rand = typeof rng === 'function' ? rng() : Math.random();
    const j = Math.floor(rand * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderGuessGrid() {
  if (gameOver) updateControls();
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = 'auto repeat(4, 1fr)';

  gridEl.appendChild(createDiv('corner'));
  for (let c = 1; c <= GRID_SIZE; c += 1) {
    gridEl.appendChild(createDiv('col-label', String(c)));
  }

  for (let r = 0; r < GRID_SIZE; r += 1) {
    gridEl.appendChild(createDiv('row-label', String.fromCharCode('A'.charCodeAt(0) + r)));
    for (let c = 0; c < GRID_SIZE; c += 1) {
      const idx = r * GRID_SIZE + c;
      const val = guess[idx];
      const btn = document.createElement('button');
      btn.className = `cell${val === 1 ? ' filled' : ''}${val === 'maybe' ? ' maybe' : ''}`;
      btn.textContent = displayValue(val);
      btn.dataset.index = idx;
      btn.dataset.emoji = cellEmojis[idx] || '?';
      btn.title = formatCoord(idx);
      btn.addEventListener('click', () => toggleGuess(idx));
      btn.disabled = gameOver;
      gridEl.appendChild(btn);
    }
  }
}

function renderStartGrid() {
  startGridEl.innerHTML = '';
  startGridEl.style.gridTemplateColumns = 'repeat(4, 1fr)';
  startGridEl.style.gridTemplateRows = 'repeat(4, 1fr)';
  for (let idx = 0; idx < GRID_SIZE * GRID_SIZE; idx += 1) {
    const btn = document.createElement('button');
    btn.textContent = cellEmojis[idx] || '?';
    btn.title = formatCoord(idx);
    btn.addEventListener('click', () => setStartFromEmoji(idx));
    btn.disabled = questionsExhausted() || gameOver;
    startGridEl.appendChild(btn);
  }
  updateControls();
}

function setStartFromEmoji(idx) {
  if (gameOver || questionsExhausted()) {
    setQuestionMessage(t('warnNoAttempts'), 'warn');
    return;
  }
  const attempt = attempts[currentAttempt];
  if (!attempt || attempt.locked) {
    setQuestionMessage(t('warnLocked'), 'warn');
    return;
  }
  attempt.startIdx = idx;
  attempt.slots[0] = cellEmojis[idx] || '?';
  setQuestionMessage('');
  renderAttempts();
}

function createDiv(className, text = '') {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = text;
  return div;
}

function toggleGuess(idx) {
  if (gameOver) return;
  guess[idx] = nextState(guess[idx]);
  renderGuessGrid();
  const filled = countFilled(guess);
  setStatus(t('filledCount', filled), filled === 6 ? 'ok' : '');
}

function countFilled(arr) {
  return arr.reduce((acc, val) => acc + (val === 1 ? 1 : 0), 0);
}

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ' ' + type : ''}`;
}

function setQuestionMessage(message, type = '') {
  questionResultEl.textContent = message;
  questionResultEl.className = `status${type ? ' ' + type : ''}`;
}

function nextState(val) {
  if (val === 0) return 1;
  if (val === 1) return 'maybe';
  return 0;
}

function displayValue(val) {
  if (val === 'maybe') return ' ';
  if (val === 1) return ' ';
  return '';
}

function formatCoord(idx) {
  const rowIndex = Math.floor(idx / GRID_SIZE);
  const colIndex = idx % GRID_SIZE;
  const rowLabel = String.fromCharCode('A'.charCodeAt(0) + rowIndex);
  const colLabel = colIndex + 1;
  return `${rowLabel}${colLabel}`;
}

function labelForValue(val) {
  switch (val) {
    case 'U':
      return '⬆️';
    case 'D':
      return '⬇️';
    case 'L':
      return '⬅️';
    case 'R':
      return '➡️';
    default:
      return val;
  }
}

function renderAttempts() {
  attemptsContainer.innerHTML = '';
  attempts.forEach((attempt, idx) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-row';
    const activeSlot = idx === currentAttempt ? nextEmptyIndex(attempt.slots) : -1;

    attempt.slots.forEach((value, slotIdx) => {
      const slotEl = document.createElement('div');
      slotEl.className = 'slot';
      if (attempt.locked) slotEl.classList.add('done');
      if (!value) slotEl.classList.add('empty');
      if (activeSlot === slotIdx && !attempt.locked) slotEl.classList.add('active');
      slotEl.textContent = displaySlotValue(value, slotIdx);
      rowEl.appendChild(slotEl);
    });

    const resultCell = document.createElement('div');
    resultCell.className = `result-cell${attempt.result ? ' filled' : ''}`;
    if (attempt.locked) resultCell.classList.add('done');
    resultCell.textContent = attempt.result || '-';
    rowEl.appendChild(resultCell);

    attemptsContainer.appendChild(rowEl);
  });
  updateControls();
}

function displaySlotValue(value, slotIdx) {
  if (slotIdx >= 1 && directions.includes(value)) return labelForValue(value);
  return value || '';
}

function nextEmptyIndex(slots) {
  return slots.findIndex((v) => !v);
}

function handleKeyPress(key) {
  if (gameOver) return;
  if (questionsExhausted()) {
    setQuestionMessage(t('warnNoAttempts'), 'warn');
    return;
  }
  const attempt = attempts[currentAttempt];
  if (!attempt || attempt.locked) {
    setQuestionMessage(t('warnLocked'), 'warn');
    return;
  }

  if (attempt.startIdx === null) {
    setQuestionMessage(t('warnNeedStart'), 'warn');
    return;
  }

  const slotIdx = nextEmptyIndex(attempt.slots);
  if (slotIdx === -1) {
    setQuestionMessage(t('warnSlotsFull'), 'warn');
    return;
  }
  if (slotIdx === 0) {
    setQuestionMessage(t('warnStartSlotOnly'), 'warn');
    return;
  }
  if (!directions.includes(key)) {
    setQuestionMessage(t('warnDirOnly'), 'warn');
    return;
  }
  attempt.slots[slotIdx] = key;
  setQuestionMessage('');
  renderAttempts();
}

function handleBackspace() {
  if (gameOver || questionsExhausted()) return;
  const attempt = attempts[currentAttempt];
  if (!attempt || attempt.locked) {
    return;
  }
  let idx = attempt.slots.length - 1;
  while (idx >= 1 && !attempt.slots[idx]) {
    idx -= 1;
  }
  if (idx >= 1) {
    attempt.slots[idx] = '';
  } else if (attempt.startIdx !== null) {
    attempt.slots[0] = '';
    attempt.startIdx = null;
  }
  setQuestionMessage('');
  renderAttempts();
}

function handleEnter() {
  if (gameOver) return;
  if (questionsExhausted()) {
    setQuestionMessage(t('warnNoAttempts'), 'warn');
    return;
  }
  const attempt = attempts[currentAttempt];
  if (!attempt || attempt.locked) {
    setQuestionMessage(t('warnLockedSubmit'), 'warn');
    return;
  }

  const [startEmoji, d1, d2, d3] = attempt.slots;
  if (attempt.startIdx === null || !startEmoji || !d1 || !d2 || !d3) {
    setQuestionMessage(t('warnNeedAll'), 'warn');
    return;
  }

  if (!directions.includes(d1) || !directions.includes(d2) || !directions.includes(d3)) {
    setQuestionMessage(t('warnDirOnly'), 'warn');
    return;
  }

  if (d1 === d2 || isReverse(d1, d2)) {
    setQuestionMessage(t('warnDirAdj12'), 'warn');
    return;
  }
  if (d2 === d3 || isReverse(d2, d3)) {
    setQuestionMessage(t('warnDirAdj23'), 'warn');
    return;
  }

  const result = computeResultFromIdx(attempt.startIdx, [d1, d2, d3]);
  attempts[currentAttempt] = {
    ...attempt,
    result: result.text,
    resultEmoji: result.emoji || '?',
    locked: true,
  };

  useQuestion();
  advanceAttempt();
  setQuestionMessage('');
  renderAttempts();
}

function computeResultFromIdx(startIdx, path) {
  let row = Math.floor(startIdx / GRID_SIZE);
  let col = startIdx % GRID_SIZE;
  const inverted = solution[startIdx] === 1;
  const cellValue = (r, c) => {
    const v = solution[r * GRID_SIZE + c];
    return inverted ? (v === 1 ? 0 : 1) : v;
  };

  for (const dir of path) {
    if (dir === 'L' || dir === 'R') {
      if (isRowEmpty(row, cellValue)) return { text: '🌀', emoji: '🌀' };
      [row, col] = slideUntilBlocked(row, col, dir, cellValue);
    }
    if (dir === 'U' || dir === 'D') {
      if (isColEmpty(col, cellValue)) return { text: '🌀', emoji: '🌀' };
      [row, col] = slideUntilBlocked(row, col, dir, cellValue);
    }
  }

  const finalIdx = row * GRID_SIZE + col;
  const emoji = cellEmojis[finalIdx] || '?';
  return { text: emoji || formatCoord(finalIdx), emoji };
}

function slideUntilBlocked(row, col, dir, cellValue) {
  let nextRow = row;
  let nextCol = col;
  let safety = 0;
  while (safety < GRID_SIZE * GRID_SIZE) {
    [nextRow, nextCol] = wrapStep(nextRow, nextCol, dir);
    if (cellValue(nextRow, nextCol) === 1) {
      return [row, col];
    }
    row = nextRow;
    col = nextCol;
    safety += 1;
  }
  return [row, col];
}

function isRowEmpty(row, cellValue) {
  for (let c = 0; c < GRID_SIZE; c += 1) {
    if (cellValue(row, c) === 1) return false;
  }
  return true;
}

function isColEmpty(col, cellValue) {
  for (let r = 0; r < GRID_SIZE; r += 1) {
    if (cellValue(r, col) === 1) return false;
  }
  return true;
}

function isReverse(a, b) {
  return (
    (a === 'U' && b === 'D') ||
    (a === 'D' && b === 'U') ||
    (a === 'L' && b === 'R') ||
    (a === 'R' && b === 'L')
  );
}

function wrapStep(row, col, dir) {
  if (dir === 'U') row -= 1;
  if (dir === 'D') row += 1;
  if (dir === 'L') col -= 1;
  if (dir === 'R') col += 1;
  if (row < 0) row = GRID_SIZE - 1;
  if (row >= GRID_SIZE) row = 0;
  if (col < 0) col = GRID_SIZE - 1;
  if (col >= GRID_SIZE) col = 0;
  return [row, col];
}

function handleSubmitGuess() {
  if (gameOver) return;
  const filled = countFilled(guess);
  if (filled !== FILLED_COUNT) {
    return;
  }

  useQuestion();
  const normalized = guess.map((val) => (val === 1 ? 1 : 0));
  const solved = normalized.every((val, idx) => val === solution[idx]);
  if (solved) {
    setStatus(t('success'), 'ok');
    endGame(true);
  } else {
    setStatus(t('failure'), 'bad');
    if (!questionsExhausted()) {
      consumeQuestionSlot();
    }
    if (questionsExhausted()) {
      endGame(false);
    }
  }
}

function consumeQuestionSlot() {
  const idx = attempts.findIndex((a) => !a.locked);
  if (idx === -1) {
    setQuestionMessage(t('warnNoQuestionsLeft'), 'warn');
    return;
  }
  attempts[idx] = {
    ...attempts[idx],
    result: '?',
    resultEmoji: '',
    locked: true,
  };
  advanceAttempt();
  renderAttempts();
  setQuestionMessage('');
}

function newGame() {
  rng = makeRng(getDailySeed());
  solution = buildSolution();
  guess = Array(GRID_SIZE * GRID_SIZE).fill(0);
  attempts = Array.from({ length: ATTEMPTS }, () => emptyAttempt());
  currentAttempt = 0;
  usedQuestions = 0;
  gameOver = false;
  document.body.classList.remove('success', 'failure');
  assignEmojis();
  setStatus('', '');
  setQuestionMessage('');
  renderGuessGrid();
  renderAttempts();
  renderStartGrid();
}

function bindEvents() {
  submitBtn.addEventListener('click', handleSubmitGuess);
  // Bind tutorial and language controls.
  tutorialBtn.addEventListener('click', openTutorial);
  closeTutorialBtn.addEventListener('click', closeTutorial);
  tutorialModal.addEventListener('click', (e) => {
    if (e.target === tutorialModal) closeTutorial();
  });
  langButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });
  keyboardButtons.forEach((btn) => {
    const key = btn.dataset.key;
    const action = btn.dataset.action;
    if (action === 'back') {
      btn.addEventListener('click', handleBackspace);
    } else if (action === 'enter') {
      btn.addEventListener('click', handleEnter);
    } else if (key) {
      btn.addEventListener('click', () => handleKeyboardInput(key));
    }
  });
}

function handleKeyboardInput(key) {
  if (questionsExhausted()) {
    setQuestionMessage(t('warnNoAttempts'), 'warn');
    return;
  }
  handleKeyPress(key);
}

function openTutorial() {
  tutorialModal.classList.remove('hidden');
}

function closeTutorial() {
  tutorialModal.classList.add('hidden');
}

function applyLanguage(lang) {
  currentLang = lang || 'ko';
  titleEl.textContent = t('title');
  submitBtn.textContent = t('submit');
  tutorialTitleEl.textContent = t('tutorialTitle');
  tutorialBodyEl.innerHTML = t('tutorialBody');
  langButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.lang === currentLang));
  // refresh status line to reflect language if it currently shows the filled counter
  const filled = countFilled(guess);
  if (statusEl.textContent.includes('/6') || statusEl.textContent === '' || statusEl.classList.contains('ok')) {
    setStatus(filled ? t('filledCount', filled) : statusEl.textContent, statusEl.classList.contains('ok') ? 'ok' : '');
  }
}

function firstUnlockedAttempt() {
  return attempts.findIndex((a) => !a.locked);
}

function useQuestion() {
  usedQuestions = Math.min(ATTEMPTS, usedQuestions + 1);
  updateControls();
}

function questionsExhausted() {
  return usedQuestions >= ATTEMPTS;
}

function advanceAttempt() {
  const idx = firstUnlockedAttempt();
  currentAttempt = idx === -1 ? ATTEMPTS : idx;
  updateControls();
}

function updateControls() {
  const exhausted = questionsExhausted();
  const allDisabled = gameOver;
  // disable start grid buttons
  startGridEl.querySelectorAll('button').forEach((btn) => {
    btn.disabled = exhausted || allDisabled;
  });
  // disable direction/back/enter keys
  keyboardButtons.forEach((btn) => {
    btn.disabled = exhausted || allDisabled;
  });
  // disable guess grid when game over
  gridEl.querySelectorAll('.cell').forEach((btn) => {
    btn.disabled = allDisabled;
  });
  // submit / tutorial / language buttons
  submitBtn.disabled = allDisabled;
  tutorialBtn.disabled = allDisabled;
  langButtons.forEach((btn) => {
    btn.disabled = allDisabled;
  });
}

function revealSolution() {
  const rows = [];
  for (let r = 0; r < GRID_SIZE; r += 1) {
    const slice = solution.slice(r * GRID_SIZE, (r + 1) * GRID_SIZE);
    rows.push(slice.join(''));
  }
  const msg = `${t('solutionLabel')}: ${rows.join(' / ')}`;
  setStatus(msg, gameOver ? (document.body.classList.contains('success') ? 'ok' : 'bad') : '');
}

function endGame(success) {
  gameOver = true;
  document.body.classList.remove('success', 'failure');
  document.body.classList.add(success ? 'success' : 'failure');
  updateControls();
  document.querySelectorAll('button').forEach((btn) => { btn.disabled = true; });
  setQuestionMessage('');
  revealSolution();
}

function getDailySeed() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  // e.g., 20250107 -> number
  return Number(`${y}${m}${d}`);
}

function makeRng(seed) {
  // Mulberry32 for deterministic daily randomness
  let a = seed || 1;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

assignEmojis();
renderGuessGrid();
renderAttempts();
renderStartGrid();
applyLanguage(currentLang);
setStatus('', '');
bindEvents();



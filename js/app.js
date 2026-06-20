// =====================================================================
// APP.JS — Main application logic
// =====================================================================

/* ═════════════════════════════════════════════════════════════════════════════
   UTILITIES
═════════════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getFiltered(posFilter = 'all', catFilter = 'all') {
  return rawData.filter(d =>
    (posFilter === 'all' || d.pos === posFilter) &&
    (catFilter === 'all' || d.cat === catFilter)
  );
}

function allPos() { return [...new Set(rawData.map(d => d.pos))].sort(); }
function allCats() { return [...new Set(rawData.map(d => d.cat))].sort(); }

function setProgress(barId, txtId, current, total) {
  const bar = $(barId); const txt = $(txtId);
  if (bar) bar.style.width = `${(current / total) * 100}%`;
  if (txt) txt.textContent = `${current} / ${total}`;
}

function audioBtn(text, lang = 'am-ET', extraClass = '') {
  return `<button class="audio-btn ${extraClass}" title="Listen" onclick="event.stopPropagation();Audio.speakText(${JSON.stringify(text)},${JSON.stringify(lang)})">🔊</button>`;
}

/* ═════════════════════════════════════════════════════════════════════════════
   BACKGROUND CROSSFADE
═════════════════════════════════════════════════════════════════════════════ */
const BG = {
  active: 'a',
  index: 0,
  init() {
    $('bg-a').style.backgroundImage = `url('${backgrounds[0]}')`;
  },
  change() {
    const pool = backgrounds.filter((_, i) => i !== this.index);
    const next = pick(pool);
    this.index = backgrounds.indexOf(next);
    if (this.active === 'a') {
      $('bg-b').style.backgroundImage = `url('${next}')`;
      $('bg-a').style.opacity = '0'; $('bg-b').style.opacity = '1';
      this.active = 'b';
    } else {
      $('bg-a').style.backgroundImage = `url('${next}')`;
      $('bg-b').style.opacity = '0'; $('bg-a').style.opacity = '1';
      this.active = 'a';
    }
  }
};

/* ═════════════════════════════════════════════════════════════════════════════
   NAVIGATION
═════════════════════════════════════════════════════════════════════════════ */
const Nav = {
  current: 'home',
  go(sectionId) {
    $$('.section').forEach(s => s.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));

    const sec = $(`sec-${sectionId}`);
    if (sec) sec.classList.add('active');
    $$(`[data-target="${sectionId}"]`).forEach(n => n.classList.add('active'));

    this.current = sectionId;
    BG.change();
    window.scrollTo(0, 0);

    // Lazy-init each section on first visit
    const inits = {
      fidel:       () => Fidel.init(),
      flashcards:  () => Flashcard.init(),
      matching:    () => Matching.init(),
      typing:      () => Typing.init(),
      sentences:   () => Sentences.init(),
      speaking:    () => Speaking.init(),
      conjugation: () => Conjugation.init(),
    };
    if (inits[sectionId]) inits[sectionId]();
  }
};

/* ═════════════════════════════════════════════════════════════════════════════
   FILTER BUILDER (shared by Flashcard, Matching, Typing, Sentences)
═════════════════════════════════════════════════════════════════════════════ */
function buildFilterPanel(containerId, state, onChange) {
  const c = $(containerId);
  if (!c) return;

  const posTags = allPos().map(p =>
    `<button class="tag ${state.pos === p ? 'on' : ''}" onclick="filterClick(this,'pos','${p}','${containerId}',appState)">${p}</button>`
  ).join('');
  const catTags = allCats().map(ct =>
    `<button class="tag ${state.cat === ct ? 'on' : ''}" onclick="filterClick(this,'cat','${ct}','${containerId}',appState)">${ct}</button>`
  ).join('');

  c.innerHTML = `
    <div class="filter-group">
      <span class="filter-label">Part of Speech</span>
      <div class="tags">
        <button class="tag ${state.pos === 'all' ? 'on' : ''}" onclick="filterClick(this,'pos','all','${containerId}',appState)">All</button>
        ${posTags}
      </div>
    </div>
    <div class="filter-group" style="margin-top:10px">
      <span class="filter-label">Category</span>
      <div class="tags">
        <button class="tag ${state.cat === 'all' ? 'on' : ''}" onclick="filterClick(this,'cat','all','${containerId}',appState)">All</button>
        ${catTags}
      </div>
    </div>
    <p class="filter-count" id="${containerId}-count"></p>`;

  updateFilterCount(containerId, state);
  if (onChange) onChange(state);
}

// Global state object holding filter values per section
const appState = {
  fc: { pos: 'all', cat: 'all' },
  mt: { pos: 'all', cat: 'all' },
  ty: { pos: 'all', cat: 'all' },
  sn: { pos: 'all', cat: 'all' },
};

function filterClick(btn, key, val, containerId, stateObj) {
  const prefix = containerId.replace('-filter', '');
  const secMap = { 'fc': 'fc', 'mt': 'mt', 'ty': 'ty', 'sn': 'sn' };
  const stKey = Object.keys(secMap).find(k => containerId.includes(k)) || 'fc';

  stateObj[stKey][key] = val;
  // Update active state on buttons in same group
  const group = btn.parentElement;
  group.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  updateFilterCount(containerId, stateObj[stKey]);
}

function updateFilterCount(containerId, state) {
  const filtered = getFiltered(state.pos, state.cat);
  const el = $(`${containerId}-count`);
  if (el) el.textContent = `${filtered.length} word${filtered.length !== 1 ? 's' : ''} selected`;
}

/* ═════════════════════════════════════════════════════════════════════════════
   ① FIDEL — Alphabet section
═════════════════════════════════════════════════════════════════════════════ */
const Fidel = (() => {
  let mode = 'browse'; // 'browse' | 'quiz'
  let quizScore = { correct: 0, total: 0 };
  let currentQuiz = null;

  function init() {
    if ($('fidel-chart').innerHTML.trim()) return; // already built
    buildChart();
    renderQuizPanel();
  }

  function buildChart() {
    const wrap = $('fidel-chart');
    if (!wrap) return;

    // Order header
    let html = '<div class="fidel-grid">';
    html += '<div class="fidel-head-corner"></div>';
    fidelOrderLabels.forEach((lbl, i) => {
      html += `<div class="fidel-col-head">${fidelOrders[i]}<br><small>${['uh','oo','ee','ah','ay','ih','oh'][i]}</small></div>`;
    });

    fidelChart.forEach(row => {
      html += `<div class="fidel-row-head" title="${row.rom || row.name}">${row.name}</div>`;
      row.chars.forEach((ch, i) => {
        const syllable = (row.rom || '') + ['ä','u','i','a','ē','ɨ','o'][i].replace('ä','e').replace('ē','ay').replace('ɨ','ih');
        html += `<div class="fidel-cell" 
          data-char="${ch}" 
          data-rom="${row.rom}${fidelOrders[i]}"
          title="${ch} = ${row.rom}+${fidelOrders[i]}"
          onclick="Fidel.cellClick('${ch}','${row.rom}','${fidelOrders[i]}')">
          <span class="fidel-char">${ch}</span>
          <span class="fidel-rom">${row.rom}${fidelOrders[i] !== 'ä' ? fidelOrders[i] : ''}</span>
        </div>`;
      });
    });
    html += '</div>';
    wrap.innerHTML = html;
  }

  function cellClick(ch, rom, order) {
    Audio.speakText(ch, 'am-ET');
    // Highlight panel
    $('fidel-info-char').textContent = ch;
    $('fidel-info-rom').textContent = `${rom}${order !== 'ä' ? order : ''}`;
    $('fidel-info-row').textContent = `Consonant: ${rom.toUpperCase()} · Order: ${fidelOrderLabels[fidelOrders.indexOf(order)] || order}`;
    $('fidel-info-panel').classList.add('visible');
  }

  function setMode(m) {
    mode = m;
    $('fidel-browse').classList.toggle('active', m === 'browse');
    $('fidel-quiz-btn').classList.toggle('active', m === 'quiz');
    $('fidel-chart-wrap').style.display = m === 'browse' ? 'block' : 'none';
    $('fidel-quiz-wrap').style.display  = m === 'quiz'   ? 'flex' : 'none';
    if (m === 'quiz') nextQuiz();
  }

  function renderQuizPanel() {
    $('fidel-quiz-score').textContent = `Score: ${quizScore.correct} / ${quizScore.total}`;
  }

  function nextQuiz() {
    // Pick random cell from fidel chart
    const row = pick(fidelChart);
    const orderIdx = Math.floor(Math.random() * 7);
    const ch = row.chars[orderIdx];
    const correctRom = `${row.rom}${fidelOrders[orderIdx] !== 'ä' ? fidelOrders[orderIdx] : ''}`;

    currentQuiz = { ch, correctRom };

    // Build 3 wrong options
    const wrong = new Set();
    while (wrong.size < 3) {
      const wr = pick(fidelChart);
      const wi = Math.floor(Math.random() * 7);
      const wrom = `${wr.rom}${fidelOrders[wi] !== 'ä' ? fidelOrders[wi] : ''}`;
      if (wrom !== correctRom) wrong.add(wrom);
    }

    const options = shuffle([correctRom, ...wrong]);
    $('quiz-char-display').textContent = ch;
    $('quiz-options').innerHTML = options.map(opt =>
      `<button class="quiz-opt" onclick="Fidel.checkQuiz('${opt}','${correctRom}')">${opt || 'ä'}</button>`
    ).join('');
    $('quiz-feedback').textContent = '';
    renderQuizPanel();
  }

  function checkQuiz(chosen, correct) {
    quizScore.total++;
    const isOk = chosen === correct;
    if (isOk) quizScore.correct++;

    $$('.quiz-opt').forEach(b => {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add('correct');
      else if (b.textContent === chosen && !isOk) b.classList.add('wrong');
    });

    $('quiz-feedback').textContent = isOk ? '✓ Correct!' : `✗ It's "${correct}"`;
    $('quiz-feedback').className = `quiz-feedback ${isOk ? 'ok' : 'err'}`;
    renderQuizPanel();
    Audio.speakText(currentQuiz.ch, 'am-ET');
    setTimeout(() => nextQuiz(), 1600);
  }

  return { init, buildChart, cellClick, setMode, nextQuiz, checkQuiz };
})();

/* ═════════════════════════════════════════════════════════════════════════════
   ② FLASHCARD section
═════════════════════════════════════════════════════════════════════════════ */
const Flashcard = (() => {
  let items = [], index = 0, flipped = false, dir = 'ae';

  function init() { buildFilterPanel('fc-filter', appState.fc, load); }

  function load(state) {
    items = shuffle(getFiltered(appState.fc.pos, appState.fc.cat));
    if (!items.length) { $('fc-card-wrap').innerHTML = '<p class="empty-msg">No words match these filters.</p>'; return; }
    index = 0; flipped = false;
    render();
  }

  function render() {
    if (!items.length) return;
    const item = items[index];
    const total = items.length;
    setProgress('fc-bar', 'fc-prog', index + 1, total);
    $('fc-prev').disabled = index === 0;
    $('fc-next').textContent = index === total - 1 ? 'Finish ✓' : 'Next →';

    const resolvedDir = dir === 'mix' ? (Math.random() > .5 ? 'ae' : 'ea') : dir;
    const isAE = resolvedDir === 'ae';

    // Front
    $('fc-front-label').textContent = isAE ? 'AMHARIC' : 'ENGLISH';
    $('fc-front-main').innerHTML  = isAE
      ? `<span class="amh-text" style="font-size:clamp(28px,6vw,50px)">${item.amh}</span>${audioBtn(item.amh)}`
      : `<span class="eng-text">${item.eng}</span>`;
    $('fc-front-sub').textContent  = isAE ? item.trans : '';

    // Back
    $('fc-back-label').textContent = isAE ? 'ENGLISH' : 'AMHARIC';
    $('fc-back-main').innerHTML   = isAE
      ? `<span class="eng-text">${item.eng}</span>`
      : `<span class="amh-text" style="font-size:clamp(26px,5vw,44px)">${item.amh}</span>${audioBtn(item.amh)}`;
    $('fc-back-sub').textContent   = isAE ? `${item.pos} · ${item.cat}` : item.trans;

    // Reset flip
    flipped = false;
    $('fc-card').classList.remove('flipped');
  }

  function flip() {
    flipped = !flipped;
    $('fc-card').classList.toggle('flipped', flipped);
    if (flipped && dir !== 'mix') {
      const item = items[index];
      // Auto-speak front text
    }
  }

  function next() {
    if (index >= items.length - 1) {
      showSuccess('flashcards', 'Well done! Ready for another round?', () => { items = shuffle(items); index = 0; render(); });
      return;
    }
    index++;
    BG.change();
    render();
  }

  function prev() { if (index > 0) { index--; render(); } }

  function setDir(d) {
    dir = d;
    $$('#fc-dir .dir-btn').forEach(b => b.classList.remove('on'));
    const btn = document.querySelector(`[data-dir="${d}"]`);
    if (btn) btn.classList.add('on');
    render();
  }

  function start() { load(appState.fc); }

  return { init, load, render, flip, next, prev, setDir, start };
})();

/* ═════════════════════════════════════════════════════════════════════════════
   ③ MATCHING section
═════════════════════════════════════════════════════════════════════════════ */
const Matching = (() => {
  let items = [], sel = null, matched = 0, total = 0;
  const ROUND_SIZE = 8;

  function init() {
    buildFilterPanel('mt-filter', appState.mt, null);
  }

  function start() {
    const pool = shuffle(getFiltered(appState.mt.pos, appState.mt.cat));
    if (pool.length < 3) { $('mt-grid').innerHTML = '<p class="empty-msg">Not enough words for matching. Please adjust filters.</p>'; return; }

    items = pool.slice(0, ROUND_SIZE);
    total = items.length;
    matched = 0; sel = null;

    $('mt-score').textContent = `Pairs: 0 / ${total}`;
    $('mt-next').style.display = 'none';
    $('mt-grid').innerHTML = '';

    const amhTiles = items.map((v, i) => ({ id: i, type: 'amh', v }));
    const engTiles = items.map((v, i) => ({ id: i, type: 'eng', v }));
    const all = shuffle([...amhTiles, ...engTiles]);

    all.forEach(tile => {
      const el = document.createElement('div');
      el.className = 'mtile';
      el.dataset.id   = tile.id;
      el.dataset.type = tile.type;
      if (tile.type === 'amh') {
        el.innerHTML = `<div class="tile-amh">${tile.v.amh}</div><div class="tile-rom">${tile.v.trans}</div>`;
      } else {
        el.innerHTML = `<div class="tile-eng">${tile.v.eng}</div><div class="tile-pos">${tile.v.pos}</div>`;
      }
      el.addEventListener('click', () => clickTile(el));
      $('mt-grid').appendChild(el);
    });
  }

  function clickTile(el) {
    if (el.classList.contains('matched') || el.classList.contains('wrong')) return;
    if (!sel) { sel = el; el.classList.add('sel'); return; }
    if (sel === el) { sel.classList.remove('sel'); sel = null; return; }

    const prev = sel; sel = null;
    prev.classList.remove('sel');

    if (prev.dataset.id === el.dataset.id && prev.dataset.type !== el.dataset.type) {
      // Match!
      prev.classList.add('matched'); el.classList.add('matched');
      // Speak the Amharic word
      const item = items[+prev.dataset.id];
      Audio.speakText(item.amh);
      matched++;
      $('mt-score').textContent = `Pairs: ${matched} / ${total}`;
      if (matched === total) setTimeout(() => $('mt-next').style.display = 'block', 400);
    } else {
      prev.classList.add('wrong'); el.classList.add('wrong');
      setTimeout(() => { prev.classList.remove('wrong'); el.classList.remove('wrong'); }, 520);
    }
  }

  return { init, start, clickTile };
})();

/* ═════════════════════════════════════════════════════════════════════════════
   ④ TYPING section
═════════════════════════════════════════════════════════════════════════════ */
const Typing = (() => {
  let items = [], index = 0, answered = false, dir = 'ae', resolvedDir = 'ae';

  function init() { buildFilterPanel('ty-filter', appState.ty, null); }

  function start() {
    items = shuffle(getFiltered(appState.ty.pos, appState.ty.cat));
    if (!items.length) { alert('No words match these filters.'); return; }
    index = 0; answered = false;
    render();
    $('ty-section-main').style.display = 'block';
    $('ty-setup').style.display = 'none';
  }

  function render() {
    if (!items.length) return;
    const item = items[index];
    const total = items.length;
    resolvedDir = dir === 'mix' ? (index % 2 === 0 ? 'ae' : 'ea') : dir;

    setProgress('ty-bar', 'ty-prog', index + 1, total);
    answered = false;

    const inp = $('ty-input');
    inp.value = ''; inp.className = 'game-input'; inp.disabled = false;

    $('ty-feedback').textContent = '';
    $('ty-feedback').className = 'feedback';
    $('ty-reveal').style.display = 'none';
    $('ty-next').style.display = 'none';

    if (resolvedDir === 'ae') {
      $('ty-label').textContent = 'Translate to ENGLISH';
      $('ty-prompt').innerHTML = `<span class="amh-text" style="font-size:clamp(28px,5vw,46px)">${item.amh}</span> ${audioBtn(item.amh)}`;
      $('ty-sub').textContent = item.trans;
      inp.placeholder = 'Type English translation…';
      Keyboard.hide();
    } else {
      $('ty-label').textContent = 'Type in AMHARIC (script or romanization)';
      $('ty-prompt').innerHTML = `<span class="eng-text" style="font-size:clamp(20px,4vw,34px)">${item.eng}</span>`;
      $('ty-sub').textContent = `${item.pos} · ${item.cat}`;
      inp.placeholder = 'Type Amharic…';
      Keyboard.setTarget(inp);
    }

    $('ty-next').textContent = index === total - 1 ? 'Finish ✓' : 'Next →';
    setTimeout(() => { if (!answered) inp.focus(); }, 80);
  }

  function check() {
    if (answered) return;
    const inp  = $('ty-input');
    const ans  = inp.value.trim().toLowerCase();
    const item = items[index];

    let ok = false, correctStr = '';

    if (resolvedDir === 'ae') {
      // Typing English
      correctStr = item.eng;
      const ce = item.eng.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
      ok = ans === ce || ans === item.eng.toLowerCase() ||
           (ans.length > 2 && item.eng.toLowerCase().includes(ans));
    } else {
      // Typing Amharic (script or romanization) — no normalization for script answers
      const normAns = Audio.normalizeAmharic(inp.value.trim());
      const normAmh = Audio.normalizeAmharic(item.amh);
      // Compare exact script first (no normalization), then accept exact romanization
      ok = inp.value.trim() === item.amh || 
           inp.value.trim().toLowerCase() === item.trans.toLowerCase() ||
           normAns === normAmh;
      correctStr = `${item.amh}  (${item.trans})`;
    }

    answered = true;
    inp.disabled = true;
    inp.classList.add(ok ? 'correct' : 'wrong');

    const fb = $('ty-feedback');
    fb.textContent = ok ? '✓ Correct!' : '✗ Not quite.';
    fb.className = `feedback ${ok ? 'ok' : 'err'}`;

    if (!ok) {
      $('ty-reveal').textContent = `Answer: ${correctStr}`;
      $('ty-reveal').style.display = 'block';
    }

    if (ok) Audio.speakText(item.amh);
    $('ty-next').style.display = 'inline-block';
  }

  function next() {
    if (index >= items.length - 1) {
      showSuccess('typing', 'Writing practice complete!', () => start());
      return;
    }
    index++; render();
  }

  function setDir(d) { dir = d; }

  function toggleKb() {
    const inp = $('ty-input');
    Keyboard.toggle(inp);
  }

  function backToSetup() {
    $('ty-section-main').style.display = 'none';
    $('ty-setup').style.display = 'block';
    Keyboard.hide();
  }

  return { init, start, render, check, next, setDir, toggleKb, backToSetup };
})();

/* ═════════════════════════════════════════════════════════════════════════════
   ⑤ SENTENCE BUILDER section
═════════════════════════════════════════════════════════════════════════════ */
const Sentences = (() => {
  let current = null, answered = false, dir = 'toAmh'; // toAmh | toEng

  function init() { generate(); }

  // Conjugate present progressive: iyye + stem + suffix + " new"
  function conjugate(verbData, pronounIdx) {
    const p = PRONOUNS[pronounIdx];
    const suf = verbData.vowelEnd ? p.vSuffix : p.suffix;
    return `iyye${verbData.stem}${suf} new`;
  }

  function toBeForm(idx) {
    // idx 0: I (am), idx 5: We (are), all others: is
    if (idx === 0) return 'am';
    if (idx === 5) return 'are';
    // idx 1-4 (You m/f, He, She) and idx 6-7 (You plural, They) all use 'are'
    if ([1, 2, 6, 7].includes(idx)) return 'are';
    return 'is';
  }

  function generate() {
    const pronounPool = rawData.filter(d => d.pos === 'Pronoun').slice(0, 8); // use the 8 mapped ones
    const nounPool    = rawData.filter(d => d.pos === 'Noun' && ['Family','Food & Drink','Places','Body'].includes(d.cat));
    const verb        = pick(SENTENCE_VERBS);

    const pron = pick(pronounPool);
    const obj  = pick(nounPool);

    // Map pronoun to PRONOUNS array index
    const pronMap = { 'I':0, 'You (m)':1, 'You (f)':2, 'He':3, 'She':4, 'We':5, 'You (plural)':6, 'They':7 };
    const pIdx = pronMap[pron.eng] ?? 0;

    const conjRom = conjugate(verb, pIdx);
    const tobe    = toBeForm(pIdx);

    const eng = `${pron.eng} ${tobe} ${verb.gerund} ${obj.eng.toLowerCase()}`;
    const amhRom = `${pron.trans} ${obj.trans} ${conjRom}`;

    current = { eng, amhRom, pron, obj, verb, pIdx, conjRom };

    renderQuestion();
  }

  function renderQuestion() {
    if (!current) return;
    answered = false;

    const inp = $('sn-input');
    inp.value = ''; inp.className = 'game-input'; inp.disabled = false;
    $('sn-feedback').textContent = '';
    $('sn-feedback').className = 'feedback';
    $('sn-reveal').style.display = 'none';
    $('sn-next').style.display = 'none';

    if (dir === 'toAmh') {
      $('sn-label').textContent = 'Translate to Amharic (romanized)';
      $('sn-prompt').innerHTML = `<span class="eng-text">${current.eng}</span>`;
      $('sn-hint').textContent = `Hint: [subject] + [object] + iyye[stem][suffix] new`;
      inp.placeholder = 'e.g. ine buna iyyefelleghu new';
    } else {
      $('sn-label').textContent = 'Translate to English';
      $('sn-prompt').innerHTML = `
        <span style="font-size:14px;color:var(--ivory-dim)">Romanized:</span><br>
        <span class="rom-text">${current.amhRom}</span>
        ${audioBtn(current.pron.amh + ' ' + current.obj.amh, 'am-ET')}
      `;
      $('sn-hint').textContent = `${current.pron.amh} ${current.obj.amh} …`;
      inp.placeholder = 'Type English sentence…';
    }

    setTimeout(() => inp.focus(), 80);
  }

  function check() {
    if (answered || !current) return;
    const inp = $('sn-input');
    const ans = inp.value.trim().toLowerCase();

    let ok = false, correctStr = '';

    if (dir === 'toAmh') {
      correctStr = current.amhRom;
      const exp = current.amhRom.toLowerCase();
      const score = Audio.calculateScore(exp, ans);
      ok = score >= 75;
      if (!ok) correctStr = current.amhRom;
    } else {
      correctStr = current.eng;
      const score = Audio.calculateScore(current.eng.toLowerCase(), ans);
      ok = score >= 70;
    }

    answered = true;
    inp.disabled = true;
    inp.classList.add(ok ? 'correct' : 'wrong');

    $('sn-feedback').textContent = ok ? '✓ Correct!' : '✗ Not quite.';
    $('sn-feedback').className   = `feedback ${ok ? 'ok' : 'err'}`;

    if (!ok) {
      $('sn-reveal').textContent = `Answer: ${correctStr}`;
      $('sn-reveal').style.display = 'block';
    }

    $('sn-next').style.display = 'inline-block';
    Audio.speakText(current.pron.amh + ' ' + current.obj.amh);
  }

  function next() { BG.change(); generate(); }

  function setDir(d) { dir = d; renderQuestion(); }

  return { init, generate, check, next, setDir };
})();

/* ═════════════════════════════════════════════════════════════════════════════
   ⑥ SPEAKING PRACTICE section
═════════════════════════════════════════════════════════════════════════════ */
const Speaking = (() => {
  let recActive = false, currentItem = null, dir = 'listenAmh'; // listenAmh | speakAmh

  function init() {
    if (!Audio.isRecognitionSupported()) {
      $('sp-compat-note').style.display = 'block';
    }
    nextItem();
  }

  function nextItem() {
    // Pick any word or sentence
    const pool = rawData.filter(d =>
      ['Greetings & Goodbyes','Family','Food & Drink','Places','Body','Color','Numbers','Pronoun'].includes(d.cat)
    );
    currentItem = pick(pool);
    renderItem();
    stopRec();
    resetUI();
  }

  function renderItem() {
    if (!currentItem) return;
    if (dir === 'listenAmh') {
      $('sp-direction-label').textContent = 'LISTEN to the Amharic · then speak the English';
      $('sp-prompt').innerHTML = `
        <div class="amh-text" style="font-size:clamp(28px,6vw,48px)">${currentItem.amh}</div>
        <div class="rom-text">${currentItem.trans}</div>
        ${audioBtn(currentItem.amh)}
      `;
      $('sp-expected').textContent = `Expected English: "${currentItem.eng}"`;
    } else {
      $('sp-direction-label').textContent = 'READ the English · then speak it in Amharic';
      $('sp-prompt').innerHTML = `
        <div class="eng-text" style="font-size:clamp(22px,5vw,38px)">${currentItem.eng}</div>
        <div class="rom-text">Hint: ${currentItem.trans}</div>
        ${audioBtn(currentItem.amh, 'am-ET')}
      `;
      $('sp-expected').textContent = `Amharic: "${currentItem.amh}" (${currentItem.trans})`;
    }
  }

  function resetUI() {
    $('sp-transcript').textContent = '';
    $('sp-score-wrap').style.display = 'none';
    $('sp-mic-btn').classList.remove('recording');
    $('sp-mic-btn').textContent = '🎙️ Start Speaking';
    $('sp-listen-btn').style.display = 'block';
    recActive = false;
  }

  function listen() {
    Audio.speakText(currentItem.amh, 'am-ET');
  }

  function toggleRec() {
    if (recActive) { stopRec(); return; }
    startRec();
  }

  function startRec() {
    if (!Audio.isRecognitionSupported()) {
      $('sp-transcript').textContent = 'Speech recognition not available. Please use Chrome or Edge.';
      return;
    }

    const lang = dir === 'listenAmh' ? 'en-US' : 'am-ET';
    $('sp-mic-btn').classList.add('recording');
    $('sp-mic-btn').textContent = '⏹ Stop';
    $('sp-transcript').textContent = 'Listening…';
    recActive = true;

    Audio.startRecognition({
      lang,
      onResult: (text, isFinal) => {
        $('sp-transcript').textContent = text;
        if (isFinal) showScore(text);
      },
      onEnd: () => { recActive = false; $('sp-mic-btn').textContent = '🎙️ Start Speaking'; $('sp-mic-btn').classList.remove('recording'); },
      onError: err => {
        $('sp-transcript').textContent = err === 'not-allowed'
          ? 'Microphone access denied. Please allow it in browser settings.'
          : `Error: ${err}`;
        recActive = false;
        $('sp-mic-btn').textContent = '🎙️ Start Speaking';
        $('sp-mic-btn').classList.remove('recording');
      }
    });
  }

  function stopRec() { Audio.stopRecognition(); recActive = false; }

  function showScore(transcript) {
    // Use normalized expected for comparison, but always display canonical form
    const expected = dir === 'listenAmh' ? currentItem.eng : currentItem.amh + ' ' + currentItem.trans;
    const score = Audio.calculateScore(expected, transcript);

    const wrap = $('sp-score-wrap');
    const bar  = $('sp-score-bar');
    const txt  = $('sp-score-txt');
    const msg  = $('sp-score-msg');

    wrap.style.display = 'block';
    bar.style.width = `${score}%`;
    bar.style.background = score >= 80 ? 'var(--correct-border)' : score >= 50 ? 'var(--gold)' : 'var(--wrong-border)';
    txt.textContent = `${score}%`;
    msg.textContent = score >= 80 ? '🌟 Excellent!' : score >= 50 ? '👍 Good try!' : '📖 Keep practicing!';
  }

  function setDir(d) { dir = d; renderItem(); resetUI(); }

  return { init, nextItem, listen, toggleRec, startRec, stopRec, setDir };
})();

/* ═════════════════════════════════════════════════════════════════════════════
   ⑦ CONJUGATION section
═════════════════════════════════════════════════════════════════════════════ */
const Conjugation = (() => {
  let queue = [], index = 0, answered = false;
  const ROUND = 20;

  function init() { buildQueue(); }

  function conjugate(verb, pIdx) {
    const p = PRONOUNS[pIdx];
    const suf = verb.vowelEnd ? p.vSuffix : p.suffix;
    return `iyye${verb.stem}${suf} new`;
  }

  function buildQueue() {
    const all = [];
    VERB_STEMS.forEach((v, vi) => PRONOUNS.forEach((_, pi) => all.push({ vi, pi })));
    queue = shuffle(all).slice(0, ROUND);
    index = 0; answered = false;
    renderRef();
    renderQuestion();
  }

  function renderRef() {
    $('cj-ref').innerHTML = PRONOUNS.map((p, i) => {
      const ex = conjugate(VERB_STEMS[0], i);
      return `<div class="ref-row"><strong>${p.label}</strong><span class="ref-form">${ex}</span></div>`;
    }).join('');
  }

  function renderQuestion() {
    const { vi, pi } = queue[index];
    const verb = VERB_STEMS[vi];
    const pron = PRONOUNS[pi];

    setProgress('cj-bar', 'cj-prog', index + 1, ROUND);
    $('cj-pronoun').textContent = pron.label;
    $('cj-pron-amh').textContent = pron.amhScript;
    $('cj-verb-amh').textContent = verb.amh;
    $('cj-verb-tr').textContent  = verb.tr;
    $('cj-verb-en').textContent  = verb.eng;
    $('cj-stem-hint').textContent = `Stem: "${verb.stem}"${verb.vowelEnd ? ' (ends in vowel — drop the extra "e" for he/she/we)' : ''}`;

    const inp = $('cj-input');
    inp.value = ''; inp.className = 'game-input'; inp.disabled = false;

    $('cj-feedback').textContent = '';
    $('cj-feedback').className = 'feedback';
    $('cj-reveal').style.display = 'none';
    $('cj-next').style.display = 'none';
    answered = false;

    $('cj-next').textContent = index === ROUND - 1 ? 'Finish ✓' : 'Next →';
    setTimeout(() => inp.focus(), 80);
  }

  function check() {
    if (answered) return;
    const { vi, pi } = queue[index];
    const correct = conjugate(VERB_STEMS[vi], pi).toLowerCase();
    const ans = $('cj-input').value.trim().toLowerCase();
    const ok  = ans === correct;

    answered = true;
    $('cj-input').disabled = true;
    $('cj-input').classList.add(ok ? 'correct' : 'wrong');

    $('cj-feedback').textContent = ok ? '✓ Correct!' : '✗ Not quite.';
    $('cj-feedback').className   = `feedback ${ok ? 'ok' : 'err'}`;

    if (!ok) {
      $('cj-reveal').textContent = `Correct: ${conjugate(VERB_STEMS[vi], pi)}`;
      $('cj-reveal').style.display = 'block';
    }

    $('cj-next').style.display = 'inline-block';
    Audio.speakText(VERB_STEMS[vi].amh);
  }

  function next() {
    if (index >= ROUND - 1) {
      showSuccess('conjugation', 'Conjugation round complete!', () => buildQueue());
      return;
    }
    index++; BG.change(); renderQuestion();
  }

  return { init, buildQueue, check, next };
})();

/* ═════════════════════════════════════════════════════════════════════════════
   SUCCESS SCREEN
═════════════════════════════════════════════════════════════════════════════ */
function showSuccess(fromSection, msg, againFn) {
  $('suc-msg').textContent = msg || 'Set complete!';
  $('suc-again').onclick = () => { Nav.go(fromSection); againFn && againFn(); };
  $('suc-home').onclick  = () => Nav.go('home');
  Nav.go('success');
}

/* ═════════════════════════════════════════════════════════════════════════════
   GLOBAL ENTRY POINTS (called from HTML onclick attributes)
═════════════════════════════════════════════════════════════════════════════ */
function navTo(s)              { Nav.go(s); }
function fcFlip()              { Flashcard.flip(); }
function fcNext()              { Flashcard.next(); }
function fcPrev()              { Flashcard.prev(); }
function fcStart()             { Flashcard.start(); }
function fcSetDir(d)           { Flashcard.setDir(d); }
function mtStart()             { Matching.start(); }
function tyStart()             { Typing.start(); }
function tyCheck()             { Typing.check(); }
function tyNext()              { Typing.next(); }
function tySetDir(d, el) {
  Typing.setDir(d);
  $$('#ty-dir-row .dir-btn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
}
function tyToggleKb()          { Typing.toggleKb(); }
function tyBack()              { Typing.backToSetup(); }
function snCheck()             { Sentences.check(); }
function snNext()              { Sentences.next(); }
function snSetDir(d, el) {
  Sentences.setDir(d);
  $$('#sn-dir-row .dir-btn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
}
function spListen()            { Speaking.listen(); }
function spToggleRec()         { Speaking.toggleRec(); }
function spNext()              { Speaking.nextItem(); }
function spSetDir(d, el) {
  Speaking.setDir(d);
  $$('#sp-dir-row .dir-btn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
}
function cjCheck()             { Conjugation.check(); }
function cjNext()              { Conjugation.next(); }
function fidelMode(m)          { Fidel.setMode(m); }

/* ═════════════════════════════════════════════════════════════════════════════
   INIT
═════════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  BG.init();
  Nav.go('home');

  // Enter key in inputs
  ['ty-input','sn-input','cj-input'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (id === 'ty-input') Typing.check();
        if (id === 'sn-input') Sentences.check();
        if (id === 'cj-input') Conjugation.check();
      }
    });
  });
});

// =====================================================================
// KEYBOARD.JS — Virtual Amharic keyboard panel
// =====================================================================

const Keyboard = (() => {
  let targetInput = null;
  let visible = false;

  // ── Build the keyboard DOM ────────────────────────────────────
  function build() {
    if (document.getElementById('amh-keyboard')) return;

    const panel = document.createElement('div');
    panel.id = 'amh-keyboard';
    panel.className = 'amh-keyboard hidden';

    // Header row
    const hdr = document.createElement('div');
    hdr.className = 'kb-header';

    const title = document.createElement('span');
    title.textContent = 'Amharic Keyboard — click a character to insert';
    title.className = 'kb-title';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'kb-close';
    closeBtn.onclick = hide;

    const bkspBtn = document.createElement('button');
    bkspBtn.textContent = '⌫';
    bkspBtn.className = 'kb-backspace';
    bkspBtn.onclick = backspace;

    const spaceBtn = document.createElement('button');
    spaceBtn.textContent = '␣ Space';
    spaceBtn.className = 'kb-space';
    spaceBtn.onclick = () => insertChar(' ');

    hdr.appendChild(title);
    hdr.appendChild(spaceBtn);
    hdr.appendChild(bkspBtn);
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    // Order labels row
    const orderRow = document.createElement('div');
    orderRow.className = 'kb-order-row';
    const orderLabel = document.createElement('div');
    orderLabel.className = 'kb-row-head kb-order-label';
    orderLabel.textContent = '';
    orderRow.appendChild(orderLabel);
    fidelOrderLabels.forEach(lbl => {
      const el = document.createElement('div');
      el.className = 'kb-order-cell';
      el.textContent = lbl;
      orderRow.appendChild(el);
    });
    panel.appendChild(orderRow);

    // Character rows
    const grid = document.createElement('div');
    grid.className = 'kb-grid';

    fidelChart.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';

      const head = document.createElement('div');
      head.className = 'kb-row-head';
      head.textContent = row.name;
      rowEl.appendChild(head);

      row.chars.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'kb-key';
        btn.textContent = ch;
        btn.setAttribute('data-char', ch);
        btn.onclick = () => insertChar(ch);
        rowEl.appendChild(btn);
      });

      grid.appendChild(rowEl);
    });

    panel.appendChild(grid);
    document.body.appendChild(panel);
  }

  // ── Show / Hide ───────────────────────────────────────────────
  function show(inputEl) {
    build();
    targetInput = inputEl || document.querySelector('.kb-target');
    const kb = document.getElementById('amh-keyboard');
    if (kb) { kb.classList.remove('hidden'); visible = true; }
  }

  function hide() {
    const kb = document.getElementById('amh-keyboard');
    if (kb) { kb.classList.add('hidden'); visible = false; }
  }

  function toggle(inputEl) {
    visible ? hide() : show(inputEl);
  }

  function isVisible() { return visible; }

  // ── Character insertion ───────────────────────────────────────
  function insertChar(ch) {
    if (!targetInput) return;
    const el = targetInput;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    el.value = el.value.slice(0, start) + ch + el.value.slice(end);
    el.setSelectionRange(start + ch.length, start + ch.length);
    el.focus();
    el.dispatchEvent(new Event('input'));
  }

  function backspace() {
    if (!targetInput) return;
    const el = targetInput;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    if (start !== end) {
      el.value = el.value.slice(0, start) + el.value.slice(end);
      el.setSelectionRange(start, start);
    } else if (start > 0) {
      el.value = el.value.slice(0, start - 1) + el.value.slice(start);
      el.setSelectionRange(start - 1, start - 1);
    }
    el.focus();
    el.dispatchEvent(new Event('input'));
  }

  function setTarget(inputEl) { targetInput = inputEl; }

  // ── Public API ────────────────────────────────────────────────
  return { build, show, hide, toggle, isVisible, insertChar, backspace, setTarget };
})();

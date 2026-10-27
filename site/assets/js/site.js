/* shaikhismail.com — shared behaviour (no libraries, no tracking) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ THEME TOGGLE ============ */
  const root = document.documentElement;
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => root.getAttribute('data-theme') || (sysDark.matches ? 'dark' : 'light');
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }
  const themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  /* ============ MOBILE MENU ============ */
  const menuBtn = $('#menuBtn');
  const menu = $('#menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ============ FOOTER YEAR ============ */
  const yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ============ VERSION (footer, from version.json) ============ */
  const ver = $('#ver');
  if (ver) {
    fetch((document.body.dataset.base || '') + 'version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(v => {
        if (!v || !v.version) return;
        const d = new Date(v.date + 'T00:00:00');
        const when = isNaN(d) ? v.date : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        ver.textContent = 'v' + v.version + ' · ' + when;
        if (v.notes) ver.title = v.notes;
      })
      .catch(() => {});
  }

  /* ============ HERO PROMPT TYPING ============ */
  const typed = $('#typed');
  if (typed) {
    const text = typed.dataset.text || 'whoami';
    if (reduceMotion) { typed.textContent = text; }
    else {
      let i = 0;
      setTimeout(function type() {
        typed.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(type, 110);
      }, 400);
    }
  }

  /* ============ AGENT TERMINAL (scripted replay, no AI calls) ============ */
  const term = $('#agentTerm');
  if (term) {
    const body = $('.term-body', term);
    const replay = $('#termReplay');
    const script = JSON.parse($('#agentScript').textContent);
    let timers = [];
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    function line(l) {
      const d = document.createElement('div');
      d.className = 'ln ' + (l.cls || '');
      d.innerHTML = l.html;
      body.appendChild(d);
    }
    function run(instant) {
      clear();
      body.innerHTML = '';
      if (instant) { script.forEach(line); return; }
      let t = 250;
      script.forEach(l => { t += l.delay || 420; timers.push(setTimeout(() => line(l), t)); });
    }
    // The finished run is in the HTML already (readable without JS). Replay animates it.
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting)) { io.disconnect(); run(false); }
      }, { threshold: .35 });
      io.observe(term);
    }
    if (replay) replay.addEventListener('click', () => run(reduceMotion));
  }

  /* ============ COMMAND PALETTE (Ctrl/Cmd + K) ============ */
  const base = document.body.dataset.base || '';
  const COMMANDS = [
    { label: 'Work', hint: 'AI projects & automation', go: base + '#work' },
    { label: 'Experience', hint: 'Career timeline', go: base + '#experience' },
    { label: 'Skills', hint: 'Stack', go: base + '#skills' },
    { label: 'Certifications', hint: 'Awards, certs, education', go: base + '#credentials' },
    { label: 'Resume', hint: 'View on this page', go: base + '#resume' },
    { label: 'Download resume', hint: 'PDF', go: base + 'resume/Mohammed-Ismail-Shaikh_Senior-AI-Engineer.pdf', download: true },
    { label: 'Contact', hint: 'Email & profiles', go: base + '#contact' },
    { label: 'Free tools', hint: 'Browser tools', go: base + 'tools/' },
    { label: 'Blog', hint: 'blog.shaikhismail.com', go: 'https://blog.shaikhismail.com/', ext: true },
    { label: 'GitHub', hint: 'github.com/mdism', go: 'https://github.com/mdism', ext: true },
    { label: 'LinkedIn', hint: 'linkedin.com/in/iamismail', go: 'https://www.linkedin.com/in/iamismail', ext: true },
    { label: 'Copy email', hint: 'hello@shaikhismail.com', run: copyEmail },
    { label: 'Toggle theme', hint: 'Light / dark', run: toggleTheme },
  ];
  function copyEmail() {
    const email = 'hello@shaikhismail.com';
    if (navigator.clipboard) navigator.clipboard.writeText(email).catch(() => {});
  }
  let scrim = null, sel = 0, filtered = COMMANDS, lastFocus = null;
  function buildPalette() {
    scrim = document.createElement('div');
    scrim.className = 'palette-scrim';
    scrim.hidden = true;
    scrim.innerHTML =
      '<div class="palette" role="dialog" aria-modal="true" aria-label="Command menu">' +
      '<div class="palette-input"><span>&gt;</span><input id="paletteInput" type="text" placeholder="Type a command or section…" autocomplete="off" spellcheck="false" aria-controls="paletteList"></div>' +
      '<ul id="paletteList" role="listbox"></ul>' +
      '<div class="palette-foot"><span>↑↓ move</span><span>↵ open</span><span>esc close</span></div></div>';
    document.body.appendChild(scrim);
    scrim.addEventListener('click', e => { if (e.target === scrim) closePalette(); });
    const input = $('#paletteInput', scrim);
    input.addEventListener('input', () => { sel = 0; render(input.value); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, filtered.length - 1); render(input.value, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(input.value, true); }
      else if (e.key === 'Enter') { e.preventDefault(); if (filtered[sel]) exec(filtered[sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
  }
  function render(q, keepList) {
    const list = $('#paletteList', scrim);
    q = (q || '').trim().toLowerCase();
    if (!keepList) filtered = COMMANDS.filter(c => (c.label + ' ' + c.hint).toLowerCase().includes(q));
    if (!filtered.length) { list.innerHTML = '<li class="empty" role="option" aria-disabled="true">No match. Try “resume” or “work”.</li>'; return; }
    list.innerHTML = filtered.map((c, i) =>
      `<li role="option" id="pc-${i}" aria-selected="${i === sel}" data-i="${i}"><b>${c.label}</b><small>${c.hint}</small></li>`).join('');
    list.querySelectorAll('li[data-i]').forEach(li => {
      li.addEventListener('click', () => exec(filtered[+li.dataset.i]));
      li.addEventListener('mousemove', () => { if (sel !== +li.dataset.i) { sel = +li.dataset.i; render(null, true); } });
    });
    const active = $('#pc-' + sel, list);
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
  function exec(c) {
    closePalette();
    if (c.run) { c.run(); return; }
    if (c.ext) { window.open(c.go, '_blank', 'noopener'); return; }
    if (c.download) {
      const a = document.createElement('a'); a.href = c.go; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); return;
    }
    location.href = c.go;
  }
  function openPalette() {
    if (!scrim) buildPalette();
    lastFocus = document.activeElement;
    scrim.hidden = false; sel = 0;
    const input = $('#paletteInput', scrim);
    input.value = ''; render('');
    input.focus();
  }
  function closePalette() {
    if (!scrim || scrim.hidden) return;
    scrim.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      (scrim && !scrim.hidden) ? closePalette() : openPalette();
    }
  });
  const cmdBtn = $('#cmdBtn');
  if (cmdBtn) {
    cmdBtn.addEventListener('click', openPalette);
    const k = $('.kbd', cmdBtn);
    if (k && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) k.textContent = '⌘K';
  }

  /* ============ TOOLS GRID (tools page) ============ */
  const grid = $('#toolsGrid');
  if (grid && window.TOOLS) {
    grid.innerHTML = window.TOOLS.map(t => {
      const live = t.status === 'live';
      const host = t.url.replace(/^https?:\/\//, '');
      const tag = live ? 'a' : 'div';
      const attrs = live ? `href="${t.url}" target="_blank" rel="noopener"` : '';
      return `<${tag} class="tool ${live ? '' : 'soon'}" ${attrs}>
        <div class="ico">${t.icon}</div>
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
        <div class="meta"><span class="url">${host}</span><span class="badge ${live ? 'live' : 'soon'}">${live ? 'Live' : 'Coming soon'}</span></div>
      </${tag}>`;
    }).join('');
  }
})();

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
    { label: 'Blog', hint: 'Notes on AI agents & RAG', go: base + 'blog/' },
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

  /* ============ FREE TOOLS MENU (data in tools-data.js) ============ */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const INDUSTRIES = window.INDUSTRIES || [];
  const ITOOLS = window.INDUSTRY_TOOLS || [];
  const toolsIn = id => ITOOLS.filter(t => (t.industries || []).includes(id));
  const usedIndustries = INDUSTRIES.filter(i => toolsIn(i.id).length);
  const toolsNav = $('#toolsNav');
  if (toolsNav && usedIndustries.length) {
    const link = $('a', toolsNav);
    const toolsHref = link.getAttribute('href');
    const current = link.hasAttribute('aria-current');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drop-btn';
    btn.id = 'toolsDropBtn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'toolsDrop');
    if (current) btn.setAttribute('aria-current', 'page');
    btn.innerHTML = 'Free Tools <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    const panel = document.createElement('div');
    panel.className = 'drop';
    panel.id = 'toolsDrop';
    panel.hidden = true;
    panel.innerHTML = usedIndustries.map(i =>
      `<div class="drop-group"><a class="drop-h" href="${toolsHref}?industry=${encodeURIComponent(i.id)}#industry">${esc(i.name)}</a>` +
      toolsIn(i.id).map(t =>
        `<a class="drop-item" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(t.name)}</b><small>${esc(t.type)}</small></a>`).join('') +
      '</div>').join('') +
      `<a class="drop-all" href="${toolsHref}">All free tools →</a>`;
    toolsNav.replaceChildren(btn, panel);
    const setOpen = open => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', e => { e.stopPropagation(); setOpen(panel.hidden); });
    document.addEventListener('click', e => { if (!toolsNav.contains(e.target)) setOpen(false); });
    toolsNav.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
    toolsNav.addEventListener('focusout', e => { if (!toolsNav.contains(e.relatedTarget)) setOpen(false); });
    panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      setOpen(false);
      if (menu) { menu.classList.remove('open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }
    }));
  }

  /* ============ INDUSTRY TOOLS (tools page) ============ */
  const igrid = $('#industryGrid');
  const chips = $('#industryChips');
  if (igrid && chips) {
    const tagName = id => (INDUSTRIES.find(i => i.id === id) || { name: id }).name;
    const contactHref = base + '#contact';
    const param = new URLSearchParams(location.search).get('industry');
    let active = usedIndustries.some(i => i.id === param) ? param : 'all';
    const renderChips = () => {
      chips.innerHTML = [{ id: 'all', name: 'All' }].concat(usedIndustries).map(i =>
        `<button type="button" class="chip" data-id="${esc(i.id)}" aria-pressed="${i.id === active}">${esc(i.name)}</button>`).join('');
    };
    const renderGrid = () => {
      const list = active === 'all' ? ITOOLS : toolsIn(active);
      igrid.innerHTML = list.map(t => `<div class="tool live itool">
        <div class="ico">${esc(t.icon || t.name.slice(0, 2))}</div>
        <h3>${esc(t.name)} <span class="type">${esc(t.type)}</span></h3>
        <p>${esc(t.desc || '')}</p>
        <div class="tags">${(t.industries || []).map(id => `<span class="tag">${esc(tagName(id))}</span>`).join('')}</div>
        <div class="tool-cta">
          <a class="btn btn-primary" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">Live demo
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a>
          <a class="btn btn-quiet" href="${contactHref}">Contact</a>
        </div>
      </div>`).join('');
    };
    chips.addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      active = b.dataset.id;
      renderChips(); renderGrid();
      const u = new URL(location.href);
      if (active === 'all') u.searchParams.delete('industry'); else u.searchParams.set('industry', active);
      history.replaceState(null, '', u);
    });
    renderChips(); renderGrid();
  }

  /* ============ TOOLS GRID (tools page) ============ */
  const grid = $('#toolsGrid');
  if (grid && window.TOOLS) {
    grid.innerHTML = window.TOOLS.map(t => {
      const live = t.status === 'live';
      const host = t.url.replace(/^https?:\/\/tools\.shaikhismail\.com/, '').replace(/^https?:\/\//, '');
      const title = live ? `<a class="go" href="${t.url}" target="_blank" rel="noopener">${t.name}</a>` : t.name;
      const src = live && t.repo ? `<a class="src" href="${t.repo}" target="_blank" rel="noopener">Source</a>` : '';
      return `<div class="tool ${live ? 'live' : 'soon'}">
        <div class="ico">${t.icon}</div>
        <h3>${title}</h3>
        <p>${t.desc}</p>
        <div class="meta"><span class="url">${host}</span>${src}<span class="badge ${live ? 'live' : 'soon'}">${live ? 'Live' : 'Coming soon'}</span></div>
      </div>`;
    }).join('');
  }
})();


const lastUpdatedSpan = Array.from(document.querySelectorAll('div span')).find(
  el => el.textContent.trim() === 'Last updated'
);

if (lastUpdatedSpan) {
  // Find the bold tag right next to it
  const dateElement = lastUpdatedSpan.nextElementSibling;
  
  if (dateElement && dateElement.tagName === 'B') {
    // Get current month and year
    const options = { month: 'long', year: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options); // e.g., "November 2026"
    
    // Insert today's date
    dateElement.textContent = today;
  }
}
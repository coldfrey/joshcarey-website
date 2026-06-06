// Site interactivity: theme toggle + CRT boot, keyboard shortcuts, gallery
// lightbox, git-show expand, help overlay. All listeners are attached to
// `document` once, so they survive Astro View Transitions (body swaps).

declare global {
  interface Window {
    __siteInit?: boolean;
  }
}

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isTyping = (el: EventTarget | null) => {
  const n = el as HTMLElement | null;
  return (
    !!n &&
    (n.tagName === 'INPUT' ||
      n.tagName === 'TEXTAREA' ||
      n.isContentEditable)
  );
};

/* ---------------- theme + CRT boot ---------------- */
function applyTheme(t: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem('theme', t);
    // session pref drives the phone default (light-first, dark per-session)
    sessionStorage.setItem('theme', t);
  } catch {}
}

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
}

/* ---------------- terminal font zoom (scales the whole terminal in place) ---- */
const TERM_FONT_KEY = 'term-font';
let termFont = 16;
let hudTimer = 0;

function applyTermFont(px: number) {
  document.documentElement.style.setProperty('--term-font', px + 'px');
}

function showZoomHud(px: number) {
  let hud = document.getElementById('term-zoom-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'term-zoom-hud';
    hud.className = 'term-zoom-hud';
    document.body.appendChild(hud);
  }
  hud.textContent = `font: ${px}px`;
  hud.classList.add('show');
  window.clearTimeout(hudTimer);
  hudTimer = window.setTimeout(() => hud!.classList.remove('show'), 1000);
}

function setTermFont(px: number, hud = true) {
  termFont = Math.min(30, Math.max(10, px));
  applyTermFont(termFont);
  try {
    localStorage.setItem(TERM_FONT_KEY, String(termFont));
  } catch {}
  if (hud) showZoomHud(termFont);
}

function initTermFont() {
  let v = 16;
  try {
    v = Number(localStorage.getItem(TERM_FONT_KEY)) || 16;
  } catch {}
  termFont = v;
  applyTermFont(v);
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
function bootCharDelay(ch: string) {
  let d = 3 + Math.random() * 8; // fast machine boot (~90–120 cps)
  if (ch === ':' || ch === ']') d += 10 + Math.random() * 20;
  if (Math.random() < 0.015) d += 70 + Math.random() * 120; // rare hesitation
  return d;
}

const BOOT_LINES = [
  'joshOS 2.0  (c) 2026 joshuacarey',
  '[ ok ] cpu: 1 core online',
  '[ ok ] mem: 16384K OK',
  '[ ok ] mount / : about work writing gallery',
  '[ ok ] amber-crt display driver',
  'login: joshuacarey (auto)',
  'welcome — type `help`',
];

let booting = false;
function playBoot(done?: () => void, quick = false) {
  if (booting) return;
  booting = true;
  const root = document.documentElement;
  root.classList.remove('preboot');

  // Quick path (manual toggle): just power the screen on, no typewriter.
  if (quick || reduceMotion()) {
    const win = document.querySelector('.term-window');
    win?.classList.add('crt-on');
    window.setTimeout(() => {
      win?.classList.remove('crt-on');
      booting = false;
      done && done();
    }, 520);
    try { sessionStorage.setItem('booted', '1'); } catch {}
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'crt-boot';
  const pre = document.createElement('pre');
  const cursor = document.createElement('span');
  cursor.className = 'boot-cursor';
  cursor.textContent = '█';
  pre.appendChild(cursor);
  overlay.appendChild(pre);
  document.body.appendChild(overlay);
  root.classList.remove('preboot');
  try { sessionStorage.setItem('booted', '1'); } catch {}

  // CRT collapse → terminal power-on morph
  const finish = () => {
    if (!booting) return;
    cursor.remove();
    overlay.classList.add('off');
    const win = document.querySelector('.term-window');
    win?.classList.add('crt-on');
    window.setTimeout(() => {
      overlay.remove();
      win?.classList.remove('crt-on');
      booting = false;
      done && done();
    }, 480);
  };

  if (reduceMotion()) {
    pre.insertBefore(document.createTextNode(BOOT_LINES.join('\n')), cursor);
    window.setTimeout(finish, 350);
    return;
  }

  let skipped = false;
  const onSkip = () => { skipped = true; };
  window.addEventListener('keydown', onSkip, { once: true });
  overlay.addEventListener('click', onSkip, { once: true });

  (async () => {
    for (let li = 0; li < BOOT_LINES.length; li++) {
      const text = BOOT_LINES[li];
      const node = document.createTextNode('');
      pre.insertBefore(node, cursor);
      if (skipped) {
        node.textContent = BOOT_LINES.slice(li).join('\n') + '\n';
        break;
      }
      for (let ci = 0; ci < text.length; ci++) {
        if (skipped) { node.textContent = text; break; }
        node.textContent += text[ci];
        await sleep(bootCharDelay(text[ci]));
      }
      pre.insertBefore(document.createTextNode('\n'), cursor);
      if (!skipped) await sleep(30 + Math.random() * 60);
    }
    window.removeEventListener('keydown', onSkip);
    await sleep(skipped ? 120 : 260);
    finish();
  })();
}

function focusTerminal() {
  const el = document.getElementById('term-input') as HTMLInputElement | null;
  el?.focus();
}

// Map the terminal's current deep-link (#p=…) to a light-mode page URL.
function pageForTerminalFile(): string | null {
  const h = location.hash.replace(/^#/, '');
  const p = new URLSearchParams(h).get('p');
  if (!p) return null;
  if (p.startsWith('writing/') && p.endsWith('.md')) return '/blog/' + p.slice(8, -3) + '/';
  if (p.startsWith('work/')) return '/work/';
  if (p.startsWith('gallery/')) return '/gallery/';
  return null;
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  if (next === 'dark') {
    // entering the terminal → open the file matching the current page path
    const path = location.pathname;
    applyTheme('dark');
    playBoot(() => {
      focusTerminal();
      try {
        (window as any).__termSyncPath?.(path);
      } catch {}
    }, true);
  } else {
    // leaving the terminal → go to the page matching the current terminal file
    const target = pageForTerminalFile();
    applyTheme('light');
    if (target && target.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) {
      location.href = target;
    } else {
      try {
        history.replaceState(history.state, '', location.pathname + location.search);
      } catch {}
    }
  }
}

/* ---------------- gallery lightbox ---------------- */
let lbIndex = -1;

const galleryEls = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('.gallery-item'),
  );

function fillLightbox(i: number) {
  const els = galleryEls();
  if (!els.length) return;
  lbIndex = (i + els.length) % els.length;
  const el = els[lbIndex];
  const img = document.getElementById('lb-img') as HTMLImageElement | null;
  const cap = document.querySelector<HTMLElement>('.lb-caption');
  const cmdfile = document.querySelector<HTMLElement>('.lb-cmdfile');
  if (!img) return;
  // show the blurred LQIP behind the full image while it loads, then clear it
  const lqip = el.dataset.lqip;
  img.style.backgroundImage = lqip ? `url("${lqip}")` : '';
  img.style.backgroundSize = 'cover';
  img.style.backgroundPosition = 'center';
  img.onload = () => {
    img.style.backgroundImage = '';
  };
  img.src = el.dataset.full || '';
  img.alt = el.dataset.title || '';
  if (cap) cap.textContent = `${el.dataset.title || ''} — ${el.dataset.meta || ''}`;
  if (cmdfile) cmdfile.textContent = (el.dataset.meta || 'image').split(' · ')[0];
}

function openLightbox(i: number) {
  const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
  if (!dlg) return;
  const run = () => {
    fillLightbox(i);
    if (!dlg.open) dlg.showModal();
  };
  const src = galleryEls()[i];
  // View-transition morph from thumbnail → lightbox image.
  if ((document as any).startViewTransition && src && !reduceMotion()) {
    const img = src.querySelector('img');
    if (img) (img as HTMLElement).style.viewTransitionName = 'lb-active';
    const lbImg = document.getElementById('lb-img');
    try {
      const vt = (document as any).startViewTransition(() => {
        if (img) (img as HTMLElement).style.viewTransitionName = '';
        if (lbImg) (lbImg as HTMLElement).style.viewTransitionName = 'lb-active';
        run();
      });
      vt.finished.finally(() => {
        if (lbImg) (lbImg as HTMLElement).style.viewTransitionName = '';
      });
    } catch {
      run();
    }
  } else {
    run();
  }
}

function closeLightbox() {
  const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
  if (dlg?.open) dlg.close();
}

function stepLightbox(dir: number) {
  if (lbIndex < 0) return;
  fillLightbox(lbIndex + dir);
}

/* ---------------- git show expand ---------------- */
function toggleCommit(commit: Element) {
  const show = commit.querySelector('.commit-show');
  if (show) (show as HTMLElement).hidden = !(show as HTMLElement).hidden;
}

/* ---------------- help overlay ---------------- */
function toggleHelp() {
  const dlg = document.getElementById('help') as HTMLDialogElement | null;
  if (!dlg) return;
  if (dlg.open) dlg.close();
  else dlg.showModal();
}

/* ---------------- keyboard navigation ---------------- */
const navItems = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('.ls-row, .commit, .gallery-item'),
  ).filter((el) => el.offsetParent !== null);

function moveFocus(dir: number) {
  const items = navItems();
  if (!items.length) return;
  const idx = items.indexOf(document.activeElement as HTMLElement);
  const next = items[Math.max(0, Math.min(items.length - 1, idx + dir))] ?? items[0];
  next.focus();
  next.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
}

let gPending = false;
let gTimer = 0;

function onKey(e: KeyboardEvent) {
  const dark = currentTheme() === 'dark';

  // Terminal font zoom — intercept Cmd/Ctrl +/-/0 so the *terminal* scales.
  if (dark && (e.metaKey || e.ctrlKey)) {
    if (e.key === '=' || e.key === '+') {
      setTermFont(termFont + 1);
      e.preventDefault();
    } else if (e.key === '-') {
      setTermFont(termFont - 1);
      e.preventDefault();
    } else if (e.key === '0') {
      setTermFont(16);
      e.preventDefault();
    }
    return;
  }

  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const lbOpen = (document.getElementById('lightbox') as HTMLDialogElement | null)?.open;

  // Lightbox-scoped keys
  if (lbOpen) {
    if (e.key === 'ArrowRight') {
      stepLightbox(1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      stepLightbox(-1);
      e.preventDefault();
    }
    return;
  }

  if (isTyping(e.target)) return;

  // `g` then key → goto
  if (gPending) {
    gPending = false;
    window.clearTimeout(gTimer);
    const map: Record<string, string> = {
      h: '/',
      w: '/work',
      g: '/gallery',
      b: '/blog',
    };
    if (map[e.key]) {
      location.href = map[e.key];
      e.preventDefault();
      return;
    }
  }

  switch (e.key) {
    case '+':
    case '=':
      if (dark) {
        setTermFont(termFont + 1);
        e.preventDefault();
      }
      break;
    case '-':
    case '_':
      if (dark) {
        setTermFont(termFont - 1);
        e.preventDefault();
      }
      break;
    case 't':
      toggleTheme();
      e.preventDefault();
      break;
    case '?':
      toggleHelp();
      e.preventDefault();
      break;
    case 'g':
      gPending = true;
      gTimer = window.setTimeout(() => (gPending = false), 1200);
      break;
    case 'j':
      moveFocus(1);
      e.preventDefault();
      break;
    case 'k':
      moveFocus(-1);
      e.preventDefault();
      break;
    case 'Enter':
      if (document.activeElement?.classList.contains('commit')) {
        toggleCommit(document.activeElement);
        e.preventDefault();
      }
      break;
    case '1':
    case '2':
    case '3':
    case '4': {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('.nav-links a'),
      );
      const target = links[Number(e.key) - 1];
      if (target) {
        location.href = target.getAttribute('href') || '/';
        e.preventDefault();
      }
      break;
    }
  }
}

/* ---------------- click delegation ---------------- */
function onClick(e: MouseEvent) {
  const t = e.target as HTMLElement;
  // macOS traffic lights in the terminal title bar
  const win = t.closest<HTMLElement>('[data-win]');
  if (win) {
    const kind = win.dataset.win;
    if (kind === 'close') return toggleTheme(); // red → exit terminal → light
    if (kind === 'min') return void (window as any).__termClear?.(); // yellow → clear
    if (kind === 'zoom') {
      setTermFont(termFont >= 20 ? 16 : 22); // green → toggle size
      (document.getElementById('term-input') as HTMLInputElement | null)?.focus({
        preventScroll: true,
      });
      return;
    }
  }
  if (t.closest('#theme-toggle')) return toggleTheme();
  if (t.closest('[data-theme-switch]')) return toggleTheme();
  if (t.closest('[data-lb-close]')) return closeLightbox();
  if (t.closest('[data-lb-prev]')) return stepLightbox(-1);
  if (t.closest('[data-lb-next]')) return stepLightbox(1);
  if (t.closest('[data-help]')) return toggleHelp();
  if (t.closest('.help-close')) return toggleHelp();
  const item = t.closest<HTMLElement>('.gallery-item, .ls-row');
  if (item) {
    e.preventDefault();
    return openLightbox(Number(item.dataset.index || 0));
  }
  const commit = t.closest('.commit');
  if (commit && !t.closest('a')) return toggleCommit(commit);
}

/* ---------------- sticky-nav border on scroll (light) ---------------- */
function syncNavScrolled() {
  const bar = document.querySelector('.topbar');
  if (bar) bar.classList.toggle('scrolled', window.scrollY > 4);
}

/* ---------------- blur-up images (LQIP preview → fade in full) ----------------
   Progressive enhancement: images that are already cached/complete show
   instantly; the rest start transparent over their blurred LQIP background and
   fade in on load. Without JS, images render normally (never hidden). */
function initBlurUp() {
  const imgs = document.querySelectorAll<HTMLImageElement>('img[data-blurup]');
  imgs.forEach((img) => {
    if (img.dataset.blurupWired) return;
    img.dataset.blurupWired = '1';
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('is-loaded');
      return;
    }
    img.classList.add('blurup');
    const done = () => img.classList.add('is-loaded');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

function init() {
  initTermFont();
  syncNavScrolled();
  initBlurUp();
  // Boot sequence on a fresh dark load (the head added `preboot`).
  if (document.documentElement.classList.contains('preboot')) {
    playBoot(focusTerminal);
  }
  if (window.__siteInit) return;
  window.__siteInit = true;
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', syncNavScrolled, { passive: true });
  // Clicking the dialog backdrop closes the lightbox.
  document.addEventListener('click', (e) => {
    const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
    if (dlg?.open && e.target === dlg) dlg.close();
  });
}

init();
document.addEventListener('astro:page-load', init);

// Interactive terminal — a real, hand-rolled shell for dark mode.
// Reads a build-time virtual filesystem (/fs.json) generated from the site's
// content. Pure DOM output (no emulator). Progressive enhancement: if this
// never runs, the static terminal-styled content is still fully readable.

interface FsNode {
  type: 'dir' | 'file';
  href?: string;
  content?: string;
  meta?: string;
  hidden?: boolean;
  children?: Record<string, FsNode>;
}

let FS: FsNode | null = null;
let fsPromise: Promise<FsNode | null> | null = null;
let cwd: string[] = [];
let history: string[] = [];
let histIdx = -1;
let draft = '';
const HKEY = 'term-history';

const NEOFETCH = String.raw`
   ____      joshuacarey@web
  / __ \     ---------------
 | |  | |    OS:     joshOS 2.0 (amber-crt)
 | |  | |    Host:   the web
 | |__| |    Shell:  jcsh
  \____/     Editor: vim (when brave)
   |  |      Stack:  Astro · TypeScript · Cloudflare
   |__|      Uptime: since you got here
`;

/* ---------- filesystem helpers ---------- */
async function loadFS(): Promise<FsNode | null> {
  if (FS) return FS;
  if (!fsPromise) {
    fsPromise = fetch('/fs.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        FS = j;
        return j;
      })
      .catch(() => null);
  }
  return fsPromise;
}

function nodeAt(segments: string[]): FsNode | null {
  if (!FS) return null;
  let node: FsNode = FS;
  for (const seg of segments) {
    if (node.type !== 'dir' || !node.children || !node.children[seg]) return null;
    node = node.children[seg];
  }
  return node;
}

function resolve(input: string): { segs: string[]; node: FsNode | null } {
  const base = input.startsWith('/') ? [] : [...cwd];
  const parts = input.split('/');
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '~') {
      base.length = 0;
      continue;
    }
    if (p === '..') {
      base.pop();
      continue;
    }
    base.push(p);
  }
  return { segs: base, node: nodeAt(base) };
}

const pretty = (segs: string[]) => '~' + (segs.length ? '/' + segs.join('/') : '');

/* ---------- output rendering (XSS-safe: textContent only) ---------- */
let outEl: HTMLElement | null = null;

function line(text = '', cls = ''): HTMLElement {
  const el = document.createElement('div');
  el.className = 'term-line' + (cls ? ' ' + cls : '');
  el.textContent = text;
  return el;
}

function print(node: HTMLElement | string, cls = '') {
  if (!outEl) return;
  outEl.appendChild(typeof node === 'string' ? line(node, cls) : node);
}

function printEcho(cmd: string) {
  const el = document.createElement('div');
  el.className = 'term-line term-echo';
  const ps = document.createElement('span');
  ps.className = 'term-ps1';
  ps.innerHTML =
    '<span class="usr">joshuacarey@web</span><span class="path">:' +
    escapeHtml(pretty(cwd)) +
    '</span><span class="dollar">$</span> ';
  el.appendChild(ps);
  el.appendChild(document.createTextNode(cmd));
  print(el);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/* ---------- commands ---------- */
type Ctx = { args: string[]; flags: Set<string> };
type Cmd = { run: (c: Ctx) => void | Promise<void>; help: string; hidden?: boolean };

function setTheme(t: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem('theme', t);
  } catch {}
}

const commands: Record<string, Cmd> = {
  help: {
    help: 'show this help',
    run() {
      print('available commands:', 'term-dim');
      const list = Object.entries(commands)
        .filter(([, c]) => !c.hidden)
        .map(([n, c]) => '  ' + n.padEnd(10) + c.help);
      list.forEach((l) => print(l));
      print('');
      print('navigate: cd <dir>, ls, cat <file>, open <name> · history: ↑/↓ · complete: tab', 'term-dim');
    },
  },
  ls: {
    help: 'list directory',
    run({ args, flags }) {
      const target = args[0] ? resolve(args[0]).node : nodeAt(cwd);
      if (!target) return void print(`ls: ${args[0]}: no such file or directory`, 'term-err');
      if (target.type === 'file') return void print(args[0]);
      const entries = Object.entries(target.children || {}).filter(
        ([n]) => flags.has('a') || !n.startsWith('.'),
      );
      if (!entries.length) return;
      const row = document.createElement('div');
      row.className = 'term-line term-ls';
      for (const [name, node] of entries) {
        const s = document.createElement('button');
        s.type = 'button';
        s.className = 'ls-entry ' + (node.type === 'dir' ? 'ls-dir' : 'ls-file');
        s.dataset.name = name;
        s.dataset.type = node.type;
        s.textContent = node.type === 'dir' ? name + '/' : name;
        row.appendChild(s);
      }
      print(row);
    },
  },
  cd: {
    help: 'change directory',
    run({ args }) {
      const dest = args[0] ?? '~';
      const { segs, node } = resolve(dest);
      if (!node) return void print(`cd: ${dest}: no such file or directory`, 'term-err');
      if (node.type !== 'dir') return void print(`cd: ${dest}: not a directory`, 'term-err');
      cwd = segs;
      updatePS1();
    },
  },
  pwd: { help: 'print working directory', run: () => print('/' + cwd.join('/')) },
  cat: {
    help: 'print a file',
    run({ args }) {
      if (!args[0]) return void print('usage: cat <file>', 'term-dim');
      const { node } = resolve(args[0]);
      if (!node) return void print(`cat: ${args[0]}: no such file`, 'term-err');
      if (node.type === 'dir') return void print(`cat: ${args[0]}: is a directory`, 'term-err');
      (node.content || '').split('\n').forEach((l) => {
        if (l.startsWith('→ ')) {
          const href = l.slice(2).trim();
          const a = document.createElement('a');
          a.className = 'term-link';
          a.href = href;
          if (/^https?:/.test(href)) {
            a.target = '_blank';
            a.rel = 'noopener';
          }
          a.textContent = l;
          const div = line();
          div.appendChild(a);
          print(div);
        } else print(l);
      });
    },
  },
  open: {
    help: 'open a page/link',
    run({ args }) {
      if (!args[0]) return void print('usage: open <name>', 'term-dim');
      const { node } = resolve(args[0]);
      const href = node?.href;
      if (!href) return void print(`open: ${args[0]}: nothing to open`, 'term-err');
      print(`opening ${href} …`, 'term-dim');
      window.location.href = href;
    },
  },
  whoami: { help: 'print user', run: () => print('joshuacarey') },
  echo: { help: 'print text', run: ({ args }) => print(args.join(' ')) },
  date: { help: 'current date', run: () => print(new Date().toString()) },
  clear: {
    help: 'clear the screen',
    run() {
      if (outEl) outEl.textContent = '';
      // also clear the static pre-printed content for a true clear
      document
        .querySelectorAll('main > .block, main > .gitlog, main > .gallery-ls, main > .cmd-line, main > .page-title, main > .page-lede, main > .timeline, main > .gallery, main > article, main > .back-link')
        .forEach((n) => ((n as HTMLElement).style.display = 'none'));
    },
  },
  neofetch: { help: 'system info', run: () => NEOFETCH.split('\n').forEach((l) => print(l, 'term-amber')) },
  theme: {
    help: 'theme <light|dark>',
    run({ args }) {
      const t = args[0];
      if (t === 'light' || t === 'dark') setTheme(t);
      else setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    },
  },
  history: {
    help: 'command history',
    run: () => history.forEach((h, i) => print(`  ${String(i + 1).padStart(3)}  ${h}`)),
  },
  sudo: {
    help: 'superuser do',
    run: ({ args }) =>
      print(
        args.join(' ').includes('rm')
          ? 'nice try. this incident has been reported. 🚨'
          : 'joshuacarey is not in the sudoers file. this incident will be reported.',
        'term-err',
      ),
  },
  vim: { help: 'the editor', run: () => print("entering vim… just kidding. you escaped. (others aren't so lucky)") },
  nano: { hidden: true, help: '', run: () => print('real ones use vim 😏') },
  sl: {
    help: 'steam locomotive',
    run() {
      const train = String.raw`
      ====        ________                ___________
  _D _|  |_______/        \__I_I_____===__|_________|
   |(_)---  |   H\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-~~\  /~~\  /~~\  /~~\ ____Y___________|__
 |/-=|___|=O=====O=====O=====O   |_____/~\___/
  \_/      \__/  \__/  \__/  \__/      \_/`;
      train.split('\n').forEach((l) => print(l, 'term-amber'));
      print('🚂  choo choo! (you typed sl instead of ls, didn\'t you)', 'term-dim');
    },
  },
  snake: { help: 'play snake 🐍', run: () => startSnake() },
  motd: { hidden: true, help: '', run: () => print('the web is yours. build something.') },
  exit: { help: 'leave', run: () => print('there is no exit. (but try: theme light)', 'term-dim') },
};
commands.la = { hidden: true, help: '', run: (c) => commands.ls.run({ ...c, flags: new Set([...c.flags, 'a']) }) };
commands.ll = { hidden: true, help: '', run: commands.ls.run };
commands.man = {
  help: 'manual for a command',
  run({ args }) {
    const c = commands[args[0]];
    if (!c) return void print(`No manual entry for ${args[0] || ''}`, 'term-err');
    print(`${args[0]} — ${c.help}`);
  },
};
// handy aliases
commands.h = { hidden: true, help: '', run: commands.help.run };
commands['?'] = { hidden: true, help: '', run: commands.help.run };
commands.cls = { hidden: true, help: '', run: commands.clear.run };
commands.dir = { hidden: true, help: '', run: commands.ls.run };
commands.about = {
  hidden: true,
  help: '',
  run: () => commands.cat.run({ args: ['about.txt'], flags: new Set() }),
};
commands.gallery = {
  help: 'browse photos',
  run: () => {
    commands.cd.run({ args: ['gallery'], flags: new Set() });
    commands.ls.run({ args: [], flags: new Set() });
  },
};

/* ---------- the shell loop ---------- */
function exec(raw: string, addHistory: boolean) {
  const trimmed = raw.trim();
  printEcho(raw);
  if (trimmed) {
    if (addHistory) {
      history.push(trimmed);
      saveHistory();
    }
    const [name, ...args] = trimmed.split(/\s+/);
    const flags = new Set<string>();
    const positional: string[] = [];
    for (const a of args) {
      if (a.startsWith('-') && a.length > 1) a.slice(1).split('').forEach((f) => flags.add(f));
      else positional.push(a);
    }
    const cmd = commands[name];
    if (cmd) {
      try {
        cmd.run({ args: positional, flags });
      } catch {
        print(`${name}: error`, 'term-err');
      }
    } else {
      print(`command not found: ${name} — type 'help'`, 'term-err');
    }
  }
  histIdx = -1;
  draft = '';
  scrollToInput();
}

/* ---------- input handling ---------- */
let inputEl: HTMLInputElement | null = null;

function onKeyDown(e: KeyboardEvent) {
  if (!inputEl) return;
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!history.length) return;
    if (histIdx === -1) {
      draft = inputEl.value;
      histIdx = history.length;
    }
    histIdx = Math.max(0, histIdx - 1);
    inputEl.value = history[histIdx];
    comp.matches = [];
    moveCaretEnd();
    renderLine();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx === -1) return;
    histIdx++;
    if (histIdx >= history.length) {
      histIdx = -1;
      inputEl.value = draft;
    } else inputEl.value = history[histIdx];
    comp.matches = [];
    moveCaretEnd();
    renderLine();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    complete();
  } else if (e.key === 'l' && e.ctrlKey) {
    e.preventDefault();
    commands.clear.run({ args: [], flags: new Set() });
  }
}

// Tab completion that CYCLES through matches (zsh menu-complete style).
let comp = { matches: [] as string[], idx: 0, prefix: '', value: '' };

function complete() {
  if (!inputEl) return;
  const val = inputEl.value;

  // already cycling on the same value → advance to the next match
  if (comp.matches.length && val === comp.value) {
    comp.idx = (comp.idx + 1) % comp.matches.length;
    applyCompletion();
    return;
  }

  const m = /(\S*)$/.exec(val)!;
  const token = m[1];
  const prefix = val.slice(0, val.length - token.length);
  const isFirst = prefix.trim() === '';
  // only no-op when the whole line is empty; "cat " + Tab should list files
  if (token === '' && isFirst) return;

  let pool: string[];
  if (isFirst) {
    pool = Object.keys(commands).filter((c) => !commands[c].hidden);
  } else {
    const dir = nodeAt(cwd);
    pool = dir?.children
      ? Object.keys(dir.children).filter((n) => !n.startsWith('.') || token.startsWith('.'))
      : [];
  }
  const matches = pool.filter((p) => p.startsWith(token)).sort();
  if (!matches.length) return;
  if (matches.length === 1) {
    inputEl.value = prefix + matches[0] + (isFirst ? ' ' : '');
    comp.matches = [];
    renderLine();
    return;
  }
  comp = { matches, idx: 0, prefix, value: '' };
  applyCompletion();
}

function applyCompletion() {
  if (!inputEl) return;
  inputEl.value = comp.prefix + comp.matches[comp.idx];
  comp.value = inputEl.value;
  moveCaretEnd();
  renderLine();
}

function moveCaretEnd() {
  if (!inputEl) return;
  const n = inputEl.value.length;
  inputEl.setSelectionRange(n, n);
}

/* ---------- snake 🐍 ---------- */
let snakeActive = false;
function startSnake() {
  if (snakeActive) return;
  snakeActive = true;
  const size = 17,
    cell = 14;
  const cvs = document.createElement('canvas');
  cvs.width = size * cell;
  cvs.height = size * cell;
  cvs.className = 'term-snake';
  print(cvs);
  print("arrow keys to move · q to quit", 'term-dim');
  scrollToInput();
  const ctx = cvs.getContext('2d')!;
  let snake = [{ x: 8, y: 8 }];
  let dir = { x: 1, y: 0 };
  let food = { x: 4, y: 4 };
  let score = 0;
  let timer = 0;
  const amber = getComputedStyle(document.documentElement).getPropertyValue('--amber') || '#ffb000';

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#e8856a';
    ctx.fillRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4);
    ctx.fillStyle = amber.trim() || '#ffb000';
    snake.forEach((s) => ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2));
  }
  function tick() {
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || snake.some((s) => s.x === head.x && s.y === head.y)) {
      stop(`game over · score ${score}`);
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      food = { x: (Math.abs(head.x * 7 + score * 3) % size), y: (Math.abs(head.y * 5 + score * 11) % size) };
    } else snake.pop();
    draw();
  }
  function key(e: KeyboardEvent) {
    const k = e.key;
    if (k === 'q' || k === 'Escape') return stop(`quit · score ${score}`);
    if (k === 'ArrowUp' && dir.y === 0) dir = { x: 0, y: -1 };
    else if (k === 'ArrowDown' && dir.y === 0) dir = { x: 0, y: 1 };
    else if (k === 'ArrowLeft' && dir.x === 0) dir = { x: -1, y: 0 };
    else if (k === 'ArrowRight' && dir.x === 0) dir = { x: 1, y: 0 };
    else return;
    e.preventDefault();
  }
  function stop(msg: string) {
    window.clearInterval(timer);
    document.removeEventListener('keydown', key, true);
    snakeActive = false;
    print(msg, 'term-amber');
    scrollToInput();
    inputEl?.focus();
  }
  document.addEventListener('keydown', key, true);
  draw();
  timer = window.setInterval(tick, 130);
}

/* ---------- history persistence ---------- */
function loadHistory() {
  try {
    history = JSON.parse(localStorage.getItem(HKEY) || '[]');
  } catch {
    history = [];
  }
}
function saveHistory() {
  try {
    localStorage.setItem(HKEY, JSON.stringify(history.slice(-100)));
  } catch {}
}

/* ---------- wiring ---------- */
function updatePS1() {
  const p = pretty(cwd);
  document.querySelectorAll('.term-cwd').forEach((el) => (el.textContent = ':' + p));
  const title = document.querySelector('.term-title');
  if (title) title.textContent = `joshuacarey@web: ${p} — zsh`;
  const sp = document.querySelector('.status-path');
  if (sp) sp.textContent = p;
}
function scrollToInput() {
  // Pin to the bottom SYNCHRONOUSLY so the prompt never leaves the viewport,
  // even when Enter is held down (smooth-scroll is disabled in dark mode).
  const el = document.scrollingElement || document.documentElement;
  el.scrollTop = el.scrollHeight;
}

/* ---------- rendered line + block caret ---------- */
let lineEl: HTMLElement | null = null;
let typingTimer = 0;

function renderLine() {
  if (!inputEl || !lineEl) return;
  const v = inputEl.value;
  let pos = inputEl.selectionStart ?? v.length;
  if (pos < 0) pos = v.length;
  const under = v.slice(pos, pos + 1);
  lineEl.textContent = '';
  lineEl.appendChild(document.createTextNode(v.slice(0, pos)));
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.textContent = under || ' ';
  lineEl.appendChild(caret);
  lineEl.appendChild(document.createTextNode(v.slice(pos + (under ? 1 : 0))));
}

function bumpTyping() {
  if (!lineEl) return;
  lineEl.classList.add('typing');
  window.clearTimeout(typingTimer);
  typingTimer = window.setTimeout(() => lineEl?.classList.remove('typing'), 450);
}

async function init() {
  const form = document.getElementById('term-form') as HTMLFormElement | null;
  inputEl = document.getElementById('term-input') as HTMLInputElement | null;
  outEl = document.getElementById('term-out');
  if (!form || !inputEl || !outEl || form.dataset.wired) return;
  form.dataset.wired = '1';

  lineEl = document.getElementById('term-line');
  loadHistory();
  cwd = [];
  await loadFS();
  updatePS1();
  welcome();
  renderLine();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = inputEl!.value;
    inputEl!.value = '';
    comp.matches = [];
    exec(v, true);
    renderLine();
  });
  inputEl.addEventListener('keydown', onKeyDown);
  // keep the rendered line + block caret in sync with the hidden input
  inputEl.addEventListener('input', () => {
    comp.matches = [];
    bumpTyping();
    renderLine();
  });
  inputEl.addEventListener('keyup', renderLine);
  inputEl.addEventListener('click', renderLine);
  inputEl.addEventListener('select', renderLine);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === inputEl) renderLine();
  });

  // Clickable scrollback: ls entries + links act like typed commands.
  outEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const entry = target.closest('.ls-entry') as HTMLElement | null;
    if (entry) {
      const name = entry.dataset.name!;
      if (entry.dataset.type === 'dir') exec('cd ' + name, false), exec('ls', false);
      else exec('cat ' + name, false);
      return;
    }
  });

  // The WHOLE terminal window is clickable to focus the prompt (like a real
  // terminal) — except on links/buttons/files, or when selecting text.
  const win = document.querySelector('.term-window');
  win?.addEventListener('mousedown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('a, button, .ls-entry, input')) return;
    if (window.getSelection()?.toString()) return;
    setTimeout(() => inputEl?.focus({ preventScroll: true }), 0);
  });

  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    setTimeout(() => inputEl?.focus(), 60);
  }
}

function welcome() {
  print('joshuacarey@web — type `help`, or click any file / folder below.', 'term-dim');
  const hint = line('', 'term-dim');
  hint.append('prefer a clean reading view? ');
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'term-link';
  sw.setAttribute('data-theme-switch', '');
  sw.textContent = 'switch to light mode →';
  hint.appendChild(sw);
  print(hint);
  print('');
  exec('ls', false);
}

function pathFromLocation(): string[] {
  const p = location.pathname.replace(/^\/|\/$/g, '');
  if (!p) return [];
  const first = p.split('/')[0];
  return ['work', 'blog', 'gallery'].includes(first) ? [first] : [];
}

init();
document.addEventListener('astro:page-load', init);

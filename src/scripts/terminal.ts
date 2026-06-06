// Interactive terminal — a real, hand-rolled shell for dark mode.
// Reads a build-time virtual filesystem (/fs.json) generated from the site's
// content. Pure DOM output (no emulator). Progressive enhancement: if this
// never runs, the static terminal-styled content is still fully readable.

interface GalleryImg {
  src: string;
  w: number;
  h: number;
  size: string;
  date: string;
  title: string;
  location?: string;
}
interface FsNode {
  type: 'dir' | 'file';
  href?: string;
  content?: string;
  meta?: string;
  hidden?: boolean;
  img?: GalleryImg;
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

/* ---------- shareable deep links (?p=blog/hello-world.md) ---------- */
// Use the URL hash for deep links — Astro's ClientRouter manages pathname/search
// but never touches the hash, so #p=… survives navigation/scroll.
function setUrl(path: string) {
  try {
    const want = path ? 'p=' + encodeURIComponent(path) : '';
    if (location.hash.replace(/^#/, '') === want) return;
    if (want) location.hash = want;
    else history.replaceState(history.state, '', location.pathname + location.search);
  } catch {}
}
function readDeepLink(): string | null {
  const h = location.hash.replace(/^#/, '');
  if (!h) return null;
  return new URLSearchParams(h).get('p');
}

// Sync the terminal to a light-mode page path (called on theme toggle → dark),
// so switching themes keeps you on the same content.
function termSyncPath(pathname: string) {
  if (!FS || !outEl) return;
  const seg = pathname.replace(/^\/+|\/+$/g, '');
  cwd = [];
  if (!seg) {
    updatePS1();
    return;
  }
  if (seg.startsWith('blog/')) {
    const slug = seg.slice(5);
    if (resolve('writing/' + slug + '.md').node) {
      commands.cd.run({ args: ['writing'], flags: new Set() });
      updatePS1();
      exec('cat ' + slug + '.md', false);
      return;
    }
  }
  if (seg === 'blog') {
    commands.cd.run({ args: ['writing'], flags: new Set() });
    updatePS1();
    exec('ls', false);
    return;
  }
  if (seg === 'work') {
    updatePS1();
    exec('git log', false);
    return;
  }
  if (seg === 'gallery') {
    updatePS1();
    exec('gallery', false);
    return;
  }
  updatePS1();
}

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

function spanEl(cls: string, text: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
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
      // prominent light-mode escape at the very top
      const top = line('', 'term-dim');
      top.append('not into the terminal? ');
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'term-link';
      sw.setAttribute('data-theme-switch', '');
      sw.textContent = 'Boring Mode →';
      top.appendChild(sw);
      print(top);
      print('');
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
      const { segs, node } = resolve(args[0]);
      if (!node) return void print(`cat: ${args[0]}: no such file`, 'term-err');
      if (node.type === 'dir') return void print(`cat: ${args[0]}: is a directory`, 'term-err');
      const box = document.createElement('div');
      box.className = 'cat-box';
      const head = document.createElement('div');
      head.className = 'cat-head';
      head.textContent = segs.length ? segs.join('/') : args[0];
      box.appendChild(head);
      const linkRe = /(https?:\/\/[^\s]+|mailto:[^\s]+)/;
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
          const div = line('', 'cat-line');
          div.appendChild(a);
          box.appendChild(div);
        } else {
          const m = l.match(linkRe);
          if (m) {
            // make any URL / mailto in the line an actual clickable link
            const div = line('', 'cat-line');
            const url = m[0];
            const idx = m.index ?? 0;
            if (idx) div.appendChild(document.createTextNode(l.slice(0, idx)));
            const a = document.createElement('a');
            a.className = 'term-link';
            a.href = url;
            if (/^https?:/.test(url)) {
              a.target = '_blank';
              a.rel = 'noopener';
            }
            a.textContent = url;
            div.appendChild(a);
            const rest = l.slice(idx + url.length);
            if (rest) div.appendChild(document.createTextNode(rest));
            box.appendChild(div);
          } else {
            box.appendChild(line(l, 'cat-line'));
          }
        }
      });
      print(box);
      // shareable deep-link: ?p=blog/hello-world.md
      setUrl(segs.join('/'));
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
      // Just empty the terminal output. (Page content is already hidden in dark
      // via CSS; hiding it with inline styles used to leak into light mode.)
      if (outEl) outEl.textContent = '';
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
commands.gallery = { help: 'browse photos (TUI)', run: () => startGallery() };

interface Commit {
  hash: string;
  title: string;
  date: string;
  range: string;
  role: string;
  type: string;
  refs: string[];
  desc: string;
  stack: string[];
  highlights: string[];
  href: string;
}
const refClass = (r: string) =>
  r.startsWith('tag:') ? 'ref-tag' : r.startsWith('HEAD') ? 'ref-head' : 'ref-branch';

commands.git = {
  help: 'project history — git log --graph',
  run({ args }) {
    const commits: Commit[] = (FS as any)?.commits || [];
    if (!commits.length) return void print('git: no commits found', 'term-err');

    if (args[0] === 'show') {
      const c = commits.find((x) => x.hash.startsWith(args[1] || ''));
      if (!c) return void print(`git: bad revision '${args[1] || ''}'`, 'term-err');
      print(spanEl('hash', `commit ${c.hash}`));
      print('Author: Joshua Carey <josh.fwh.carey@gmail.com>', 'term-dim');
      print(`Date:   ${c.range}`, 'term-dim');
      print('');
      print(`    ${c.type}: ${c.title}`);
      print('');
      c.highlights.forEach((h) => print('    + ' + h, 'cb-add'));
      if (c.stack.length) print('    stack: ' + c.stack.join(', '), 'term-dim');
      if (c.href && c.href !== '#') {
        const d = line('    ');
        const a = document.createElement('a');
        a.className = 'term-link';
        a.href = c.href;
        if (/^https?:/.test(c.href)) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        a.textContent = '→ ' + c.href;
        d.appendChild(a);
        print(d);
      }
      return;
    }

    // git log --graph
    commits.forEach((c) => {
      const row = line();
      row.append(spanEl('graph', '* '), spanEl('hash', c.hash + ' '));
      if (c.refs.length) {
        row.append(document.createTextNode('('));
        c.refs.forEach((r, j) => {
          if (j) row.append(spanEl('sep', ', '));
          row.append(spanEl(refClass(r), r));
        });
        row.append(document.createTextNode(') '));
      }
      row.append(spanEl('ctype', c.type + ': '), spanEl('subject', c.title));
      print(row);

      const body = line();
      body.append(spanEl('graph', '│ '), spanEl('cb-text', '  ' + c.desc));
      print(body);
      const meta = line();
      meta.append(spanEl('graph', '│ '), spanEl('cb-meta', '  ' + c.range + (c.role ? ' · ' + c.role : '')));
      print(meta);
      print(spanEl('graph', '│'));
    });
    print('', 'term-dim');
    print('› git show <hash> for details', 'term-dim');
  },
};

commands.matrix = { help: 'enter the matrix', hidden: true, run: () => startMatrix() };

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
let viewportWired = false;

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

/* ---------- gallery: amber braille TUI 🖼 ---------- */
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

// Braille (U+2800) renderer: 2×4 luminance dots per glyph, adaptive threshold.
const BRAILLE_BITS = [0x01, 0x08, 0x02, 0x10, 0x04, 0x20, 0x40, 0x80];
async function toBraille(src: string, cols = 56): Promise<string> {
  const img = await loadImg(src);
  const ratio = img.height / img.width;
  const rows = Math.max(1, Math.round(cols * ratio * (2 / 4) * 2));
  const cw = cols * 2;
  const ch = rows * 4;
  const cvs = document.createElement('canvas');
  cvs.width = cw;
  cvs.height = ch;
  const ctx = cvs.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, cw, ch);
  const { data } = ctx.getImageData(0, 0, cw, ch);
  const lum = (x: number, y: number) => {
    const i = (y * cw + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  let sum = 0;
  for (let p = 0; p < data.length; p += 4) sum += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  const thresh = sum / (data.length / 4);
  let out = '';
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let bits = 0;
      let k = 0;
      for (let dy = 0; dy < 4; dy++)
        for (let dx = 0; dx < 2; dx++, k++) if (lum(gx * 2 + dx, gy * 4 + dy) > thresh) bits |= BRAILLE_BITS[k];
      out += String.fromCharCode(0x2800 + bits);
    }
    out += '\n';
  }
  return out;
}

let galleryActive = false;
function startGallery() {
  if (galleryActive) return;
  const dir = nodeAt(['gallery']);
  const entries = dir?.children ? Object.entries(dir.children) : [];
  const items = entries
    .map(([name, n]) => ({ name, img: n.img, href: n.href }))
    .filter((it) => it.img || it.href);
  if (!items.length) return void print('gallery: no photos found', 'term-err');

  galleryActive = true;
  inputEl?.blur();

  const tui = document.createElement('div');
  tui.className = 'tui';
  const listEl = document.createElement('div');
  listEl.className = 'tui-list';
  listEl.setAttribute('role', 'listbox');
  const previewEl = document.createElement('div');
  previewEl.className = 'tui-preview';
  const stageEl = document.createElement('div');
  stageEl.className = 'tui-stage';
  const img = document.createElement('img');
  img.className = 'tui-img';
  img.alt = '';
  img.loading = 'eager';
  stageEl.appendChild(img);
  const metaEl = document.createElement('div');
  metaEl.className = 'tui-meta';
  previewEl.append(stageEl, metaEl);
  tui.append(listEl, previewEl);

  const rows = items.map((it, i) => {
    const r = document.createElement('button');
    r.type = 'button';
    r.className = 'tui-row';
    r.dataset.i = String(i);
    r.setAttribute('role', 'option');
    const cur = document.createElement('span');
    cur.className = 'tui-cur';
    cur.textContent = '  ';
    const nm = document.createElement('span');
    nm.className = 'tui-name';
    nm.textContent = it.name;
    const sz = document.createElement('span');
    sz.className = 'tui-size';
    sz.textContent = it.img?.size || '';
    const dt = document.createElement('span');
    dt.className = 'tui-date';
    dt.textContent = it.img?.date || '';
    r.append(cur, nm, sz, dt);
    listEl.appendChild(r);
    return r;
  });

  print(tui);
  const hint = line('', 'term-dim');
  hint.textContent = '  j/k or ↑/↓ move · enter open · q quit · (or click a photo)';
  print(hint);
  scrollToInput();

  let sel = 0;

  function render() {
    rows.forEach((r, i) => {
      const on = i === sel;
      r.setAttribute('aria-selected', String(on));
      (r.querySelector('.tui-cur') as HTMLElement).textContent = on ? '› ' : '  ';
    });
    const it = items[sel];
    img.src = it.img?.src || it.href || '';
    metaEl.textContent =
      `${it.img?.title || it.name}${it.img?.location ? ' · ' + it.img.location : ''}\n` +
      `${it.img ? `${it.img.w}×${it.img.h} · ${it.img.size} · ${it.img.date}` : ''}`;
    rows[sel].scrollIntoView({ block: 'nearest' });
  }
  function move(d: number) {
    sel = (sel + d + items.length) % items.length;
    render();
  }
  function quit() {
    galleryActive = false;
    document.removeEventListener('keydown', key, true);
    print('', '');
    inputEl?.focus();
    scrollToInput();
  }
  function key(e: KeyboardEvent) {
    const k = e.key;
    if (k === 'j' || k === 'ArrowDown') move(1);
    else if (k === 'k' || k === 'ArrowUp') move(-1);
    else if (k === 'Enter' || k === 'l') openPhoto(items, sel);
    else if (k === 'q' || k === 'Escape') quit();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
  listEl.addEventListener('click', (e) => {
    const r = (e.target as HTMLElement).closest('.tui-row') as HTMLElement | null;
    if (!r) return;
    sel = Number(r.dataset.i);
    render();
    openPhoto(items, sel);
  });
  document.addEventListener('keydown', key, true);
  render();
}

type Photo = { name: string; img?: GalleryImg; href?: string };
function openPhoto(items: Photo[], start: number) {
  let i = start;
  const ov = document.createElement('div');
  ov.className = 'photo-overlay';
  const frame = document.createElement('div');
  frame.className = 'photo-frame';
  const stage = document.createElement('div');
  stage.className = 'photo-stage';
  const img = document.createElement('img');
  img.className = 'photo-img';
  img.alt = '';
  stage.appendChild(img);
  const cap = document.createElement('div');
  cap.className = 'photo-cap';
  const hint = document.createElement('div');
  hint.className = 'photo-hint';
  hint.textContent = '← → navigate · esc / click to close';
  frame.append(stage, cap);
  ov.append(frame, hint);
  document.body.appendChild(ov);

  const show = () => {
    const it = items[i];
    const src = it.img?.src || it.href || '';
    const go = () => {
      img.src = src;
      cap.textContent = it.img
        ? `${it.img.title} — ${it.img.w}×${it.img.h} · ${it.img.size} · ${it.img.date}`
        : it.name;
    };
    if ((document as any).startViewTransition && !reduceMotionT()) {
      img.style.viewTransitionName = 'photo';
      (document as any).startViewTransition(go);
    } else go();
  };
  const close = () => {
    document.removeEventListener('keydown', key, true);
    ov.remove();
    inputEl?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const k = e.key;
    if (k === 'ArrowRight') i = (i + 1) % items.length;
    else if (k === 'ArrowLeft') i = (i - 1 + items.length) % items.length;
    else if (k === 'Escape' || k === 'q') return close();
    else return;
    e.preventDefault();
    e.stopPropagation();
    show();
  };
  ov.addEventListener('click', (e) => {
    if (e.target === img) {
      i = (i + 1) % items.length;
      show();
    } else close();
  });
  document.addEventListener('keydown', key, true);
  show();
}

function reduceMotionT() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ---------- matrix rain 🟧 ---------- */
let matrixActive = false;
function startMatrix() {
  if (matrixActive) return;
  if (reduceMotionT()) {
    print('the matrix has you… (animation disabled by reduced-motion)', 'term-amber');
    return;
  }
  matrixActive = true;
  inputEl?.blur();
  const cvs = document.createElement('canvas');
  cvs.className = 'term-matrix';
  const w = Math.min(640, Math.floor((outEl?.clientWidth || 600) * 0.92));
  cvs.width = w;
  cvs.height = 260;
  print(cvs);
  print('press q to wake up', 'term-dim');
  scrollToInput();
  const ctx = cvs.getContext('2d')!;
  const amber = (getComputedStyle(document.documentElement).getPropertyValue('--amber') || '#ffb000').trim();
  const fontSize = 14;
  const cols = Math.floor(cvs.width / fontSize);
  const drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * -20));
  const glyphs = 'アイウエオカキクケコサシスセソ0123456789ABCDEF<>/\\$#*'.split('');
  let timer = 0;
  function frame() {
    ctx.fillStyle = 'rgba(10,7,2,0.18)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.font = fontSize + 'px monospace';
    for (let i = 0; i < cols; i++) {
      const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillStyle = Math.random() < 0.06 ? '#fff3d6' : amber || '#ffb000';
      ctx.fillText(ch, x, y);
      if (y > cvs.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'q' || e.key === 'Escape') {
      window.clearInterval(timer);
      document.removeEventListener('keydown', key, true);
      matrixActive = false;
      print('wake up, joshuacarey…', 'term-amber');
      inputEl?.focus();
      scrollToInput();
      e.preventDefault();
      e.stopPropagation();
    }
  }
  document.addEventListener('keydown', key, true);
  timer = window.setInterval(frame, 55);
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
  // Only the terminal (dark) pins to the bottom. In light mode the terminal is
  // hidden, so scrolling the document would wrongly jump pages (e.g. Work) to
  // the bottom on load.
  if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
  // On touch the scrollback scrolls inside #term-out (the window is fixed to the
  // visual viewport); on desktop the whole page scrolls. Do both — harmless.
  if (outEl) outEl.scrollTop = outEl.scrollHeight;
  const el = document.scrollingElement || document.documentElement;
  el.scrollTop = el.scrollHeight;
}

// Keep the terminal sized to the *visible* area so the prompt stays above the
// soft keyboard. visualViewport.height shrinks when the keyboard opens; its
// offsetTop moves if the page gets nudged under the keyboard.
function syncViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  root.style.setProperty('--app-height', vv.height + 'px');
  root.style.setProperty('--app-top', vv.offsetTop + 'px');
}

/* ---------- rendered line + block caret ---------- */
let lineEl: HTMLElement | null = null;
let typingTimer = 0;

function renderLine() {
  if (!inputEl || !lineEl) return;
  const v = inputEl.value;
  let pos = inputEl.selectionStart ?? v.length;
  if (pos < 0) pos = v.length;
  lineEl.textContent = '';
  // zero-width baseline char so the (possibly empty) line aligns with the
  // prompt and the absolute caret sits on the same line, not below it.
  lineEl.appendChild(document.createTextNode('​'));
  highlightInto(lineEl, v);
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.style.left = `calc(${pos} * 1ch)`;
  lineEl.appendChild(caret);
}

// Live syntax highlighting (fish-style): valid/invalid command, flags, paths.
function highlightInto(container: HTMLElement, v: string) {
  if (!v) return;
  const parts = v.split(/(\s+)/);
  let word = 0;
  for (const seg of parts) {
    if (!seg) continue;
    if (/^\s+$/.test(seg)) {
      container.appendChild(document.createTextNode(seg));
      continue;
    }
    const span = document.createElement('span');
    span.textContent = seg;
    if (word === 0) span.className = commands[seg] ? 'tok-cmd' : 'tok-bad';
    else if (seg.startsWith('-')) span.className = 'tok-flag';
    else span.className = FS && resolve(seg).node ? 'tok-path' : 'tok-arg';
    container.appendChild(span);
    word++;
  }
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

  // shareable deep link: /#p=blog/hello-world.md → land straight in that file
  const deep = readDeepLink();
  const deepNode = deep ? resolve(deep).node : null;
  if (deep && deepNode && deepNode.type === 'file') {
    const parts = deep.split('/').filter(Boolean);
    const file = parts.pop()!;
    if (parts.length) commands.cd.run({ args: [parts.join('/')], flags: new Set() });
    updatePS1();
    print('joshuacarey@web — shared link · type `help` to explore', 'term-dim');
    print('');
    exec('cat ' + file, false);
  } else {
    updatePS1();
    welcome();
  }
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
      if (name === 'gallery') exec('gallery', false);
      else if (entry.dataset.type === 'dir') exec('cd ' + name, false), exec('ls', false);
      else exec('cat ' + name, false);
      return;
    }
  });

  // The WHOLE terminal window is clickable/tappable to focus the prompt (like a
  // real terminal) and — crucially on mobile — to pop up the soft keyboard.
  // iOS/Android only raise the keyboard when focus() runs *synchronously* inside
  // a user gesture, so we focus directly in the tap handler (no setTimeout) and
  // listen on `click` (which fires for both mouse and touch and is the gesture
  // browsers trust for programmatic focus).
  const win = document.querySelector('.term-window');
  const focusFromTap = (e: Event) => {
    if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
    const t = e.target as HTMLElement;
    if (t.closest('a, button, .ls-entry, input, .tui')) return;
    if (window.getSelection()?.toString()) return;
    inputEl?.focus({ preventScroll: true });
  };
  win?.addEventListener('click', focusFromTap);
  // pointerup gives desktop the instant-focus feel without waiting for click
  win?.addEventListener('pointerup', (e) => {
    if ((e as PointerEvent).pointerType === 'mouse') focusFromTap(e);
  });
  // When the keyboard opens it shrinks the viewport; keep the prompt in view.
  inputEl.addEventListener('focus', () => {
    setTimeout(() => {
      syncViewport();
      scrollToInput();
    }, 250);
  });

  // Track the visual viewport so the fixed terminal hugs the keyboard.
  // (window/visualViewport listeners must bind once — init() re-runs per swap.)
  syncViewport();
  if (window.visualViewport && !viewportWired) {
    viewportWired = true;
    window.visualViewport.addEventListener('resize', () => {
      syncViewport();
      scrollToInput();
    });
    window.visualViewport.addEventListener('scroll', syncViewport);
  }

  (window as any).__termSyncPath = termSyncPath;

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
  sw.textContent = 'Boring Mode →';
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

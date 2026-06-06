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
  locked?: boolean; // read/enter denied (you're never root 😉)
  img?: GalleryImg;
  children?: Record<string, FsNode>;
}

// A real-feeling Unix root. The site content (/fs.json) is *mounted* at
// /home/joshuacarey; everything else is a believable system tree (with a few
// things worth finding). Per-session edits (mkdir/touch/rm/…) are journaled to
// localStorage and replayed on load, so your shell remembers what you did.
const USER = 'joshuacarey';
const HOME = ['home', USER];

let siteData: any = null; // raw /fs.json (home content + git commits)
let ROOT: FsNode | null = null; // synthetic '/'
let fsPromise: Promise<FsNode | null> | null = null;
let cwd: string[] = [...HOME];
let history: string[] = [];
let histIdx = -1;
let draft = '';
const HKEY = 'term-history';
const OPSKEY = 'term-fs-ops';

// Touch devices get a click-only terminal: no text input, no soft keyboard —
// just tap files / folders / links to explore. Keeps mobile simple & robust.
const TOUCH = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

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

/* ---------- the (mostly) believable filesystem ---------- */
const PASSWD = `root:x:0:0:root:/root:/usr/bin/jcsh
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
joshuacarey:x:1000:1000:Joshua Carey,,,:/home/joshuacarey:/usr/bin/jcsh
guest:x:1001:1001:Guest User:/home/guest:/usr/sbin/nologin
captain:x:1002:1002:Captain,,,:/home/captain:/usr/bin/sailor
neo:x:1337:1337:Thomas Anderson:/home/neo:/usr/bin/jcsh
hal:x:9000:9000:HAL 9000:/dev/null:/bin/false`;

const OSREL = `NAME="joshOS"
VERSION="2.0 (amber-crt)"
ID=joshos
PRETTY_NAME="joshOS 2.0 (amber-crt)"
HOME_URL="https://joshuacarey.org"
ANSI_COLOR="0;33"`;

const AUTHLOG = `Jun  6 13:37 web sshd[42]: Accepted publickey for joshuacarey from the-web port 22
Jun  6 13:42 web sudo: joshuacarey : command not allowed ; COMMAND=/bin/rm -rf /
Jun  6 13:42 web sudo: pam_unix(sudo:auth): authentication failure (nice try)
Jun  6 13:50 web CRON[1337]: (joshuacarey) CMD (ship something cool)
Jun  6 13:55 web kernel: [amber] caffeine levels nominal`;

function buildRoot(siteChildren: Record<string, FsNode>): FsNode {
  const f = (content: string, extra: Partial<FsNode> = {}): FsNode => ({ type: 'file', content, ...extra });
  const d = (children: Record<string, FsNode> = {}): FsNode => ({ type: 'dir', children });
  const binset = (names: string[]) => Object.fromEntries(names.map((n) => [n, f('')]));

  const home = d({
    ...siteChildren,
    '.bashrc': f(
      "# ~/.bashrc — jcsh config\nalias ll='ls -la'\nalias please='sudo'\nexport EDITOR=vim\nexport CAFFEINE=high\n# the secret to good code: ship it",
    ),
    '.profile': f('# loaded at login\necho "stay curious."'),
    '.config': d({
      jcsh: d({ 'theme.conf': f('palette = amber-crt\nscanlines = on\nboot_sequence = dramatic') }),
      '.flag': f('joshOS{amber_crt_dreams} 🏁 — you really do read everything. respect.'),
    }),
  });

  return d({
    bin: d(binset(['sh', 'bash', 'jcsh', 'ls', 'cat', 'cp', 'mv', 'rm'])),
    boot: d({ 'vmjcsh-2.0': f('(binary blob — the dream loader)') }),
    dev: d({
      null: f(''),
      zero: f(''),
      random: f('4    // chosen by fair dice roll. guaranteed to be random.'),
      dreams: f('mounted: /dev/dreams  (capacity: unlimited)'),
    }),
    etc: d({
      passwd: f(PASSWD),
      shadow: f('🔒', { locked: true }),
      hostname: f('web'),
      hosts: f('127.0.0.1\tlocalhost\n127.0.1.1\tweb\n::1\tlocalhost ip6-localhost'),
      'os-release': f(OSREL),
      motd: f('Welcome to joshOS 2.0 — where unauthorized brilliance is encouraged.'),
      'jcsh.conf': f('greeting = "the web is yours"\nprompt = amber'),
    }),
    home: d({
      [USER]: home,
      guest: d({ 'welcome.txt': f("welcome, guest. mi terminal es su terminal.\n(don't touch the amber.)") }),
      captain: d({ 'README.md': f('# Captain\nahoy. → https://captainapp.co.uk') }),
      neo: d({ 'follow-the-white-rabbit.txt': f('there is no spoon. (try: matrix)') }),
    }),
    lib: d({ modules: d() }),
    media: d(),
    mnt: d(),
    opt: d({
      treasure: d({
        'flag.txt': f(
          '🏴‍☠️  X marks the spot.\nyou dug through the whole filesystem — say "amber-crt" to Josh and the coffee\'s on him. ☕',
        ),
      }),
    }),
    proc: d({
      cpuinfo: f('model name\t: Caffeine-Powered Neuron v9\ncores\t\t: ∞\nbogomips\t: 4815.162342'),
      meminfo: f('MemTotal:    16777216 kB\nMemFree:     stop worrying about it\nDreams:      unlimited'),
      version: f('joshOS version 2.0 (amber-crt) (gcc 13.0) #1 SMP PREEMPT since you got here'),
    }),
    root: d({ '.secret': f('if you can read this, you ARE root.\n(spoiler: you are not.)') }),
    sbin: d(),
    srv: d(),
    sys: d(),
    tmp: d(),
    usr: d({
      bin: d(binset(['jcsh', 'ls', 'cat', 'grep', 'vim', 'curl', 'git', 'node', 'pnpm', 'snake', 'sl', 'cowsay'])),
      games: d({ snake: f(''), sl: f('') }),
      share: d({ 'motd.tail': f('build something cool.'), '.crumb': f('the trail continues in /opt …') }),
      local: d({ bin: d() }),
    }),
    var: d({
      log: d({
        'auth.log': f(AUTHLOG),
        'secrets.log': f('[REDACTED]… ok fine. the crumbs lead to /usr/share/.crumb 🍞'),
        'jcsh.log': f('[ ok ] booted joshOS\n[ ok ] amber-crt display driver\n[ ok ] caffeine subsystem online'),
      }),
      www: d({ html: d({ 'index.html': f('<!-- you are already here -->') }) }),
    }),
  });
}

/* ---------- filesystem helpers ---------- */
async function loadFS(): Promise<FsNode | null> {
  if (ROOT) return ROOT;
  if (!fsPromise) {
    fsPromise = fetch('/fs.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        siteData = j || { children: {} };
        ROOT = buildRoot(siteData.children || {});
        return ROOT;
      })
      .catch(() => {
        siteData = { children: {} };
        ROOT = buildRoot({});
        return ROOT;
      });
  }
  return fsPromise;
}

function nodeAt(segments: string[]): FsNode | null {
  if (!ROOT) return null;
  let node: FsNode = ROOT;
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
      base.push(...HOME);
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

// '/home/joshuacarey/work' → '~/work'; everything else absolute ('/etc').
function pretty(segs: string[]): string {
  if (segs.length >= 2 && segs[0] === HOME[0] && segs[1] === HOME[1]) {
    const rest = segs.slice(2);
    return '~' + (rest.length ? '/' + rest.join('/') : '');
  }
  return '/' + segs.join('/');
}

const abspath = (input: string) => '/' + resolve(input).segs.join('/');

/* ---------- ls -l metadata (fabricated, but consistent) ---------- */
function ownerOf(segs: string[]): string {
  if (segs[0] === 'home' && segs[1]) return segs[1];
  return 'root';
}
function permsOf(node: FsNode, segs: string[]): string {
  if (node.locked) return node.type === 'dir' ? 'drwx------' : '-rw-------';
  if (node.type === 'dir') return 'drwxr-xr-x';
  const execish = segs[0] === 'bin' || segs[0] === 'sbin' || (segs[0] === 'usr' && (segs[1] === 'bin' || segs[1] === 'games'));
  return execish ? '-rwxr-xr-x' : '-rw-r--r--';
}
const sizeOf = (node: FsNode) => (node.type === 'dir' ? 4096 : node.content ? node.content.length : 0);

function longLine(name: string, node: FsNode, segs: string[]): HTMLElement {
  const div = document.createElement('div');
  div.className = 'term-line term-ls-l';
  const o = ownerOf(segs);
  div.appendChild(
    document.createTextNode(
      `${permsOf(node, segs)}  1 ${o.padEnd(9)} ${o.padEnd(9)} ${String(sizeOf(node)).padStart(6)} Jun  6 14:00 `,
    ),
  );
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ls-entry ' + (node.type === 'dir' ? 'ls-dir' : 'ls-file');
  b.dataset.name = name;
  b.dataset.type = node.type;
  b.textContent = node.type === 'dir' ? name + '/' : name;
  div.appendChild(b);
  return div;
}

/* ---------- mutable filesystem (mkdir/touch/rm/mv/cp/redirect) ---------- */
// Writable areas only (like a real non-root user): your home and /tmp.
function writable(input: string): boolean {
  const s = resolve(input).segs;
  return s[0] === 'tmp' || s[0] === 'home';
}

function mkdirAbs(path: string, p = false) {
  const { segs } = resolve(path);
  if (!segs.length) throw `cannot create directory '/'`;
  if (p) {
    let cur = ROOT!;
    for (const s of segs) {
      if (cur.type !== 'dir') throw 'not a directory';
      cur.children = cur.children || {};
      if (!cur.children[s]) cur.children[s] = { type: 'dir', children: {} };
      cur = cur.children[s];
    }
    return;
  }
  const parent = nodeAt(segs.slice(0, -1));
  const name = segs[segs.length - 1];
  if (!parent || parent.type !== 'dir') throw `cannot create directory '${path}': No such file or directory`;
  parent.children = parent.children || {};
  if (parent.children[name]) throw `cannot create directory '${path}': File exists`;
  parent.children[name] = { type: 'dir', children: {} };
}
function touchAbs(path: string) {
  const { segs, node } = resolve(path);
  if (node) return;
  const parent = nodeAt(segs.slice(0, -1));
  const name = segs[segs.length - 1];
  if (!parent || parent.type !== 'dir') throw `cannot touch '${path}': No such file or directory`;
  parent.children = parent.children || {};
  parent.children[name] = { type: 'file', content: '' };
}
function writeAbs(path: string, content: string, append = false) {
  const { segs } = resolve(path);
  if (segs.join('/') === 'dev/null') return; // discard
  const parent = nodeAt(segs.slice(0, -1));
  const name = segs[segs.length - 1];
  if (!parent || parent.type !== 'dir') throw `cannot write '${path}': No such file or directory`;
  parent.children = parent.children || {};
  const ex = parent.children[name];
  if (ex && ex.type === 'dir') throw `${path}: Is a directory`;
  const prev = append && ex?.content ? ex.content + '\n' : '';
  parent.children[name] = { type: 'file', content: prev + content };
}
function rmAbs(path: string, r = false) {
  const { segs, node } = resolve(path);
  if (!node) throw `cannot remove '${path}': No such file or directory`;
  if (node.type === 'dir' && !r) throw `cannot remove '${path}': Is a directory`;
  const parent = nodeAt(segs.slice(0, -1));
  const name = segs[segs.length - 1];
  if (parent?.children) delete parent.children[name];
}
function rmdirAbs(path: string) {
  const { segs, node } = resolve(path);
  if (!node) throw `failed to remove '${path}': No such file or directory`;
  if (node.type !== 'dir') throw `failed to remove '${path}': Not a directory`;
  if (node.children && Object.keys(node.children).length) throw `failed to remove '${path}': Directory not empty`;
  const parent = nodeAt(segs.slice(0, -1));
  if (parent?.children) delete parent.children[segs[segs.length - 1]];
}
function cloneNode(n: FsNode): FsNode {
  const c: FsNode = { type: n.type };
  if (n.content !== undefined) c.content = n.content;
  if (n.href) c.href = n.href;
  if (n.meta) c.meta = n.meta;
  if (n.img) c.img = { ...n.img };
  if (n.children) {
    c.children = {};
    for (const k in n.children) c.children[k] = cloneNode(n.children[k]);
  }
  return c;
}
function placeInto(srcNode: FsNode, srcName: string, dst: string) {
  const { segs: dsegs, node: dnode } = resolve(dst);
  if (dnode && dnode.type === 'dir') {
    dnode.children = dnode.children || {};
    dnode.children[srcName] = srcNode;
  } else {
    const parent = nodeAt(dsegs.slice(0, -1));
    if (!parent || parent.type !== 'dir') throw `'${dst}': No such file or directory`;
    parent.children = parent.children || {};
    parent.children[dsegs[dsegs.length - 1]] = srcNode;
  }
}
function mvAbs(src: string, dst: string) {
  const { segs, node } = resolve(src);
  if (!node) throw `cannot stat '${src}': No such file or directory`;
  const name = segs[segs.length - 1];
  placeInto(node, name, dst);
  const parent = nodeAt(segs.slice(0, -1));
  if (parent?.children) delete parent.children[name];
}
function cpAbs(src: string, dst: string, r = false) {
  const { segs, node } = resolve(src);
  if (!node) throw `cannot stat '${src}': No such file or directory`;
  if (node.type === 'dir' && !r) throw `-r not specified; omitting directory '${src}'`;
  placeInto(cloneNode(node), segs[segs.length - 1], dst);
}

/* ---------- per-session journal (replayed on load) ---------- */
type FsOp =
  | { t: 'mkdir'; path: string; p?: boolean }
  | { t: 'touch'; path: string }
  | { t: 'write'; path: string; c: string; a?: boolean }
  | { t: 'rm'; path: string; r?: boolean }
  | { t: 'rmdir'; path: string }
  | { t: 'mv'; s: string; d: string }
  | { t: 'cp'; s: string; d: string; r?: boolean };
let fsOps: FsOp[] = [];
function loadOps() {
  try {
    fsOps = JSON.parse(localStorage.getItem(OPSKEY) || '[]');
  } catch {
    fsOps = [];
  }
}
function saveOps() {
  try {
    localStorage.setItem(OPSKEY, JSON.stringify(fsOps.slice(-500)));
  } catch {}
}
function pushOp(op: FsOp) {
  fsOps.push(op);
  saveOps();
}
function replayOps() {
  for (const op of fsOps) {
    try {
      if (op.t === 'mkdir') mkdirAbs(op.path, !!op.p);
      else if (op.t === 'touch') touchAbs(op.path);
      else if (op.t === 'write') writeAbs(op.path, op.c, !!op.a);
      else if (op.t === 'rm') rmAbs(op.path, !!op.r);
      else if (op.t === 'rmdir') rmdirAbs(op.path);
      else if (op.t === 'mv') mvAbs(op.s, op.d);
      else if (op.t === 'cp') cpAbs(op.s, op.d, !!op.r);
    } catch {}
  }
}

/* ---------- shareable deep links (?p=writing/hello-world.md) ---------- */
// Use the URL hash for deep links — Astro's ClientRouter manages pathname/search
// but never touches the hash, so #p=… survives navigation/scroll.
// Paths are stored relative to home so links stay short and portable.
function relHome(segs: string[]): string | null {
  if (segs.length >= 2 && segs[0] === HOME[0] && segs[1] === HOME[1]) return segs.slice(2).join('/');
  return null;
}
function setUrl(path: string | null) {
  if (path === null) return;
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
  if (!ROOT || !outEl) return;
  const seg = pathname.replace(/^\/+|\/+$/g, '');
  cwd = [...HOME];
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
    // session pref drives the phone default (light-first, dark per-session)
    sessionStorage.setItem('theme', t);
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
      print('the basics:', 'term-dim');
      // A short, friendly set — enough for anyone to look around. Everything
      // else is a real command waiting to be discovered (it IS a real shell).
      const core: [string, string][] = [
        ['ls', "see what's here"],
        ['cd <dir>', 'go into a folder  (cd .. to go back)'],
        ['cat <file>', 'read a file'],
        ['open <name>', 'open a page or link'],
        ['gallery', 'browse the photos'],
        ['neofetch', 'system info'],
        ['snake', 'play snake 🐍'],
        ['clear', 'clear the screen'],
      ];
      core.forEach(([n, h]) => print('  ' + n.padEnd(12) + h));
      print('');
      print('…and it’s a real shell — loads of standard commands work too.', 'term-dim');
      print('poke around: try `ls -la`, `tree`, `cd /`, `mkdir notes`. ↑/↓ history · tab to complete.', 'term-dim');
    },
  },
  ls: {
    help: 'list directory (-l long, -a all)',
    run({ args, flags }) {
      const { node: target, segs: tsegs } = args[0]
        ? resolve(args[0])
        : { node: nodeAt(cwd), segs: cwd };
      if (!target) return void print(`ls: ${args[0]}: No such file or directory`, 'term-err');
      if (target.type === 'file') {
        if (flags.has('l')) print(longLine(args[0]!, target, tsegs));
        else print(args[0]!);
        return;
      }
      if (target.locked) return void print(`ls: cannot open directory '${args[0]}': Permission denied`, 'term-err');
      const entries = Object.entries(target.children || {})
        .filter(([n]) => flags.has('a') || !n.startsWith('.'))
        .sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) return;
      if (flags.has('l')) {
        print(`total ${entries.length}`, 'term-dim');
        for (const [name, node] of entries) print(longLine(name, node, [...tsegs, name]));
        return;
      }
      const row = document.createElement('div');
      row.className = 'term-line term-ls';
      // touch = no keyboard, so give an explicit tappable way back up a level
      if (TOUCH && tsegs.length) {
        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'ls-entry ls-dir';
        up.dataset.name = '..';
        up.dataset.type = 'dir';
        up.textContent = '../';
        row.appendChild(up);
      }
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
      if (!node) return void print(`cd: ${dest}: No such file or directory`, 'term-err');
      if (node.type !== 'dir') return void print(`cd: ${dest}: Not a directory`, 'term-err');
      if (node.locked) return void print(`cd: ${dest}: Permission denied`, 'term-err');
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
      if (!node) return void print(`cat: ${args[0]}: No such file or directory`, 'term-err');
      if (node.type === 'dir') return void print(`cat: ${args[0]}: Is a directory`, 'term-err');
      if (node.locked) return void print(`cat: ${args[0]}: Permission denied`, 'term-err');
      const box = document.createElement('div');
      box.className = 'cat-box';
      const head = document.createElement('div');
      head.className = 'cat-head';
      head.textContent = segs.length ? pretty(segs) : args[0];
      box.appendChild(head);
      const linkRe = /(https?:\/\/[^\s]+|mailto:[^\s]+)/;
      (node.content || '').split('\n').forEach((l) => {
        if (l.startsWith('→ ')) {
          const shown = l.slice(2).trim();
          // Posts display as /writing/… for consistency, but the page route
          // still lives at /blog/… — navigate there.
          const href = shown.startsWith('/writing/')
            ? shown.replace('/writing/', '/blog/')
            : shown;
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
      // shareable deep-link, but only for home content (system files aren't pages)
      setUrl(relHome(segs));
    },
  },
  open: {
    help: 'open a page/link',
    run({ args }) {
      if (!args[0]) return void print('usage: open <name>', 'term-dim');
      const { node } = resolve(args[0]);
      const href = node?.href;
      if (!href) return void print(`open: ${args[0]}: nothing to open`, 'term-err');
      print(`opening ${href.replace('/blog/', '/writing/')} …`, 'term-dim');
      window.location.href = href;
    },
  },
  whoami: { help: 'print user', run: () => print(USER) },
  echo: {
    help: 'print text (supports > file and >> file)',
    run({ args }) {
      // normalise a glued redirect like ">file" into ">" "file"
      const a = [...args];
      for (let i = 0; i < a.length; i++) {
        const m = /^(>>?)(.+)$/.exec(a[i]);
        if (m) {
          a.splice(i, 1, m[1], m[2]);
          break;
        }
      }
      const idx = a.findIndex((t) => t === '>' || t === '>>');
      if (idx >= 0) {
        const op = a[idx];
        const file = a[idx + 1];
        if (!file) return void print('echo: syntax error near `' + op + '`', 'term-err');
        if (!writable(file)) return void print(`echo: ${file}: Permission denied`, 'term-err');
        const content = a.slice(0, idx).join(' ');
        try {
          writeAbs(file, content, op === '>>');
          pushOp({ t: 'write', path: abspath(file), c: content, a: op === '>>' });
        } catch (e) {
          print('echo: ' + e, 'term-err');
        }
        return;
      }
      print(args.join(' '));
    },
  },
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

/* ---------- mutating commands (mkdir / touch / rm / mv / cp / rmdir) ---------- */
commands.mkdir = {
  help: 'create a directory (-p parents)',
  run({ args, flags }) {
    if (!args[0]) return void print('usage: mkdir [-p] <dir>', 'term-dim');
    const p = flags.has('p');
    for (const a of args) {
      if (!writable(a)) {
        print(`mkdir: cannot create directory '${a}': Permission denied`, 'term-err');
        continue;
      }
      try {
        mkdirAbs(a, p);
        pushOp({ t: 'mkdir', path: abspath(a), p });
      } catch (e) {
        print('mkdir: ' + e, 'term-err');
      }
    }
  },
};
commands.touch = {
  help: 'create an empty file',
  run({ args }) {
    if (!args[0]) return void print('usage: touch <file>', 'term-dim');
    for (const a of args) {
      if (!writable(a)) {
        print(`touch: cannot touch '${a}': Permission denied`, 'term-err');
        continue;
      }
      try {
        touchAbs(a);
        pushOp({ t: 'touch', path: abspath(a) });
      } catch (e) {
        print('touch: ' + e, 'term-err');
      }
    }
  },
};
commands.rm = {
  help: 'remove files (-r recursive)',
  run({ args, flags }) {
    if (!args[0]) return void print('usage: rm [-r] <path>', 'term-dim');
    const r = flags.has('r');
    for (const a of args) {
      if (abspath(a) === '/') {
        print("rm: it is dangerous to operate recursively on '/'", 'term-err');
        print('rm: (nice try 😄) — refusing', 'term-dim');
        continue;
      }
      if (!writable(a)) {
        print(`rm: cannot remove '${a}': Permission denied`, 'term-err');
        continue;
      }
      try {
        const path = abspath(a);
        rmAbs(a, r);
        pushOp({ t: 'rm', path, r });
      } catch (e) {
        print('rm: ' + e, 'term-err');
      }
    }
  },
};
commands.rmdir = {
  help: 'remove an empty directory',
  run({ args }) {
    if (!args[0]) return void print('usage: rmdir <dir>', 'term-dim');
    for (const a of args) {
      if (!writable(a)) {
        print(`rmdir: failed to remove '${a}': Permission denied`, 'term-err');
        continue;
      }
      try {
        const path = abspath(a);
        rmdirAbs(a);
        pushOp({ t: 'rmdir', path });
      } catch (e) {
        print('rmdir: ' + e, 'term-err');
      }
    }
  },
};
commands.mv = {
  help: 'move / rename',
  run({ args }) {
    if (args.length < 2) return void print('usage: mv <src> <dst>', 'term-dim');
    const [src, dst] = args;
    if (!writable(src)) return void print(`mv: cannot move '${src}': Permission denied`, 'term-err');
    if (!writable(dst)) return void print(`mv: cannot move to '${dst}': Permission denied`, 'term-err');
    try {
      const s = abspath(src);
      const d = abspath(dst);
      mvAbs(src, dst);
      pushOp({ t: 'mv', s, d });
    } catch (e) {
      print('mv: ' + e, 'term-err');
    }
  },
};
commands.cp = {
  help: 'copy (-r recursive)',
  run({ args, flags }) {
    if (args.length < 2) return void print('usage: cp [-r] <src> <dst>', 'term-dim');
    const [src, dst] = args;
    const r = flags.has('r');
    if (!writable(dst)) return void print(`cp: cannot create '${dst}': Permission denied`, 'term-err');
    try {
      const s = abspath(src);
      const d = abspath(dst);
      cpAbs(src, dst, r);
      pushOp({ t: 'cp', s, d, r });
    } catch (e) {
      print('cp: ' + e, 'term-err');
    }
  },
};
commands.reset = {
  help: 'restore the filesystem to defaults',
  run() {
    fsOps = [];
    saveOps();
    siteData && (ROOT = buildRoot(siteData.children || {}));
    cwd = [...HOME];
    updatePS1();
    if (outEl) outEl.textContent = '';
    print('filesystem restored to defaults.', 'term-amber');
  },
};

/* ---------- read-only filesystem utilities ---------- */
function fileLines(path: string, cmd: string): string[] | null {
  const { node } = resolve(path);
  if (!node) {
    print(`${cmd}: ${path}: No such file or directory`, 'term-err');
    return null;
  }
  if (node.type === 'dir') {
    print(`${cmd}: ${path}: Is a directory`, 'term-err');
    return null;
  }
  if (node.locked) {
    print(`${cmd}: ${path}: Permission denied`, 'term-err');
    return null;
  }
  return (node.content || '').split('\n');
}
function splitNFile(args: string[]): { n: number; file?: string } {
  let n = 10;
  let file: string | undefined;
  for (const a of args) {
    if (/^\d+$/.test(a)) n = parseInt(a, 10);
    else if (!a.startsWith('-')) file = a;
  }
  return { n, file };
}
commands.tree = {
  help: 'recursive directory tree',
  run({ args }) {
    const start = args[0] ? resolve(args[0]) : { node: nodeAt(cwd), segs: cwd };
    if (!start.node) return void print(`tree: ${args[0]}: No such file or directory`, 'term-err');
    print(args[0] || '.', 'tok-path');
    let dirs = 0;
    let files = 0;
    const walk = (node: FsNode, prefix: string, depth: number) => {
      if (node.type !== 'dir' || !node.children || node.locked) return;
      const ents = Object.entries(node.children)
        .filter(([n]) => !n.startsWith('.'))
        .sort(([a], [b]) => a.localeCompare(b));
      ents.forEach(([name, child], i) => {
        const last = i === ents.length - 1;
        print(prefix + (last ? '└── ' : '├── ') + (child.type === 'dir' ? name + '/' : name), child.type === 'dir' ? 'tok-path' : '');
        if (child.type === 'dir') {
          dirs++;
          if (depth < 4) walk(child, prefix + (last ? '    ' : '│   '), depth + 1);
        } else files++;
      });
    };
    walk(start.node, '', 0);
    print('');
    print(`${dirs} directories, ${files} files`, 'term-dim');
  },
};
commands.find = {
  help: 'find files by name',
  run({ args }) {
    let path = '.';
    let pat = '';
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-name') pat = args[++i] || '';
      else if (path === '.' && i === 0) path = args[i];
      else pat = args[i];
    }
    const start = resolve(path);
    if (!start.node) return void print(`find: '${path}': No such file or directory`, 'term-err');
    const needle = pat.replace(/\*/g, '');
    const base = path === '.' ? '.' : path.replace(/\/$/, '');
    const rec = (node: FsNode, cur: string) => {
      const nm = cur.split('/').pop() || '';
      if (!needle || nm.includes(needle)) print(cur);
      if (node.type === 'dir' && node.children && !node.locked)
        for (const [n, c] of Object.entries(node.children)) rec(c, cur + '/' + n);
    };
    rec(start.node, base);
  },
};
commands.head = {
  help: 'first lines of a file',
  run({ args }) {
    const { n, file } = splitNFile(args);
    if (!file) return void print('usage: head [-n N] <file>', 'term-dim');
    const ls = fileLines(file, 'head');
    if (ls) ls.slice(0, n).forEach((l) => print(l));
  },
};
commands.tail = {
  help: 'last lines of a file',
  run({ args }) {
    const { n, file } = splitNFile(args);
    if (!file) return void print('usage: tail [-n N] <file>', 'term-dim');
    const ls = fileLines(file, 'tail');
    if (ls) ls.slice(-n).forEach((l) => print(l));
  },
};
commands.wc = {
  help: 'count lines, words, chars',
  run({ args }) {
    const file = args.find((a) => !a.startsWith('-'));
    if (!file) return void print('usage: wc <file>', 'term-dim');
    const ls = fileLines(file, 'wc');
    if (!ls) return;
    const text = ls.join('\n');
    const words = (text.match(/\S+/g) || []).length;
    print(`${String(ls.length).padStart(4)} ${String(words).padStart(4)} ${String(text.length).padStart(5)} ${file}`);
  },
};
commands.grep = {
  help: 'search a file for a pattern',
  run({ args }) {
    const pos = args.filter((a) => !a.startsWith('-'));
    const [pat, file] = pos;
    if (!pat || !file) return void print('usage: grep <pattern> <file>', 'term-dim');
    const ls = fileLines(file, 'grep');
    if (!ls) return;
    let any = false;
    const low = pat.toLowerCase();
    for (const l of ls) {
      const i = l.toLowerCase().indexOf(low);
      if (i < 0) continue;
      any = true;
      const div = line('', 'cat-line');
      if (i) div.appendChild(document.createTextNode(l.slice(0, i)));
      div.appendChild(spanEl('grep-hit', l.slice(i, i + pat.length)));
      div.appendChild(document.createTextNode(l.slice(i + pat.length)));
      print(div);
    }
    if (!any) print('');
  },
};
commands.stat = {
  help: 'file metadata',
  run({ args }) {
    const { node, segs } = resolve(args[0] || '');
    if (!args[0] || !node) return void print(`stat: cannot stat '${args[0] || ''}': No such file or directory`, 'term-err');
    print(`  File: ${args[0]}`);
    print(`  Size: ${sizeOf(node)}\t${node.type === 'dir' ? 'directory' : 'regular file'}`);
    print(`Access: (${permsOf(node, segs)})  Uid: (1000/${ownerOf(segs)})`);
    print(`Modify: Jun  6 14:00:00 2026`);
  },
};
commands.file = {
  help: 'identify a file type',
  run({ args }) {
    const { node } = resolve(args[0] || '');
    if (!args[0] || !node) return void print(`${args[0] || ''}: cannot open (No such file or directory)`, 'term-err');
    if (node.type === 'dir') return void print(`${args[0]}: directory`);
    if (node.img) return void print(`${args[0]}: image data`);
    if (node.locked) return void print(`${args[0]}: regular file, no read permission`);
    print(`${args[0]}: ${(node.content || '').includes('#') ? 'ASCII text, with markdown' : 'ASCII text'}`);
  },
};

/* ---------- system info (with a little personality) ---------- */
commands.uname = {
  help: 'system information',
  run({ args, flags }) {
    if (flags.has('a') || args[0] === '-a') print('joshOS web 2.0-amber-crt #1 SMP the-web jcsh');
    else print('joshOS');
  },
};
commands.hostname = { help: 'show hostname', run: () => print('web') };
commands.id = {
  help: 'print user identity',
  run: () => print(`uid=1000(${USER}) gid=1000(${USER}) groups=1000(${USER}),27(sudo),999(crew)`),
};
commands.groups = { help: 'group memberships', run: () => print(`${USER} sudo crew`) };
commands.users = { help: 'list logged-in users', run: () => print(USER) };
commands.who = { help: 'who is logged on', run: () => print(`${USER}   ttys000   just now   (the-web)`) };
commands.w = {
  hidden: true,
  help: '',
  run() {
    print(' 14:00:00 up since you got here,  1 user,  load average: 0.42, 0.27, 0.10', 'term-dim');
    print('USER     TTY      FROM     WHAT');
    print(`${USER}  ttys000  the-web  jcsh`);
  },
};
commands.uptime = {
  help: 'how long the dream has run',
  run: () => print(' 14:00:00 up since you got here,  1 user,  load average: 0.42, 0.27, 0.10'),
};
commands.ps = {
  help: 'running processes',
  run() {
    print('  PID TTY          TIME CMD');
    print('    1 ?        00:00:01 jcinit');
    print('   42 ttys000  00:00:00 jcsh');
    print(' 1337 ttys000  00:00:00 curiosity');
    print(' 9000 ?        00:00:00 hal9000 <defunct>');
  },
};
commands.free = {
  help: 'memory usage',
  run() {
    print('              total        used        free');
    print('Mem:       16777216     4096000    12681216');
    print('Swap:             0           0           0');
    print('(plenty of room for big ideas)', 'term-dim');
  },
};
commands.df = {
  help: 'disk free',
  run() {
    print('Filesystem     1K-blocks      Used Available Use% Mounted on');
    print('/dev/dreams     999999999  42424242 957575757   5% /');
    print('cloudflare:r2   unlimited   gallery         ∞   0% /home/joshuacarey/gallery');
  },
};
commands.du = { hidden: true, help: '', run: () => print('42M\t.') };
const ENVVARS: Record<string, string> = {
  USER,
  HOME: '/home/' + USER,
  SHELL: '/usr/bin/jcsh',
  PATH: '/usr/local/bin:/usr/bin:/bin:/usr/games',
  TERM: 'amber-crt',
  LANG: 'en_GB.UTF-8',
  EDITOR: 'vim',
  CAFFEINE: 'high',
  HINT: 'try `cat /var/log/secrets.log`',
};
commands.env = {
  help: 'environment variables',
  run() {
    for (const [k, v] of Object.entries(ENVVARS)) print(`${k}=${v}`);
    print(`PWD=/${cwd.join('/')}`);
  },
};
commands.printenv = { hidden: true, help: '', run: () => commands.env.run({ args: [], flags: new Set() }) };
commands.which = {
  help: 'locate a command',
  run({ args }) {
    if (!args[0]) return void print('usage: which <cmd>', 'term-dim');
    if (commands[args[0]]) print('/usr/bin/' + args[0]);
    else print(`which: no ${args[0]} in (${ENVVARS.PATH})`, 'term-err');
  },
};

/* ---------- a few more easter eggs ---------- */
commands.su = {
  help: 'switch user',
  run() {
    print('Password: ');
    setTimeout(() => {
      print('su: Authentication failure', 'term-err');
      print("(this isn't your machine… but make yourself at home)", 'term-dim');
      scrollToInput();
    }, 600);
  },
};
commands.passwd = { hidden: true, help: '', run: () => print('passwd: you cannot change another dreamer’s password.', 'term-err') };
commands.reboot = { hidden: true, help: '', run: () => print('reboot: nice try. just refresh the page 😉', 'term-dim') };
commands.shutdown = { hidden: true, help: '', run: () => print('shutdown: the web never sleeps.', 'term-dim') };
commands.ssh = { hidden: true, help: '', run: ({ args }) => print(`ssh: connect to host ${args[0] || '?'}: the only host that matters is right here.`, 'term-dim') };
commands.curl = {
  hidden: true,
  help: '',
  run: ({ args }) => print(args[0] ? `curl: (7) couldn't resolve '${args[0]}' from inside a dream` : 'usage: curl <url>', 'term-dim'),
};
commands.cowsay = {
  hidden: true,
  help: '',
  run({ args }) {
    const msg = args.join(' ') || 'moo';
    print(' ' + '_'.repeat(msg.length + 2));
    print('< ' + msg + ' >');
    print(' ' + '-'.repeat(msg.length + 2));
    [
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||',
    ].forEach((l) => print(l));
  },
};
commands.fortune = {
  hidden: true,
  help: '',
  run() {
    const fs = [
      'ship it. you can refactor in prod. (kidding. mostly.)',
      'the best code is the code you didn’t have to write.',
      'a wild gradient appears. it is super effective.',
      'rm -rf doubt/',
      'amber > green. fight me.',
    ];
    print(fs[(history.length + (cwd.length || 1)) % fs.length], 'term-amber');
  },
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
    const commits: Commit[] = siteData?.commits || [];
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
  const dir = nodeAt([...HOME, 'gallery']);
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
    else span.className = ROOT && resolve(seg).node ? 'tok-path' : 'tok-arg';
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
  cwd = [...HOME];
  await loadFS();
  // replay this session's filesystem edits (mkdir/touch/rm/…) onto the tree
  loadOps();
  replayOps();

  // shareable deep link: /#p=writing/hello-world.md → land straight in that file
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

  // Desktop only: the WHOLE terminal window is clickable to focus the prompt
  // (like a real terminal). On touch there's no prompt to focus — navigation is
  // by tapping files / folders / links — so we skip all keyboard wiring.
  if (!TOUCH) {
    const win = document.querySelector('.term-window');
    const focusFromTap = (e: Event) => {
      if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
      const t = e.target as HTMLElement;
      if (t.closest('a, button, .ls-entry, input, .tui')) return;
      if (window.getSelection()?.toString()) return;
      inputEl?.focus({ preventScroll: true });
    };
    win?.addEventListener('click', focusFromTap);
    win?.addEventListener('pointerup', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') focusFromTap(e);
    });
  }

  (window as any).__termSyncPath = termSyncPath;

  if (!TOUCH && document.documentElement.getAttribute('data-theme') === 'dark') {
    setTimeout(() => inputEl?.focus(), 60);
  }
}

function welcome() {
  print(
    TOUCH
      ? 'joshuacarey@web — tap any file or folder below to explore.'
      : 'joshuacarey@web — type `help`, or click any file / folder below.',
    'term-dim',
  );
  const hint = line('', 'term-dim');
  hint.append('prefer a clean reading view? ');
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'term-link';
  sw.setAttribute('data-theme-switch', '');
  sw.textContent = 'Boring Mode →';
  hint.appendChild(sw);
  print(hint);
  if (!TOUCH)
    print('it’s a real shell — try `ls /`, `cat /etc/passwd`, `mkdir notes`. (`reset` to undo.)', 'term-dim');
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

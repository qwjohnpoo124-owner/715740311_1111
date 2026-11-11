// ============================================================
//  春麗 vs 李振康:知識對決(第九週作業)
//  玩法:春麗(玩家)走向關主李振康 → 出題 → 答對:春麗發功攻擊,李振康倒下;
//        答錯:李振康衝過來攻擊,春麗被打飛。李振康血量歸零獲勝,春麗血量歸零失敗。
// ============================================================

// ---------- 精靈圖設定:檔案、張數、單格寬高、播放速度(每秒幾格) ----------
const SPR = {
  cStop: { f: 'CHUNLI/stop/stop_balanced.png', n: 18, w: 84,  h: 191, fps: 8  },
  cWalk: { f: 'CHUNLI/walk/walk_balanced.png', n: 8,  w: 123, h: 195, fps: 10 },
  cRun:  { f: 'CHUNLI/run/run_balanced.png',   n: 16, w: 173, h: 177, fps: 18 },
  cJump: { f: 'CHUNLI/jump/jump_balanced.png', n: 20, w: 156, h: 214, fps: 0  },
  cPush: { f: 'CHUNLI/push/push_balanced.png', n: 23, w: 217, h: 191, fps: 24 },
  cHurt: { f: 'CHUNLI/hurt/hurt.png',          n: 8,  w: 241, h: 156, fps: 9  }, // 被攻擊倒下(新增)
  lStop: { f: 'LEE/stop.png',                  n: 4,  w: 55,  h: 85,  fps: 5  },
  lAtk:  { f: 'LEE/attack.png',                n: 8,  w: 99,  h: 87,  fps: 12 },
  lKo:   { f: 'LEE/ko.png',                    n: 7,  w: 121, h: 73,  fps: 9  }
};
const BG_PATH = 'BG/bg1.png';

// ---------- 題庫(可自行增加) ----------
const QUESTIONS = [
  { q: '網頁的「結構(骨架)」是用哪一種語言撰寫?', o: ['HTML', 'CSS', 'PNG', 'MP4'], a: 0 },
  { q: '負責網頁「外觀樣式」(顏色、排版)的是?', o: ['HTML', 'CSS', 'GIF', 'ZIP'], a: 1 },
  { q: '讓網頁可以「互動」的程式語言是?', o: ['JavaScript', 'Word', 'Excel', 'Photoshop'], a: 0 },
  { q: 'p5.js 中,「開始時只執行一次」的函式是?', o: ['draw()', 'setup()', 'preload()', 'loop()'], a: 1 },
  { q: 'p5.js 中,「每秒重複執行」的函式是?', o: ['setup()', 'draw()', 'image()', 'key()'], a: 1 },
  { q: '精靈圖(Sprite Sheet)指的是?', o: ['把動作的多張小圖合併成一張圖', '一種音樂檔', '一種字型', '網址的別名'], a: 0 },
  { q: '可以把網頁免費放到網路上的服務是?', o: ['GitHub Pages', 'Word', '記事本', '小畫家'], a: 0 },
  { q: 'HTML 中放入圖片使用哪個標籤?', o: ['<p>', '<img>', '<a>', '<br>'], a: 1 },
  { q: 'p5.js 中「顯示圖片」的函式是?', o: ['image()', 'rect()', 'text()', 'fill()'], a: 0 },
  { q: 'p5.js 中偵測「按鍵是否持續按住」用?', o: ['keyIsDown()', 'mouseX', 'width', 'random()'], a: 0 },
  { q: '網頁檔案常見的副檔名是?', o: ['.html', '.exe', '.docx', '.mp3'], a: 0 },
  { q: '在 VS Code 讓 AI 協助寫程式,我們使用的是?', o: ['Copilot / Claude', '小畫家', '計算機', '記事本'], a: 0 }
];

// ---------- 遊戲參數 ----------
const KO_PER_HIT = 20;       // 答對:李振康扣血(答對 5 次獲勝)
const HURT_PER_HIT = 34;     // 答錯:春麗扣血(答錯 3 次就失敗)
const QUIZ_TIME = 15000;     // 每題限時(毫秒)
const CHUN_START = 0.16;     // 春麗起始位置(畫面寬度比例)
const LEE_HOME = 0.80;       // 李振康站的位置

let imgs = {}, bg = null;
let G = 'title';             // title / explore / quiz / resolve / win / lose
let chun, lee;               // 角色狀態
let SC = 1, SL = 1, groundY = 0;
let order = [], qNo = 0, cur = null;
let chunHP = 100, leeHP = 100, score = 0, combo = 0, bestCombo = 0, quizStart = 0;
let timeline = [], particles = [], popups = [], kis = [];
let banner = null, shakeT = 0, shakeAmp = 0, flashT = 0, flashCol = [255, 0, 0];
let optRects = [], hoverOpt = -1, audioCtx = null, lastTick = 99;

// ---------- 載入圖片(用原生 Image,直接雙擊 index.html 也能顯示) ----------
function preload() {
  for (const k in SPR) { const im = new Image(); im.src = SPR[k].f; SPR[k].img = im; }
  bg = new Image(); bg.src = BG_PATH;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Microsoft JhengHei');   // 找不到此字型時,瀏覽器會自動改用系統中文字型
  textWrap(CHAR);
  layout();
  resetGame();
}
function windowResized() {
  const r = windowWidth / width;
  resizeCanvas(windowWidth, windowHeight);
  if (chun) { chun.x *= r; lee.x *= r; }
  layout();
}
function layout() {
  groundY = height * 0.93;
  SC = height * 0.34 / 191;         // 春麗站立高度 = 畫面高 34%
  SL = SC * 191 / 85 * 0.8;         // 李振康原圖較小,放大到與春麗差不多高(他的站姿較蹲,所以再縮一點)
}

function resetGame() {
  const now = millis();
  chun = { x: width * CHUN_START, anim: 'cStop', t0: now, loop: true, rev: false, dir: 1, air: 0, vy: 0, jumping: false, jt: 0, jf: 0, jTotal: 40, blink: 0, flash: 0, busy: false };
  lee  = { x: width * LEE_HOME, anim: 'lStop', t0: now, loop: true, rev: false, dir: -1, flash: 0, blink: 0, air: 0 };
  chunHP = 100; leeHP = 100; score = 0; combo = 0; bestCombo = 0; qNo = 0;
  order = shuffle([...Array(QUESTIONS.length).keys()]);
  timeline = []; particles = []; popups = []; kis = []; banner = null; cur = null;
}

// ---------- 動畫工具 ----------
function setAnim(c, name, loop = true, rev = false) {
  c.anim = name; c.t0 = millis(); c.loop = loop; c.rev = rev;
}
function frameOf(c) {
  const a = SPR[c.anim];
  if (a.fps === 0) return 0;
  let i = floor((millis() - c.t0) / 1000 * a.fps);
  i = c.loop ? i % a.n : min(i, a.n - 1);
  return c.rev ? a.n - 1 - i : i;
}
function animDone(c) { const a = SPR[c.anim]; return !c.loop && (millis() - c.t0) / 1000 * a.fps >= a.n; }
function schedule(ms, fn) { timeline.push({ at: millis() + ms, fn }); }

// 畫角色:腳底中心對齊 (x,y),dir=-1 時左右翻轉
function drawChar(c, isChun) {
  const a = SPR[c.anim], im = a.img, scl = isChun ? SC : SL;
  const f = (isChun && c.anim === 'cJump') ? c.jf : frameOf(c);
  const dw = a.w * scl, dh = a.h * scl;
  const y = groundY + c.air;
  // 影子(角色跳起來時會變小)
  noStroke(); fill(0, 0, 0, 70);
  const sh = constrain(1 + c.air / (height * 0.5), 0.4, 1);
  ellipse(c.x, groundY + 4, dw * 0.55 * sh, dh * 0.07 * sh);
  const ctx = drawingContext;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (c.blink && millis() < c.blink) ctx.globalAlpha = (floor(millis() / 70) % 2) ? 0.25 : 1;
  if (c.flash && millis() < c.flash) ctx.filter = 'brightness(2.6)';
  ctx.translate(c.x, y); ctx.scale(c.dir, 1);
  if (im.naturalWidth > 0) ctx.drawImage(im, f * a.w, 0, a.w, a.h, -dw / 2, -dh, dw, dh);
  else { ctx.fillStyle = isChun ? '#4a7be8' : '#ddd'; ctx.fillRect(-dw / 2, -dh, dw, dh); }
  ctx.restore();
}

// ---------- 音效(用瀏覽器內建合成,不需要音檔) ----------
function beep(freq, dur, type = 'square', vol = 0.06, slide = 0) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, audioCtx.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* 沒有音效也沒關係 */ }
}
const sfx = {
  hit:  () => { beep(180, 0.18, 'sawtooth', 0.09, -120); beep(90, 0.25, 'square', 0.08, -50); },
  good: () => { beep(660, 0.12, 'triangle', 0.08); setTimeout(() => beep(880, 0.2, 'triangle', 0.08), 110); },
  bad:  () => { beep(220, 0.3, 'sawtooth', 0.07, -100); },
  ki:   () => { beep(300, 0.4, 'sine', 0.07, 500); },
  tick: () => { beep(1000, 0.05, 'square', 0.03); },
  win:  () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.08), i * 140)); },
  lose: () => { [400, 330, 260, 190].forEach((f, i) => setTimeout(() => beep(f, 0.3, 'sawtooth', 0.06), i * 180)); }
};

// ---------- 特效 ----------
function shake(amp, ms = 350) { shakeAmp = amp; shakeT = millis() + ms; }
function sparks(x, y, col, n = 22) {
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI), s = random(2, 9) * (height / 900);
    particles.push({ x, y, vx: cos(a) * s, vy: sin(a) * s - 2, life: random(25, 50), max: 50, c: col, r: random(3, 8) });
  }
}
function popup(text, x, y, col, size = 1) { popups.push({ text, x, y0: y, y, col, born: millis(), life: 1, size }); }

// ---------- 題目流程 ----------
function startQuiz() {
  G = 'quiz';
  chun.dir = 1; setAnim(chun, 'cStop');
  const q = QUESTIONS[order[qNo % order.length]];
  // 每次把選項順序打亂,答案位置不固定
  const idx = shuffle([0, 1, 2, 3]);
  cur = { q: q.q, o: idx.map(i => q.o[i]), a: idx.indexOf(q.a) };
  quizStart = millis(); hoverOpt = -1; lastTick = 99;
}

function answer(i) {
  if (G !== 'quiz') return;
  const t = (millis() - quizStart) / QUIZ_TIME;
  if (i === cur.a) correct(t); else wrong(i);
}

// 答對:春麗發功 → 氣功波打中李振康 → 李振康倒下
function correct(t) {
  G = 'resolve'; qNo++;
  combo++; bestCombo = max(bestCombo, combo);
  const gain = 100 + combo * 20 + floor((1 - t) * 50);
  score += gain; sfx.good();
  banner = { text: '答對了!', sub: '+' + gain + ' 分' + (combo > 1 ? '　連續答對 ' + combo : ''), col: [255, 224, 80], until: millis() + 1500 };
  chun.dir = 1; setAnim(chun, 'cPush', false);
  schedule(520, () => { sfx.ki(); launchKi(true); });
}
function launchKi(real) {
  kis.push({ x: chun.x + 70 * SC, y: groundY - 85 * SC, real });
}
function hitLee() {
  sfx.hit(); shake(16 * height / 900, 450);
  flashT = millis() + 140; flashCol = [255, 255, 255];
  leeHP = max(0, leeHP - KO_PER_HIT);
  lee.flash = millis() + 160;
  sparks(lee.x - 10 * SL, groundY - 50 * SL, [255, 230, 120], 30);
  popup('-' + KO_PER_HIT, lee.x, groundY - 150 * SL, [255, 220, 90], 1.4);
  setAnim(lee, 'lKo', false);
  lee.slide = { from: lee.x, to: lee.x + width * 0.03, t0: millis(), dur: 500 };
  if (leeHP <= 0) {
    schedule(900, () => { popup('K.O.!', width / 2, height * 0.35, [255, 80, 60], 3); sfx.win(); });
    schedule(2200, () => endGame(true));
  } else {
    schedule(1300, () => {                                            // 倒地後爬起來(倒著播放)
      setAnim(lee, 'lKo', false, true);
      lee.slide = { from: lee.x, to: width * LEE_HOME, t0: millis(), dur: 800 };
    });
    schedule(2100, () => setAnim(lee, 'lStop'));
    schedule(1100, () => retreat());
  }
}
// 春麗退回起始位置(跑步 + 向左翻轉)
function retreat() {
  chun.retreat = true; chun.dir = -1; setAnim(chun, 'cRun');
  schedule(1500, () => { chun.retreat = false; chun.x = width * CHUN_START; chun.dir = 1; setAnim(chun, 'cStop'); nextRound(); });
}
function nextRound() { if (G === 'resolve') { G = 'explore'; banner = null; } }

// 答錯:李振康衝過來攻擊 → 春麗被打飛倒地
function wrong(chosen) {
  G = 'resolve'; qNo++; combo = 0; sfx.bad();
  banner = { text: chosen === -1 ? '時間到!' : '答錯了…', sub: '正確答案:' + cur.o[cur.a], col: [255, 110, 100], until: millis() + 2300 };
  lee.dir = -1; setAnim(lee, 'lAtk', false);
  const gap = 42 * SC + 52 * SL * 0.7;
  lee.slide = { from: lee.x, to: chun.x + gap, t0: millis(), dur: 260 };
  schedule(270, () => hurtChun());
  schedule(1000, () => { lee.slide = { from: lee.x, to: width * LEE_HOME, t0: millis(), dur: 450 }; setAnim(lee, 'lStop'); });
}
function hurtChun() {
  sfx.hit(); shake(20 * height / 900, 500);
  flashT = millis() + 220; flashCol = [255, 40, 40];
  chunHP = max(0, chunHP - HURT_PER_HIT);
  chun.flash = millis() + 160;
  sparks(chun.x + 20 * SC, groundY - 90 * SC, [255, 120, 90], 30);
  popup('-' + HURT_PER_HIT, chun.x, groundY - 200 * SC, [255, 90, 90], 1.4);
  chun.dir = 1; setAnim(chun, 'cHurt', false);
  chun.slide = { from: chun.x, to: max(width * 0.07, chun.x - width * 0.14), t0: millis(), dur: 800 };
  if (chunHP <= 0) {
    schedule(1000, () => { popup('K.O.…', width / 2, height * 0.35, [255, 80, 60], 3); sfx.lose(); });
    schedule(2400, () => endGame(false));
  } else {
    // 倒地一下 → 閃爍站起來 → 回到起點,繼續挑戰
    schedule(1700, () => {
      chun.blink = millis() + 800; setAnim(chun, 'cStop');
      chun.slide = { from: chun.x, to: width * CHUN_START, t0: millis(), dur: 500 };
    });
    schedule(2500, () => nextRound());
  }
}

function endGame(win) { G = win ? 'win' : 'lose'; banner = null; }

// 兩人距離小於這個值(約一個角色身高多一點)才會出題;依畫面高度計算,視窗再寬也不會太遠就出題
function trigDist() { return min(height * 0.5, width * 0.3); }

// ---------- 主迴圈 ----------
function update() {
  const now = millis();
  // 時間軸事件
  for (let i = timeline.length - 1; i >= 0; i--) if (now >= timeline[i].at) { const e = timeline.splice(i, 1)[0]; e.fn(); }
  // 角色滑動(位移動畫,使用緩出效果)
  for (const c of [chun, lee]) if (c.slide) {
    const p = constrain((now - c.slide.t0) / c.slide.dur, 0, 1), e = 1 - pow(1 - p, 3);
    c.x = lerp(c.slide.from, c.slide.to, e); if (p >= 1) c.slide = null;
  }
  // 春麗退回起點(跑步)
  if (chun.retreat) {
    chun.x = max(width * CHUN_START, chun.x - width * 0.012);
    if (chun.x <= width * CHUN_START + 1 && chun.anim === 'cRun') { chun.dir = 1; setAnim(chun, 'cStop'); }
  }

  if (G === 'explore') {
    const run = keyIsDown(SHIFT), spd = width * (run ? 0.0062 : 0.0034);
    let moving = false;
    if (!chun.busy) {
      if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { chun.x += spd; chun.dir = 1; moving = true; }
      if (keyIsDown(LEFT_ARROW) || keyIsDown(65))  { chun.x -= spd; chun.dir = -1; moving = true; }
    }
    chun.x = constrain(chun.x, width * 0.05, lee.x - trigDist() * 0.6);
    // 跳躍物理
    if (chun.jumping) {
      chun.air += chun.vy; chun.vy += height * 0.0011; chun.jt++;
      chun.jf = min(19, floor(chun.jt / chun.jTotal * 20));
      if (chun.air >= 0) { chun.air = 0; chun.jumping = false; setAnim(chun, 'cStop'); }
    } else if (chun.busy) {
      if (animDone(chun)) { chun.busy = false; setAnim(chun, 'cStop'); }
    } else {
      const want = moving ? (run ? 'cRun' : 'cWalk') : 'cStop';
      if (chun.anim !== want) setAnim(chun, want);
    }
    // 走到李振康附近就出題
    if (chun.x > lee.x - trigDist() && !chun.jumping) { chun.busy = false; chun.dir = 1; startQuiz(); }
  }
  if (G === 'quiz') {
    const left = QUIZ_TIME - (now - quizStart), s = ceil(left / 1000);
    if (s <= 5 && s !== lastTick) { lastTick = s; sfx.tick(); }
    if (left <= 0) wrong(-1);
  }
  // 氣功波
  for (let i = kis.length - 1; i >= 0; i--) {
    const k = kis[i]; k.x += width * 0.018;
    if (k.real && k.x >= lee.x - 50 * SL) { kis.splice(i, 1); hitLee(); }
    else if (!k.real && k.x > width) kis.splice(i, 1);
  }
  // 粒子 / 飄字
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.life--; if (p.life <= 0) particles.splice(i, 1); }
  for (let i = popups.length - 1; i >= 0; i--) { const p = popups[i], age = now - p.born; p.y = p.y0 - age * 0.05; p.life = (1200 - age) / 1200 * 70; if (age > 1200) popups.splice(i, 1); }
}

function draw() {
  update();
  push();
  if (millis() < shakeT) { const k = (shakeT - millis()) / 450; translate(random(-1, 1) * shakeAmp * k, random(-1, 1) * shakeAmp * k); }
  drawBackground();
  drawChar(lee, false);
  drawChar(chun, true);
  drawKis();
  for (const p of particles) { noStroke(); fill(p.c[0], p.c[1], p.c[2], 255 * p.life / p.max); circle(p.x, p.y, p.r); }
  pop();
  if (millis() < flashT) { noStroke(); fill(flashCol[0], flashCol[1], flashCol[2], 90); rect(0, 0, width, height); }
  drawHUD();
  if (G === 'quiz') drawQuiz(); else cursor(ARROW);
  if (G === 'explore') drawHint();
  drawPopups();
  if (banner && millis() < banner.until) drawBanner();
  if (G === 'title') drawTitle();
  if (G === 'win' || G === 'lose') drawEnd();
}

function drawBackground() {
  const ctx = drawingContext;
  if (bg.naturalWidth > 0) {
    // 背景等比例放大填滿(cover),多出的部分裁掉,不會變形
    const r = max(width / bg.naturalWidth, height / bg.naturalHeight);
    const w = bg.naturalWidth * r, h = bg.naturalHeight * r;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, (width - w) / 2, height - h, w, h);
  } else { background(135, 206, 235); fill(90, 170, 90); noStroke(); rect(0, height * 0.9, width, height * 0.1); }
}

function drawKis() {
  for (const k of kis) {
    const r = 34 * SC * (1 + 0.15 * sin(millis() / 40));
    const g = drawingContext.createRadialGradient(k.x, k.y, 2, k.x, k.y, r * 1.8);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(120,200,255,0.95)'); g.addColorStop(1, 'rgba(40,100,255,0)');
    noStroke(); fill(255, 255, 255, 120); rect(k.x - r * 4, k.y - r * 0.25, r * 3.5, r * 0.5, r * 0.25);   // 拖尾
    drawingContext.fillStyle = g; circle(k.x, k.y, r * 3.6);
  }
}

// ---------- 介面 ----------
function hpBar(x, y, w, h, hp, label, col, rtl) {
  noStroke(); fill(0, 0, 0, 150); rect(x - 4, y - 4, w + 8, h + 8, 8);
  fill(60, 20, 20); rect(x, y, w, h, 5);
  const ww = w * hp / 100;
  fill(col[0], col[1], col[2]); rect(rtl ? x + w - ww : x, y, ww, h, 5);
  fill(255); textSize(h * 0.85); textAlign(rtl ? RIGHT : LEFT, CENTER);
  text(label + '  ' + hp, rtl ? x + w - 8 : x + 8, y + h / 2 + 1);
}
function drawHUD() {
  if (G === 'title') return;
  const bw = min(width * 0.38, 420), bh = max(20, height * 0.032), m = width * 0.02;
  hpBar(m, m + 4, bw, bh, chunHP, '春麗', [80, 200, 120], false);
  hpBar(width - m - bw, m + 4, bw, bh, leeHP, '關主 李振康', [240, 90, 70], true);
  fill(0, 0, 0, 150); noStroke(); rect(width / 2 - 90, m - 2, 180, bh + 14, 10);
  fill(255, 226, 90); textAlign(CENTER, CENTER); textSize(bh * 0.85);
  text('分數 ' + score, width / 2, m + bh / 2 + 5);
  if (combo > 1) { fill(255, 140, 60); textSize(bh * 0.8); text(combo + ' 連擊!', width / 2, m + bh + 26); }
}
function drawHint() {
  const s = min(width, height) * 0.026;
  textSize(s); textAlign(CENTER, CENTER);
  const msg = '← → 走路　Shift 跑步　↑ 跳躍　空白鍵 發氣功　　走向李振康接受挑戰!';
  const w = min(textWidth(msg) + 40, width * 0.96);
  noStroke(); fill(0, 0, 0, 140); rect(width / 2 - w / 2, height * 0.12, w, s * 2.2, 12);
  fill(255); text(msg, width / 2, height * 0.12 + s * 1.1);
}
function drawBanner() {
  const t = constrain((banner.until - millis()) / 400, 0, 1);
  const s = min(width, height) * 0.09;
  textAlign(CENTER, CENTER); textSize(s); stroke(0, 0, 0, 220 * t); strokeWeight(s * 0.12);
  fill(banner.col[0], banner.col[1], banner.col[2], 255 * t);
  text(banner.text, width / 2, height * 0.24);
  textSize(s * 0.4); strokeWeight(s * 0.06); text(banner.sub, width / 2, height * 0.24 + s * 0.85);
  noStroke();
}
function drawPopups() {
  for (const p of popups) {
    const a = constrain(p.life / 25, 0, 1);
    textAlign(CENTER, CENTER); textSize(min(width, height) * 0.05 * p.size);
    stroke(0, 0, 0, 200 * a); strokeWeight(5); fill(p.col[0], p.col[1], p.col[2], 255 * a);
    text(p.text, p.x, p.y); noStroke();
  }
}

function quizRect() {
  const pw = min(width * 0.88, 860), ph = min(height * 0.44, 380);
  return { x: (width - pw) / 2, y: height * 0.12, w: pw, h: ph };
}
function drawQuiz() {
  const r = quizRect(), left = QUIZ_TIME - (millis() - quizStart), p = constrain(left / QUIZ_TIME, 0, 1);
  const appear = constrain((millis() - quizStart) / 220, 0, 1);       // 淡入
  push(); translate(0, (1 - appear) * -20);
  noStroke(); fill(10, 16, 40, 242 * appear); rect(r.x, r.y, r.w, r.h, 18);
  stroke(255, 214, 70, 255 * appear); strokeWeight(3); noFill(); rect(r.x, r.y, r.w, r.h, 18);
  noStroke();
  // 倒數時間條
  fill(255, 255, 255, 40); rect(r.x + 20, r.y + 16, r.w - 40, 10, 5);
  fill(p > 0.33 ? color(90, 220, 130) : color(255, 90, 80)); rect(r.x + 20, r.y + 16, (r.w - 40) * p, 10, 5);
  // 題目
  fill(255); textAlign(LEFT, TOP); textSize(constrain(r.w * 0.034, 17, 30));
  text('第 ' + (qNo + 1) + ' 題　' + cur.q, r.x + 26, r.y + 42, r.w - 52, r.h * 0.3);
  // 選項(2×2)
  optRects = [];
  const gx = 16, top = r.y + r.h * 0.38, bh = (r.h - (top - r.y) - 24 - gx) / 2, bw = (r.w - 52 - gx) / 2;
  hoverOpt = -1;
  for (let i = 0; i < 4; i++) {
    const x = r.x + 26 + (i % 2) * (bw + gx), y = top + floor(i / 2) * (bh + gx);
    const hv = mouseX > x && mouseX < x + bw && mouseY > y && mouseY < y + bh;
    if (hv) hoverOpt = i;
    optRects.push({ x, y, w: bw, h: bh });
    noStroke(); fill(hv ? color(255, 214, 70) : color(255, 255, 255, 30)); rect(x, y, bw, bh, 12);
    fill(hv ? color(20, 20, 40) : 255); textAlign(LEFT, CENTER); textSize(constrain(bh * 0.36, 15, 26));
    text((i + 1) + '.  ' + cur.o[i], x + 18, y + 4, bw - 30, bh - 8);
  }
  pop();
  cursor(hoverOpt >= 0 ? HAND : ARROW);
}

function panel(lines, hint) {
  noStroke(); fill(5, 10, 30, 190); rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  let y = height * 0.28;
  for (const l of lines) {
    const sz = min(width, height) * l.s;
    fill(l.col || 255); textSize(sz);
    text(l.t, width * 0.05, y - sz, width * 0.9, sz * 2);   // 有指定寬高時,x 是方框左邊;文字在方框內置中
    y += sz * 1.6;
  }
  fill(255, 214, 70, 160 + 90 * sin(millis() / 250)); textSize(min(width, height) * 0.035);
  text(hint, width / 2, y + height * 0.06);
}
function drawTitle() {
  panel([
    { t: '春麗 vs 李振康', s: 0.1, col: [255, 214, 70] },
    { t: '知識對決', s: 0.06, col: [255, 255, 255] },
    { t: '答對:春麗發氣功擊倒關主　答錯:被關主打飛', s: 0.028, col: [210, 225, 255] },
    { t: '← → 走路　Shift 跑步　↑ 跳躍　空白鍵 發氣功', s: 0.028, col: [210, 225, 255] },
    { t: '題目可用滑鼠點選,或按鍵盤 1 2 3 4 作答', s: 0.028, col: [210, 225, 255] }
  ], '按 Enter 或點一下畫面開始');
}
function drawEnd() {
  const win = G === 'win';
  panel([
    { t: win ? '挑戰成功!' : '挑戰失敗…', s: 0.1, col: win ? [255, 214, 70] : [255, 100, 90] },
    { t: '最終分數 ' + score + '　最高連擊 ' + bestCombo, s: 0.045, col: [255, 255, 255] },
    { t: win ? '春麗擊敗了關主李振康!' : '再接再厲,春麗還沒倒下!', s: 0.035, col: [210, 225, 255] }
  ], '按 R 或點一下畫面再玩一次');
}

// ---------- 輸入 ----------
function startGame() { resetGame(); G = 'explore'; }
function unlockAudio() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } }
function keyPressed() {
  unlockAudio();
  if (G === 'title') { if (keyCode === ENTER || key === ' ') startGame(); return false; }
  if (G === 'win' || G === 'lose') { if (key === 'r' || key === 'R' || keyCode === ENTER) startGame(); return false; }
  if (G === 'quiz' && key >= '1' && key <= '4') answer(int(key) - 1);
  if (G === 'explore' && !chun.busy) {
    if (keyCode === UP_ARROW && !chun.jumping) {
      const v = height * 0.0215;
      chun.jumping = true; chun.vy = -v; chun.jt = 0; chun.jTotal = 2 * v / (height * 0.0011);
      setAnim(chun, 'cJump');
    }
    if (key === ' ' && !chun.jumping) {
      chun.busy = true; setAnim(chun, 'cPush', false); chun.dir = 1;
      schedule(520, () => { sfx.ki(); launchKi(false); });
    }
  }
  return false;       // 避免空白鍵、方向鍵捲動網頁
}
function mousePressed() {
  unlockAudio();
  if (G === 'title' || G === 'win' || G === 'lose') { startGame(); return; }
  if (G === 'quiz') for (let i = 0; i < optRects.length; i++) {
    const b = optRects[i];
    if (mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h) { answer(i); return; }
  }
}

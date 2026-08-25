/**
 * 対人スタイル診断 — アプリケーションロジック
 * すべての回答・計算はブラウザ内で完結し、どこにも送信しない。
 */
(() => {
  'use strict';

  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------
  let order = [];        // shuffled QUESTION_BANK
  let index = 0;         // current question index within `order`
  let answers = {};      // { questionId: 1-5 }
  let lastResult = null; // cached for share-image regeneration

  // ------------------------------------------------------------
  // DOM refs
  // ------------------------------------------------------------
  const el = (id) => document.getElementById(id);
  const screens = document.querySelectorAll('.screen');

  const progressFill = el('progress-fill');
  const progressBar = el('progressbar');
  const qCurrent = el('q-current');
  const btnBack = el('btn-back');
  const quizBody = el('quiz-body');
  const qPrompt = el('q-prompt');
  const poleLeft = el('pole-left');
  const poleRight = el('pole-right');
  const slider = el('q-slider');

  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function avg(list) {
    return list.reduce((s, v) => s + v, 0) / list.length;
  }

  function showScreen(id) {
    screens.forEach((s) => {
      if (s.id === id) s.setAttribute('data-active', 'true');
      else s.removeAttribute('data-active');
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function polarToXY(angleDeg, radius, cx = 150, cy = 150) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.sin(rad),
      y: cy - radius * Math.cos(rad),
    };
  }

  // ------------------------------------------------------------
  // Decorative compass ticks (start screen + result screen)
  // ------------------------------------------------------------
  function buildTicks(groupEl, { withLabels }) {
    groupEl.innerHTML = '';
    Object.values(COMPASS_POINTS).forEach(({ angle, label }) => {
      const inner = polarToXY(angle, 122);
      const outer = polarToXY(angle, 132);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', inner.x);
      line.setAttribute('y1', inner.y);
      line.setAttribute('x2', outer.x);
      line.setAttribute('y2', outer.y);
      line.setAttribute('class', 'compass-tick-mark');
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '1.5');
      line.style.color = 'var(--brass)';
      line.style.opacity = '0.6';
      groupEl.appendChild(line);

      if (withLabels) {
        const labelPos = polarToXY(angle, 147);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelPos.x);
        text.setAttribute('y', labelPos.y);
        text.setAttribute('class', 'compass-tick-label');
        text.textContent = label;
        groupEl.appendChild(text);
      }
    });
  }

  function initAmbientDial() {
    const g = document.querySelector('#screen-start .dial-ticks');
    if (g) buildTicks(g, { withLabels: false });
  }

  // ------------------------------------------------------------
  // Quiz flow
  // ------------------------------------------------------------
  function startQuiz() {
    order = shuffle(QUESTION_BANK);
    index = 0;
    answers = {};
    showScreen('screen-quiz');
    renderQuestion('forward');
  }

  function renderQuestion(dir) {
    const q = order[index];
    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = 'question-card';
    card.dataset.dir = dir;

    const oldCard = el('question-card');
    if (oldCard) oldCard.replaceWith(card);

    card.innerHTML = `
      <p class="question-prompt">${q.prompt}</p>
      <div class="slider-wrap">
        <div class="pole pole--left">${q.left}</div>
        <div class="slider-track-wrap">
          <input type="range" min="1" max="5" step="1" value="${answers[q.id] || 3}" class="slider" id="q-slider" aria-label="回答スライダー">
          <div class="slider-ticks" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
        <div class="pole pole--right">${q.right}</div>
      </div>
      <p class="slider-hint">スライダーを動かして選ぶと、自動的に次の質問へ進みます</p>
    `;

    const newSlider = card.querySelector('#q-slider');
    let advanced = false;
    const commit = () => {
      if (advanced) return;
      advanced = true;
      answers[q.id] = Number(newSlider.value);
      setTimeout(next, 320);
    };
    newSlider.addEventListener('change', commit);
    newSlider.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') commit();
    });

    qCurrent.textContent = String(index + 1);
    btnBack.disabled = index === 0;
    updateProgress();
  }

  function updateProgress() {
    const answeredCount = Object.keys(answers).length;
    const pct = (answeredCount / order.length) * 100;
    progressFill.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', String(answeredCount));
  }

  function next() {
    if (index < order.length - 1) {
      index++;
      renderQuestion('forward');
    } else {
      updateProgress();
      finishQuiz();
    }
  }

  function back() {
    if (index === 0) return;
    index--;
    renderQuestion('back');
  }

  // ------------------------------------------------------------
  // Structural Summary Method (SSM) scoring
  // ------------------------------------------------------------
  const ANGLES = { PA: 0, BC: 45, DE: 90, FG: 135, HI: 180, JK: 225, LM: 270, NO: 315 };

  function computeResult() {
    const byAxis = { agency: [], candor: [], warmth: [], social: [], energy: [] };
    QUESTION_BANK.forEach((q) => byAxis[q.axis].push(answers[q.id]));

    const d1 = avg(byAxis.agency) - 3; // 主導権 PA-HI
    const d2 = avg(byAxis.candor) - 3; // 素直さ BC-JK
    const d3 = avg(byAxis.warmth) - 3; // 距離感・温度感 DE-LM
    const d4 = avg(byAxis.social) - 3; // 社交性 FG-NO

    const scores = {
      PA: -d1, HI: d1,
      BC: -d2, JK: d2,
      DE: -d3, LM: d3,
      FG: -d4, NO: d4,
    };

    let X = 0, Y = 0;
    Object.entries(scores).forEach(([key, score]) => {
      const rad = (ANGLES[key] * Math.PI) / 180;
      X += score * Math.cos(rad);
      Y += score * Math.sin(rad);
    });
    X *= 2 / 8;
    Y *= 2 / 8;

    const amplitude = Math.sqrt(X * X + Y * Y);
    let theta0 = (Math.atan2(Y, X) * 180) / Math.PI;
    if (theta0 < 0) theta0 += 360;

    const energyAvg = avg(byAxis.energy);
    const energyDir = energyAvg < 2.5 ? 'fast' : 'slow';

    const maxDev = Math.max(Math.abs(d1), Math.abs(d2), Math.abs(d3), Math.abs(d4));
    const strength = maxDev < 0.8 ? 'weak' : maxDev < 1.5 ? 'clear' : 'strong';

    const AMPLITUDE_THRESHOLD = 0.5;
    let axisKey = null;
    if (amplitude >= AMPLITUDE_THRESHOLD) {
      let best = null;
      let bestDist = Infinity;
      Object.entries(ANGLES).forEach(([key, angle]) => {
        let diff = Math.abs(theta0 - angle);
        diff = Math.min(diff, 360 - diff);
        if (diff < bestDist - 1e-9) {
          bestDist = diff;
          best = key;
        } else if (Math.abs(diff - bestDist) < 1e-9 && angle < ANGLES[best]) {
          best = key;
        }
      });
      axisKey = best;
    }

    return { axisKey, energyDir, amplitude, theta0, strength };
  }

  // ------------------------------------------------------------
  // Result rendering
  // ------------------------------------------------------------
  function finishQuiz() {
    showScreen('screen-calculating');
    setTimeout(() => {
      const result = computeResult();
      lastResult = result;
      renderResult(result);
      showScreen('screen-result');
    }, 900);
  }

  function renderResult(result) {
    const isBalance = !result.axisKey;
    const type = isBalance ? BALANCE_TYPE : TYPE_DATA[`${result.axisKey}_${result.energyDir}`];

    const hero = el('result-hero');
    const compassSvg = el('compass-svg');
    const energyLabelEl = el('result-energy-label');

    if (isBalance) {
      hero.removeAttribute('data-energy');
      compassSvg.removeAttribute('data-energy');
      energyLabelEl.textContent = 'BALANCED';
    } else {
      hero.setAttribute('data-energy', result.energyDir);
      compassSvg.setAttribute('data-energy', result.energyDir);
      energyLabelEl.textContent = type.energyLabel.toUpperCase();
    }

    el('result-name').textContent = type.name;
    el('result-tagline').textContent = type.tagline;
    el('result-body-1').textContent = type[result.strength];
    el('result-body-2').textContent = type.compat;

    const matchCard = el('best-match-card');
    if (isBalance) {
      matchCard.style.display = 'none';
    } else {
      matchCard.style.display = '';
      el('best-match-name').textContent = type.bestMatch;
    }

    // ---- Compass needle ----
    const minR = 18, maxR = 110;
    const clampedAmp = Math.min(result.amplitude, 2);
    const radius = minR + (clampedAmp / 2) * (maxR - minR);
    const pos = polarToXY(result.theta0, radius);

    const needle = el('compass-needle');
    needle.setAttribute('x2', pos.x);
    needle.setAttribute('y2', pos.y);
    const dot = el('compass-dot');
    dot.setAttribute('cx', pos.x);
    dot.setAttribute('cy', pos.y);
  }

  // ------------------------------------------------------------
  // Share image (canvas export)
  // ------------------------------------------------------------
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = text.split('');
    let line = '';
    let cy = y;
    chars.forEach((ch) => {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        ctx.fillText(line, x, cy);
        line = ch;
        cy += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, cy);
    return cy;
  }

  async function shareImage() {
    if (!lastResult) return;
    const isBalance = !lastResult.axisKey;
    const type = isBalance ? BALANCE_TYPE : TYPE_DATA[`${lastResult.axisKey}_${lastResult.energyDir}`];
    const accent = isBalance ? '#c9a34a' : lastResult.energyDir === 'fast' ? '#ef7a5a' : '#4fa89f';

    try {
      await document.fonts.load('800 64px "Shippori Mincho"');
      await document.fonts.load('500 28px "Zen Kaku Gothic New"');
      await document.fonts.load('500 22px "JetBrains Mono"');
    } catch (e) { /* fonts may already be cached */ }

    const canvas = el('share-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // background
    const bgGrad = ctx.createRadialGradient(W / 2, H * 0.1, 40, W / 2, H * 0.1, W);
    bgGrad.addColorStop(0, '#1a2540');
    bgGrad.addColorStop(1, '#0d1220');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // compass rings (mini signature graphic)
    const cx = W / 2, cy = 430, rings = [140, 220, 300];
    ctx.strokeStyle = 'rgba(201,163,74,0.35)';
    ctx.lineWidth = 2;
    rings.forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(201,163,74,0.2)';
    ctx.beginPath(); ctx.moveTo(cx, cy - 300); ctx.lineTo(cx, cy + 300); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 300, cy); ctx.lineTo(cx + 300, cy); ctx.stroke();

    // needle
    const clampedAmp = Math.min(lastResult.amplitude, 2);
    const radius = 40 + (clampedAmp / 2) * 220;
    const rad = (lastResult.theta0 * Math.PI) / 180;
    const nx = cx + radius * Math.sin(rad);
    const ny = cy - radius * Math.cos(rad);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(nx, ny, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfc6b6';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();

    // eyebrow
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = '600 26px "JetBrains Mono", monospace';
    ctx.fillText('INTERPERSONAL COMPASS', W / 2, 130);

    // type name
    ctx.fillStyle = '#e8c876';
    ctx.font = '800 76px "Shippori Mincho", serif';
    ctx.fillText(type.name, W / 2, 230);

    // tagline (wrapped)
    ctx.fillStyle = '#f3ece0';
    ctx.font = '500 30px "Zen Kaku Gothic New", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, type.tagline, 110, 850, W - 220, 46);

    // best match
    if (!isBalance) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(243,236,224,0.6)';
      ctx.font = '500 22px "JetBrains Mono", monospace';
      ctx.fillText('BEST MATCH', W / 2, 1120);
      ctx.fillStyle = '#e8c876';
      ctx.font = '700 44px "Shippori Mincho", serif';
      ctx.fillText(type.bestMatch, W / 2, 1180);
    }

    // footer
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(243,236,224,0.5)';
    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillText('対人スタイル診断 — Interpersonal Compass', W / 2, H - 60);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `対人スタイル診断_${type.name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }

  // ------------------------------------------------------------
  // Wire up
  // ------------------------------------------------------------
  function init() {
    initAmbientDial();
    buildTicks(el('compass-ticks'), { withLabels: true });

    el('btn-start').addEventListener('click', startQuiz);
    el('btn-back').addEventListener('click', back);
    el('btn-share').addEventListener('click', shareImage);
    el('btn-retake').addEventListener('click', startQuiz);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

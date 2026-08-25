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
  const btnNext = el('btn-next');

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
      <div class="choice-wrap">
        <div class="pole-row">
          <div class="pole pole--left">${q.left}</div>
          <div class="pole pole--right">${q.right}</div>
        </div>
        <div class="choice-row" id="choice-row"></div>
      </div>
      <p class="slider-hint">気持ちに近いところをタップすると、自動的に次の質問へ進みます</p>
    `;

    const row = card.querySelector('#choice-row');
    const selected = answers[q.id] || null;
    let advanceTimer = null;

    [1, 2, 3, 4, 5].forEach((val, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.dataset.value = String(val);
      btn.setAttribute('aria-label', `5段階中${val}`);
      if (selected === val) btn.dataset.selected = 'true';

      btn.addEventListener('click', () => {
        row.querySelectorAll('.choice-btn').forEach((b) => delete b.dataset.selected);
        btn.dataset.selected = 'true';
        answers[q.id] = val;
        updateProgress();
        btnNext.disabled = false;
        if (advanceTimer) clearTimeout(advanceTimer);
        advanceTimer = setTimeout(next, 380);
      });

      row.appendChild(btn);
      if (i < 4) {
        const connector = document.createElement('div');
        connector.className = 'choice-connector';
        row.appendChild(connector);
      }
    });

    qCurrent.textContent = String(index + 1);
    btnBack.disabled = index === 0;
    btnNext.disabled = !(q.id in answers);
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

  // 「次の質問へ」ボタン：戻って確認したあと、選択し直さずに先へ進むためのもの。
  // まだ未回答の質問では使えない（回答した瞬間の自動遷移が唯一の進め方）。
  function goNextButton() {
    const q = order[index];
    if (!(q.id in answers)) return;
    next();
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
    const typeCode = isBalance ? 'balance' : `${result.axisKey}_${result.energyDir}`;
    const type = isBalance ? BALANCE_TYPE : TYPE_DATA[typeCode];

    const hero = el('result-hero');
    const energyLabelEl = el('result-energy-label');

    if (isBalance) {
      hero.removeAttribute('data-energy');
      energyLabelEl.textContent = 'バランスタイプ';
    } else {
      hero.setAttribute('data-energy', result.energyDir);
      energyLabelEl.textContent = type.energyLabel;
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

    renderIllustration(typeCode, type, isBalance ? null : result.energyDir);
  }

  // ------------------------------------------------------------
  // タイプ別イラスト（結果画面上部）
  // 画像は assets/illustrations/<typeCode>.png を配置するだけで自動的に使われる。
  // 未配置の間は、タイプ名の頭文字を丸アイコンで代替表示する。
  // ------------------------------------------------------------
  function renderIllustration(typeCode, type, energyDir) {
    const container = el('result-illustration');
    const img = el('result-illustration-img');
    const fallback = el('result-illustration-fallback');

    if (energyDir) container.setAttribute('data-energy', energyDir);
    else container.removeAttribute('data-energy');

    fallback.textContent = type.name.charAt(0);
    img.alt = type.name;
    img.removeAttribute('data-loaded');
    img.onload = () => { img.dataset.loaded = 'true'; };
    img.onerror = () => { img.removeAttribute('data-loaded'); img.removeAttribute('src'); };
    img.src = `assets/illustrations/${typeCode}.png`;
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
    const accent = isBalance ? '#ffc857' : lastResult.energyDir === 'fast' ? '#ff8a63' : '#4fb3a6';

    try {
      await document.fonts.load('900 64px "Zen Maru Gothic"');
      await document.fonts.load('500 28px "Zen Kaku Gothic New"');
      await document.fonts.load('700 44px "Zen Maru Gothic"');
    } catch (e) { /* fonts may already be cached */ }

    const canvas = el('share-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // background — soft cream
    const bgGrad = ctx.createRadialGradient(W / 2, H * 0.08, 40, W / 2, H * 0.08, W);
    bgGrad.addColorStop(0, '#fff2e6');
    bgGrad.addColorStop(1, '#fff8ef');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // タイプアイコン（丸背景 + 頭文字）— 将来的にタイプ別イラストへ差し替え可能な仮表示
    const cx = W / 2, cy = 340, r = 130;
    ctx.fillStyle = accent + '22';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 108px "Zen Maru Gothic", sans-serif';
    ctx.fillText(type.name.charAt(0), cx, cy + 8);
    ctx.textBaseline = 'alphabetic';

    // eyebrow
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = '700 28px "Zen Kaku Gothic New", sans-serif';
    ctx.fillText('対人スタイル診断', W / 2, 560);

    // type name
    ctx.fillStyle = '#3d332c';
    ctx.font = '900 76px "Zen Maru Gothic", sans-serif';
    ctx.fillText(type.name, W / 2, 660);

    // tagline (wrapped)
    ctx.fillStyle = '#3d332c';
    ctx.font = '500 30px "Zen Kaku Gothic New", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, type.tagline, 110, 780, W - 220, 46);

    // best match
    if (!isBalance) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#93857a';
      ctx.font = '700 24px "Zen Kaku Gothic New", sans-serif';
      ctx.fillText('最も相性がよいタイプ', W / 2, 1120);
      ctx.fillStyle = accent;
      ctx.font = '900 44px "Zen Maru Gothic", sans-serif';
      ctx.fillText(type.bestMatch, W / 2, 1180);
    }

    // footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#93857a';
    ctx.font = '500 22px "Zen Kaku Gothic New", sans-serif';
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
    el('btn-start').addEventListener('click', startQuiz);
    el('btn-back').addEventListener('click', back);
    el('btn-next').addEventListener('click', goNextButton);
    el('btn-share').addEventListener('click', shareImage);
    el('btn-retake').addEventListener('click', startQuiz);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

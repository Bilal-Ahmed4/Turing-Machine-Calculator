import { BLANK, HALT, L, R, S } from './constants.js';
import { SUBTRACTION_MACHINE, getMachine, getMachineName } from './machines.js';
import { TuringMachine } from './turingMachine.js';
import { buildUnaryTape } from './unary.js';
import { renderFSMGraph } from './graph.js';

export function initApp() {
  // DOM refs
  const $op1 = document.getElementById('operand1');
  const $op2 = document.getElementById('operand2');
  const $opBtns = document.querySelectorAll('.op-btn');
  const $exprVal = document.getElementById('expr-value');
  const $btnLoad = document.getElementById('btn-load');
  const $btnStep = document.getElementById('btn-step');
  const $btnRun = document.getElementById('btn-run');
  const $btnPause = document.getElementById('btn-pause');
  const $btnReset = document.getElementById('btn-reset');
  const $speed = document.getElementById('speed-slider');
  const $statusTxt = document.getElementById('status-text');
  const $stateTxt = document.getElementById('state-text');
  const $stepTxt = document.getElementById('step-text');
  const $headTxt = document.getElementById('head-text');
  const $readTxt = document.getElementById('read-text');
  const $writeTxt = document.getElementById('write-text');
  const $dirTxt = document.getElementById('dir-text');
  const $tapeCells = document.getElementById('tape-cells');
  const $tapeScroll = document.getElementById('tape-scroll');
  const $tapeHint = document.getElementById('tape-hint');
  const $tapePanel = document.getElementById('tape-panel');
  const $resultVal = document.getElementById('result-value');
  const $resultDet = document.getElementById('result-detail');
  const $tableBadge = document.getElementById('table-badge');
  const $tableTbody = document.getElementById('transition-tbody');

  // FSM Graph DOM refs
  const $fsmContainer = document.getElementById('fsm-container');
  const $fsmPlaceholder = document.getElementById('fsm-placeholder');
  const $fsmBadge = document.getElementById('fsm-badge');

  // Turing Computation Graph DOM refs
  const $turingGraphBadge = document.getElementById('turing-graph-badge');
  const $turingCanvas = document.getElementById('turing-graph-canvas');
  const $tgStatesVisited = document.getElementById('tg-states-visited');
  const $tgTransitionsFired = document.getElementById('tg-transitions-fired');
  const $tgUniqueStates = document.getElementById('tg-unique-states');
  const $tgHeadTravel = document.getElementById('tg-head-travel');

  let selectedOp = '+';
  let tm = null;
  let machine = null;
  let running = false;
  let timerId = null;
  let divContext = null; // for division (repeated subtraction)

  // Graph state
  let fsmGraph = null;
  let computationHistory = [];
  let statesVisitedSet = new Set();
  let totalHeadTravel = 0;
  let lastHeadPos = 0;

  function updatePreview() {
    const a = parseInt($op1.value) || 0;
    const b = parseInt($op2.value) || 0;
    const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    $exprVal.textContent = `${a} ${opMap[selectedOp]} ${b} = ?`;
  }

  $opBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      $opBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedOp = btn.dataset.op;
      updatePreview();
    });
  });
  $op1.addEventListener('input', updatePreview);
  $op2.addEventListener('input', updatePreview);

  $btnLoad.addEventListener('click', load);
  $btnStep.addEventListener('click', stepOnce);
  $btnRun.addEventListener('click', run);
  $btnPause.addEventListener('click', pause);
  $btnReset.addEventListener('click', reset);

  function load() {
    pause();
    const a = Math.max(0, Math.min(20, parseInt($op1.value) || 0));
    const b = Math.max(0, Math.min(20, parseInt($op2.value) || 0));
    $op1.value = a;
    $op2.value = b;

    if (selectedOp === '/' && b === 0) {
      setStatus('Error: Division by zero', 'error');
      $resultVal.textContent = 'Error';
      $resultVal.className = 'result-big error';
      $resultDet.textContent = 'Cannot divide by zero';
      return;
    }

    divContext = null;

    if (selectedOp === '/') {
      divContext = { dividend: a, divisor: b, remainder: a, quotient: 0 };
      const tapeStr = buildUnaryTape(a, b, '-');
      machine = SUBTRACTION_MACHINE;
      tm = new TuringMachine(tapeStr, BLANK);
      setStatus('Division: subtracting...', 'running');
      $tapeHint.textContent = `Division via repeated subtraction (${a} ÷ ${b})`;
    } else {
      const tapeStr = buildUnaryTape(a, b, selectedOp);
      machine = getMachine(selectedOp);
      tm = new TuringMachine(tapeStr, BLANK);
      setStatus('Loaded', 'idle');
      $tapeHint.textContent = `${getMachineName(selectedOp)} — ${a} ${selectedOp} ${b}`;
    }

    $tapePanel.classList.remove('halted', 'error-state');
    $resultVal.textContent = '—';
    $resultVal.className = 'result-big';
    $resultDet.textContent = '';
    $tableBadge.textContent = getMachineName(selectedOp);

    renderTransitionTable(selectedOp === '/' ? SUBTRACTION_MACHINE : machine, tm.state);
    renderTape(tm.snapshot());
    updateStatus(tm.snapshot());
    enableControls(true);

    // Initialize FSM Graph
    const activeMachine = selectedOp === '/' ? SUBTRACTION_MACHINE : machine;
    $fsmBadge.textContent = getMachineName(selectedOp);
    fsmGraph = renderFSMGraph($fsmContainer, activeMachine);
    fsmGraph.update(tm.state, null);

    // Initialize Turing Computation Graph
    computationHistory = [];
    statesVisitedSet = new Set();
    statesVisitedSet.add(tm.state);
    totalHeadTravel = 0;
    lastHeadPos = tm.head || 0;
    $turingGraphBadge.textContent = getMachineName(selectedOp);
    computationHistory.push({
      step: 0,
      state: tm.state,
      head: tm.head || 0,
      wrote: false,
    });
    updateComputationGraph();
  }

  function stepOnce() {
    if (!tm || tm.error) return;
    if (tm.halted) {
      handleHalt();
      return;
    }
    const snap = tm.tick(machine);
    renderTape(snap);
    updateStatus(snap);
    renderTransitionTable(selectedOp === '/' && divContext ? SUBTRACTION_MACHINE : machine, snap.state, snap.lastRead);

    // Update FSM graph
    if (fsmGraph) {
      fsmGraph.update(snap.state, snap.lastRead);
    }

    // Update computation history
    const wrote = snap.lastWrite !== null && snap.lastWrite !== snap.lastRead;
    statesVisitedSet.add(snap.state);
    totalHeadTravel += Math.abs((snap.head || 0) - lastHeadPos);
    lastHeadPos = snap.head || 0;
    computationHistory.push({
      step: snap.step,
      state: typeof snap.state === 'number' ? snap.state : -1,
      head: snap.head || 0,
      wrote: wrote,
    });
    updateComputationGraph();

    if (snap.halted) handleHalt();
    if (snap.error) handleError(snap.error);
  }

  function run() {
    if (!tm || running) return;
    running = true;
    $btnRun.disabled = true;
    $btnPause.disabled = false;
    setStatus('Running...', 'running');
    tick();
  }

  function tick() {
    if (!running || !tm) return;
    stepOnce();
    if (running && tm && !tm.halted && !tm.error) {
      const delay = 520 - parseInt($speed.value);
      timerId = setTimeout(tick, Math.max(10, delay));
    }
  }

  function pause() {
    running = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    $btnRun.disabled = false;
    $btnPause.disabled = true;
    if (tm && !tm.halted && !tm.error) setStatus('Paused', 'idle');
  }

  function reset() {
    pause();
    tm = null;
    machine = null;
    divContext = null;
    $tapeCells.innerHTML = '';
    $tapePanel.classList.remove('halted', 'error-state');
    $tapeHint.textContent = 'Load an expression to begin';
    $resultVal.textContent = '—';
    $resultVal.className = 'result-big';
    $resultDet.textContent = '';
    $tableBadge.textContent = '—';
    $tableTbody.innerHTML = '';
    setStatus('Idle', 'idle');
    $stateTxt.textContent = '—';
    $stepTxt.textContent = '0';
    $headTxt.textContent = '0';
    $readTxt.textContent = '—';
    $writeTxt.textContent = '—';
    $dirTxt.textContent = '—';
    enableControls(false);
    updatePreview();

    // Reset FSM graph
    fsmGraph = null;
    $fsmContainer.innerHTML = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'graph-placeholder';
    placeholder.id = 'fsm-placeholder';
    placeholder.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="9" opacity="0.3"/>
        <circle cx="6" cy="8" r="2.5" opacity="0.5"/>
        <circle cx="18" cy="8" r="2.5" opacity="0.5"/>
        <circle cx="12" cy="18" r="2.5" opacity="0.5"/>
        <path d="M8.3 7.2L15.7 7.2M16.2 10L13.5 16M10.5 16L7.8 10" opacity="0.3" stroke-width="1"/>
      </svg>
      <span>Load an expression to view the FSM diagram</span>`;
    $fsmContainer.appendChild(placeholder);
    $fsmBadge.textContent = '—';

    // Reset computation graph
    computationHistory = [];
    statesVisitedSet = new Set();
    totalHeadTravel = 0;
    lastHeadPos = 0;
    $turingGraphBadge.textContent = '—';
    $tgStatesVisited.textContent = '0';
    $tgTransitionsFired.textContent = '0';
    $tgUniqueStates.textContent = '0';
    $tgHeadTravel.textContent = '0';
    clearComputationCanvas();
  }

  function handleHalt() {
    if (divContext) {
      const remainder = tm.countOnes();
      divContext.remainder = remainder;

      if (remainder >= divContext.divisor) {
        divContext.quotient++;
        setStatus(`Division: q=${divContext.quotient}, subtracting again...`, 'running');
        const tapeStr = buildUnaryTape(remainder, divContext.divisor, '-');
        tm = new TuringMachine(tapeStr, BLANK);
        machine = SUBTRACTION_MACHINE;
        renderTape(tm.snapshot());
        updateStatus(tm.snapshot());
        if (running) tick();
        return;
      }

      const a = divContext.dividend;
      const b = divContext.divisor;
      const q = Math.floor(a / b);
      const r = a % b;

      pause();
      $tapePanel.classList.add('halted');
      setStatus('Halted — Division complete', 'halted');
      $resultVal.textContent = q;
      $resultVal.className = 'result-big success';
      $resultDet.textContent = `${a} ÷ ${b} = ${q} (remainder ${r}) — computed via ${q} repeated subtraction(s)`;
      enableControls(false);
      $btnReset.disabled = false;
      return;
    }

    pause();
    const result = tm.countOnes();
    const a = parseInt($op1.value) || 0;
    const b = parseInt($op2.value) || 0;
    const opMap = { '+': '+', '-': '−', '*': '×' };

    $tapePanel.classList.add('halted');
    setStatus(`Halted after ${tm.step} steps`, 'halted');
    $resultVal.textContent = result;
    $resultVal.className = 'result-big success';
    $resultDet.textContent = `${a} ${opMap[selectedOp] || selectedOp} ${b} = ${result} (${tm.step} steps on the Turing Machine)`;
    enableControls(false);
    $btnReset.disabled = false;
  }

  function handleError(err) {
    pause();
    $tapePanel.classList.add('error-state');
    setStatus(`Error: ${err}`, 'error');
    $resultVal.textContent = 'Error';
    $resultVal.className = 'result-big error';
    $resultDet.textContent = err;
    enableControls(false);
    $btnReset.disabled = false;
  }

  function setStatus(text, type) {
    $statusTxt.textContent = text;
    $statusTxt.style.color =
      type === 'running'
        ? 'var(--accent-cyan)'
        : type === 'halted'
          ? 'var(--accent-green)'
          : type === 'error'
            ? 'var(--accent-red)'
            : 'var(--text-secondary)';
  }

  function enableControls(on) {
    $btnStep.disabled = !on;
    $btnRun.disabled = !on;
    $btnPause.disabled = true;
    $btnReset.disabled = !on;
  }

  function updateStatus(snap) {
    $stateTxt.textContent = snap.state === HALT ? 'HALT' : `q${snap.state}`;
    $stepTxt.textContent = snap.step;
    $headTxt.textContent = snap.head;
    $readTxt.textContent = snap.lastRead !== null ? displaySym(snap.lastRead) : '—';
    $writeTxt.textContent = snap.lastWrite !== null ? displaySym(snap.lastWrite) : '—';
    $dirTxt.textContent =
      snap.lastDir === R ? '→ Right' : snap.lastDir === L ? '← Left' : snap.lastDir === S ? '• Stay' : '—';
  }

  function displaySym(s) {
    if (s === BLANK) return '␣';
    return s;
  }

  const TAPE_PADDING = 8; // blank cells on each side

  function renderTape(snap) {
    const { tape, head } = snap;

    const padded = [];
    for (let i = 0; i < TAPE_PADDING; i++) padded.push(BLANK);
    padded.push(...tape);
    for (let i = 0; i < TAPE_PADDING; i++) padded.push(BLANK);
    const adjustedHead = head + TAPE_PADDING;

    $tapeCells.innerHTML = '';
    padded.forEach((sym, i) => {
      const cell = document.createElement('div');
      cell.className = 'tape-cell';
      if (i === adjustedHead) cell.classList.add('active');
      if (sym === BLANK) cell.classList.add('blank-cell');

      const symSpan = document.createElement('span');
      symSpan.textContent = sym === BLANK ? '␣' : sym;
      cell.appendChild(symSpan);

      const idxSpan = document.createElement('span');
      idxSpan.className = 'cell-index';
      idxSpan.textContent = i - TAPE_PADDING;
      cell.appendChild(idxSpan);

      $tapeCells.appendChild(cell);
    });

    requestAnimationFrame(() => {
      const activeCell = $tapeCells.querySelector('.tape-cell.active');
      if (activeCell) {
        const containerRect = $tapeScroll.getBoundingClientRect();
        const cellRect = activeCell.getBoundingClientRect();
        const scrollLeft = $tapeScroll.scrollLeft;
        const targetScroll =
          scrollLeft + cellRect.left - containerRect.left - containerRect.width / 2 + cellRect.width / 2;
        $tapeScroll.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    });
  }

  function renderTransitionTable(mac, currentState, currentRead) {
    $tableTbody.innerHTML = '';
    const states = Object.keys(mac).sort((a, b) => parseInt(a) - parseInt(b));

    for (const st of states) {
      const rules = mac[st];
      const symbols = Object.keys(rules);
      for (const sym of symbols) {
        const [, write, nextSt, dir] = rules[sym];
        const tr = document.createElement('tr');

        const isActive = (parseInt(st) === currentState || st === String(currentState)) && sym === currentRead;
        if (isActive) tr.classList.add('active-row');

        const tdState = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'state-badge' + (isActive ? ' current' : '');
        badge.textContent = `q${st}`;
        tdState.appendChild(badge);
        tr.appendChild(tdState);

        const tdRead = document.createElement('td');
        tdRead.textContent = displaySym(sym);
        tr.appendChild(tdRead);

        const tdWrite = document.createElement('td');
        tdWrite.textContent = displaySym(write);
        tr.appendChild(tdWrite);

        const tdNext = document.createElement('td');
        if (nextSt === HALT) {
          tdNext.innerHTML = '<span class="halt">HALT</span>';
        } else {
          tdNext.textContent = `q${nextSt}`;
        }
        tr.appendChild(tdNext);

        const tdDir = document.createElement('td');
        if (dir === R) {
          tdDir.innerHTML = '<span class="dir-r">→ R</span>';
        } else if (dir === L) {
          tdDir.innerHTML = '<span class="dir-l">← L</span>';
        } else {
          tdDir.innerHTML = '<span class="dir-s">• S</span>';
        }
        tr.appendChild(tdDir);

        $tableTbody.appendChild(tr);
      }
    }
  }

  function initParticles() {
    const container = document.getElementById('bg-particles');
    const count = 30;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 2 + Math.random() * 4;
      const hue = 200 + Math.random() * 60;
      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        background: hsl(${hue}, 80%, 65%);
        animation-delay: ${Math.random() * 8}s;
        animation-duration: ${6 + Math.random() * 6}s;
      `;
      container.appendChild(p);
    }
  }

  // ─── Computation Graph Rendering ────────────────────────────
  function updateComputationGraph() {
    // Update stats
    $tgStatesVisited.textContent = computationHistory.length;
    $tgTransitionsFired.textContent = Math.max(0, computationHistory.length - 1);
    $tgUniqueStates.textContent = statesVisitedSet.size;
    $tgHeadTravel.textContent = totalHeadTravel;

    // Draw timeline on canvas
    const canvas = $turingCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    if (computationHistory.length < 2) {
      // Draw placeholder grid
      ctx.strokeStyle = 'rgba(51,65,85,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (h / 5) * i + h / 10;
        ctx.beginPath();
        ctx.setLineDash([3, 5]);
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(100,116,139,0.5)';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Run the simulation to see the computation graph', w / 2, h / 2);
      return;
    }

    const data = computationHistory;
    const maxSteps = Math.max(data.length - 1, 1);

    // Compute ranges
    let maxState = 0, maxHead = 0, minHead = 0;
    for (const d of data) {
      if (d.state >= 0) maxState = Math.max(maxState, d.state);
      maxHead = Math.max(maxHead, d.head);
      minHead = Math.min(minHead, d.head);
    }
    maxState = Math.max(maxState, 1);
    const headRange = Math.max(maxHead - minHead, 1);

    const padTop = 20;
    const padBot = 25;
    const padLeft = 40;
    const padRight = 15;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBot;

    // Grid
    ctx.strokeStyle = 'rgba(51,65,85,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Y-axis labels
    ctx.fillStyle = 'rgba(100,116,139,0.6)';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('max', padLeft - 6, padTop + 4);
    ctx.fillText('0', padLeft - 6, padTop + plotH + 4);

    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Steps →', w / 2, h - 4);

    function xPos(step) {
      return padLeft + (step / maxSteps) * plotW;
    }

    // Draw state line (cyan)
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (let i = 0; i < data.length; i++) {
      const x = xPos(i);
      const y = padTop + plotH - (data[i].state >= 0 ? (data[i].state / maxState) * plotH : 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw head position line (purple)
    ctx.beginPath();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (let i = 0; i < data.length; i++) {
      const x = xPos(i);
      const normHead = (data[i].head - minHead) / headRange;
      const y = padTop + plotH - normHead * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw write events (green dots)
    ctx.fillStyle = '#4ade80';
    for (let i = 0; i < data.length; i++) {
      if (data[i].wrote) {
        const x = xPos(i);
        const normHead = (data[i].head - minHead) / headRange;
        const y = padTop + plotH - normHead * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Current position marker
    if (data.length > 0) {
      const last = data[data.length - 1];
      const x = xPos(data.length - 1);
      const y = padTop + plotH - (last.state >= 0 ? (last.state / maxState) * plotH : 0);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function clearComputationCanvas() {
    const canvas = $turingCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Placeholder text
    ctx.fillStyle = 'rgba(100,116,139,0.5)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run the simulation to see the computation graph', rect.width / 2, rect.height / 2);
  }

  updatePreview();
  initParticles();

  // Initialize computation canvas placeholder
  requestAnimationFrame(() => {
    clearComputationCanvas();
  });

  return { load, stepOnce, run, pause, reset };
}


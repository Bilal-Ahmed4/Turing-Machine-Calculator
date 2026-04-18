import { BLANK, HALT, L, R, S } from './constants.js';

/**
 * FSM / State-Transition Graph Renderer (v2 – clean layout)
 * Renders an SVG graph with well-spaced nodes and readable labels.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Configuration ──────────────────────────────────────────────
const NODE_R = 26;
const ARROW_SZ = 8;
const FONT_LABEL = 9.5;
const FONT_NODE = 12;

const C = {
  nodeFill:       '#151e2d',
  nodeStroke:     '#334155',
  nodeText:       '#e2e8f0',
  activeFill:     'rgba(56,189,248,0.14)',
  activeStroke:   '#38bdf8',
  activeGlow:     'rgba(56,189,248,0.35)',
  haltFill:       'rgba(244,114,182,0.10)',
  haltStroke:     '#f472b6',
  haltText:       '#f472b6',
  edge:           '#3b4a63',
  edgeText:       '#8896ab',
  activeEdge:     '#38bdf8',
  activeEdgeText: '#67d4fc',
  startColor:     '#4ade80',
  labelBg:        '#111827',
};

// ── Helpers ────────────────────────────────────────────────────
const sym = s => (s === BLANK ? '␣' : s);
const dir = d => (d === R ? 'R' : d === L ? 'L' : 'S');

function el(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// ── Build graph model ──────────────────────────────────────────
function buildGraph(machine) {
  const stateSet = new Set();
  const edges = [];
  for (const st of Object.keys(machine)) {
    const s = parseInt(st);
    stateSet.add(s);
    for (const r of Object.keys(machine[st])) {
      const [, w, ns, d] = machine[st][r];
      const to = ns === HALT ? HALT : ns;
      stateSet.add(to);
      edges.push({ from: s, to, read: r, write: w, dir: d });
    }
  }
  const nodes = [...stateSet].sort((a, b) => {
    if (a === HALT) return 1;
    if (b === HALT) return 1;
    return a - b;
  });
  return { nodes, edges };
}

// ── Group edges by (from→to) ───────────────────────────────────
function groupEdges(edges) {
  const m = new Map();
  for (const e of edges) {
    const k = `${e.from}→${e.to}`;
    if (!m.has(k)) m.set(k, { from: e.from, to: e.to, labels: [] });
    m.get(k).labels.push(e);
  }
  return [...m.values()];
}

// ── Layout: place nodes in well-spaced positions ───────────────
function layoutNodes(nodes, w, h) {
  const pos = {};
  const n = nodes.length;
  if (n === 0) return pos;
  if (n === 1) { pos[nodes[0]] = { x: w / 2, y: h / 2 }; return pos; }

  const reg = nodes.filter(x => x !== HALT);
  const hasHalt = nodes.includes(HALT);
  const total = hasHalt ? reg.length + 1 : reg.length;

  // Generous ellipse
  const cx = w / 2;
  const cy = h / 2;
  const rx = (w / 2) - NODE_R - 55;
  const ry = (h / 2) - NODE_R - 50;

  reg.forEach((nd, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / total;
    pos[nd] = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });

  if (hasHalt) {
    const a = -Math.PI / 2 + (2 * Math.PI * reg.length) / total;
    pos[HALT] = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  }
  return pos;
}

// ── Geometry utilities ─────────────────────────────────────────
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function ptOnCircle(cx, cy, tx, ty, r) {
  const d = dist(cx, cy, tx, ty) || 1;
  return { x: cx + ((tx - cx) / d) * r, y: cy + ((ty - cy) / d) * r };
}

function midOnQuad(x1, y1, mx, my, x2, y2, t = 0.5) {
  const a = 1 - t;
  return {
    x: a * a * x1 + 2 * a * t * mx + t * t * x2,
    y: a * a * y1 + 2 * a * t * my + t * t * y2,
  };
}

// ── Render FSM Graph ───────────────────────────────────────────
export function renderFSMGraph(container, machine) {
  container.innerHTML = '';

  const { nodes, edges } = buildGraph(machine);
  const grouped = groupEdges(edges);

  // Adaptive viewport
  const count = nodes.length;
  const vw = Math.max(550, Math.min(900, count * 80 + 200));
  const vh = Math.max(420, Math.min(700, count * 55 + 180));

  const pos = layoutNodes(nodes, vw, vh);

  const svg = el('svg', {
    viewBox: `0 0 ${vw} ${vh}`,
    class: 'fsm-svg',
    preserveAspectRatio: 'xMidYMid meet',
  });
  svg.style.width = '100%';
  svg.style.height = '100%';

  // ── Defs ─────────────────────────────────────────────────────
  const defs = el('defs');

  // Normal arrowhead
  const mk1 = el('marker', { id: 'ah', markerWidth: ARROW_SZ, markerHeight: ARROW_SZ,
    refX: ARROW_SZ - 1, refY: ARROW_SZ / 2, orient: 'auto', markerUnits: 'userSpaceOnUse' });
  mk1.appendChild(el('path', { d: `M0 0 L${ARROW_SZ} ${ARROW_SZ/2} L0 ${ARROW_SZ}Z`, fill: C.edge }));
  defs.appendChild(mk1);

  // Active arrowhead
  const mk2 = el('marker', { id: 'ah-a', markerWidth: ARROW_SZ, markerHeight: ARROW_SZ,
    refX: ARROW_SZ - 1, refY: ARROW_SZ / 2, orient: 'auto', markerUnits: 'userSpaceOnUse' });
  mk2.appendChild(el('path', { d: `M0 0 L${ARROW_SZ} ${ARROW_SZ/2} L0 ${ARROW_SZ}Z`, fill: C.activeEdge }));
  defs.appendChild(mk2);

  // Start arrowhead
  const mk3 = el('marker', { id: 'ah-s', markerWidth: ARROW_SZ, markerHeight: ARROW_SZ,
    refX: ARROW_SZ - 1, refY: ARROW_SZ / 2, orient: 'auto', markerUnits: 'userSpaceOnUse' });
  mk3.appendChild(el('path', { d: `M0 0 L${ARROW_SZ} ${ARROW_SZ/2} L0 ${ARROW_SZ}Z`, fill: C.startColor }));
  defs.appendChild(mk3);

  // Glow filter
  const flt = el('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  const fb = el('feGaussianBlur', { stdDeviation: '5', result: 'b' });
  const fm = el('feMerge');
  fm.appendChild(el('feMergeNode', { in: 'b' }));
  fm.appendChild(el('feMergeNode', { in: 'SourceGraphic' }));
  flt.appendChild(fb);
  flt.appendChild(fm);
  defs.appendChild(flt);

  svg.appendChild(defs);

  // ── Edge layer ───────────────────────────────────────────────
  const edgeG = el('g', { class: 'edges' });
  const edgeEls = [];

  // Detect reverse edges for curving
  const edgeKeys = new Set(grouped.map(g => `${g.from}→${g.to}`));

  for (const ge of grouped) {
    const p1 = pos[ge.from], p2 = pos[ge.to];
    if (!p1 || !p2) continue;

    const self = ge.from === ge.to;
    const hasReverse = edgeKeys.has(`${ge.to}→${ge.from}`) && !self;
    const eData = { from: ge.from, to: ge.to, labels: ge.labels, els: {} };

    // Build combined label text — stack lines
    const lines = ge.labels.map(l => `${sym(l.read)} → ${sym(l.write)}, ${dir(l.dir)}`);

    if (self) {
      // ── Self-loop ────────────────────────────────────────────
      // Find best direction to place loop (away from center)
      const cx = vw / 2, cy = vh / 2;
      const dx = p1.x - cx, dy = p1.y - cy;
      const angle = Math.atan2(dy, dx);
      const loopDist = NODE_R + 30;

      const lx = p1.x + Math.cos(angle) * loopDist;
      const ly = p1.y + Math.sin(angle) * loopDist;

      // Tangent offsets
      const spread = 14;
      const perpX = -Math.sin(angle) * spread;
      const perpY = Math.cos(angle) * spread;

      const sx = p1.x + Math.cos(angle) * (NODE_R - 2) + perpX;
      const sy = p1.y + Math.sin(angle) * (NODE_R - 2) + perpY;
      const ex = p1.x + Math.cos(angle) * (NODE_R - 2) - perpX;
      const ey = p1.y + Math.sin(angle) * (NODE_R - 2) - perpY;

      // Control points for cubic bezier
      const cpDist = NODE_R + 50;
      const cp1x = p1.x + Math.cos(angle - 0.4) * cpDist;
      const cp1y = p1.y + Math.sin(angle - 0.4) * cpDist;
      const cp2x = p1.x + Math.cos(angle + 0.4) * cpDist;
      const cp2y = p1.y + Math.sin(angle + 0.4) * cpDist;

      const path = el('path', {
        d: `M${sx} ${sy} C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`,
        fill: 'none', stroke: C.edge, 'stroke-width': '1.4',
        'marker-end': 'url(#ah)', class: 'edge-path',
      });
      edgeG.appendChild(path);
      eData.els.path = path;

      // Label at loop apex
      const labelX = p1.x + Math.cos(angle) * (cpDist - 6);
      const labelY = p1.y + Math.sin(angle) * (cpDist - 6);
      _addLabel(edgeG, eData, lines, labelX, labelY);

    } else {
      // ── Regular edge ─────────────────────────────────────────
      const curve = hasReverse ? (ge.from < ge.to ? 28 : -28) : 0;

      const d = dist(p1.x, p1.y, p2.x, p2.y) || 1;
      const nx = -(p2.y - p1.y) / d;
      const ny = (p2.x - p1.x) / d;
      const mx = (p1.x + p2.x) / 2 + nx * curve;
      const my = (p1.y + p2.y) / 2 + ny * curve;

      // Start/end on circle edges aiming toward control point
      const s = ptOnCircle(p1.x, p1.y, mx, my, NODE_R + 2);
      const e = ptOnCircle(p2.x, p2.y, mx, my, NODE_R + ARROW_SZ + 1);

      const path = el('path', {
        d: `M${s.x} ${s.y} Q${mx} ${my} ${e.x} ${e.y}`,
        fill: 'none', stroke: C.edge, 'stroke-width': '1.4',
        'marker-end': 'url(#ah)', class: 'edge-path',
      });
      edgeG.appendChild(path);
      eData.els.path = path;

      // Label at curve midpoint
      const lp = midOnQuad(s.x, s.y, mx, my, e.x, e.y, 0.5);
      // Offset label slightly away from the line
      const offX = nx * (Math.abs(curve) > 0 ? 2 : 8);
      const offY = ny * (Math.abs(curve) > 0 ? 2 : 8);
      _addLabel(edgeG, eData, lines, lp.x + offX, lp.y + offY);
    }

    edgeEls.push(eData);
  }

  svg.appendChild(edgeG);

  // ── Node layer ───────────────────────────────────────────────
  const nodeG = el('g', { class: 'nodes' });
  const nodeEls = {};

  for (const nd of nodes) {
    const p = pos[nd];
    if (!p) continue;
    const isH = nd === HALT;
    const g = el('g', { class: `node-g${isH ? ' halt' : ''}`, 'data-s': nd });

    // Glow ring
    const glow = el('circle', {
      cx: p.x, cy: p.y, r: NODE_R + 8,
      fill: 'none', stroke: C.activeGlow, 'stroke-width': '2', opacity: '0',
      class: 'n-glow',
    });
    g.appendChild(glow);

    // Halt double ring
    if (isH) {
      g.appendChild(el('circle', {
        cx: p.x, cy: p.y, r: NODE_R + 5,
        fill: 'none', stroke: C.haltStroke, 'stroke-width': '1.2', opacity: '0.5',
      }));
    }

    // Main circle
    const circ = el('circle', {
      cx: p.x, cy: p.y, r: NODE_R,
      fill: isH ? C.haltFill : C.nodeFill,
      stroke: isH ? C.haltStroke : C.nodeStroke,
      'stroke-width': '2', class: 'n-circ',
    });
    g.appendChild(circ);

    // Label
    const lbl = el('text', {
      x: p.x, y: p.y + 1,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': isH ? '11px' : `${FONT_NODE}px`,
      'font-weight': '700',
      'font-family': "'JetBrains Mono', monospace",
      fill: isH ? C.haltText : C.nodeText,
      class: 'n-lbl',
    });
    lbl.textContent = isH ? 'HALT' : `q${nd}`;
    g.appendChild(lbl);

    // Start arrow for q0
    if (nd === 0) {
      const ax = p.x - NODE_R - 30;
      g.appendChild(el('line', {
        x1: ax, y1: p.y, x2: p.x - NODE_R - 2, y2: p.y,
        stroke: C.startColor, 'stroke-width': '2', 'marker-end': 'url(#ah-s)',
      }));
      const stxt = el('text', {
        x: ax - 3, y: p.y - 7, 'text-anchor': 'end',
        'font-size': '9px', 'font-weight': '600',
        'font-family': "'Inter', sans-serif",
        fill: C.startColor, opacity: '0.7',
      });
      stxt.textContent = 'start';
      g.appendChild(stxt);
    }

    nodeG.appendChild(g);
    nodeEls[nd] = { g, circ, glow, lbl };
  }

  svg.appendChild(nodeG);
  container.appendChild(svg);

  // ── Update function ──────────────────────────────────────────
  function update(curState, curRead) {
    // Reset nodes
    for (const [k, n] of Object.entries(nodeEls)) {
      const h = k === HALT || k === 'H';
      n.circ.setAttribute('fill', h ? C.haltFill : C.nodeFill);
      n.circ.setAttribute('stroke', h ? C.haltStroke : C.nodeStroke);
      n.circ.setAttribute('stroke-width', '2');
      n.glow.setAttribute('opacity', '0');
      n.lbl.setAttribute('fill', h ? C.haltText : C.nodeText);
      n.g.classList.remove('active');
    }
    // Reset edges
    for (const e of edgeEls) {
      if (e.els.path) {
        e.els.path.setAttribute('stroke', C.edge);
        e.els.path.setAttribute('stroke-width', '1.4');
        e.els.path.setAttribute('marker-end', 'url(#ah)');
      }
      if (e.els.labels) {
        e.els.labels.forEach(t => {
          t.setAttribute('fill', C.edgeText);
          t.setAttribute('font-weight', 'normal');
        });
      }
    }

    // Highlight active node
    const sk = curState === HALT ? HALT : curState;
    const an = nodeEls[sk];
    if (an) {
      const h = sk === HALT;
      an.circ.setAttribute('fill', h ? C.haltFill : C.activeFill);
      an.circ.setAttribute('stroke', h ? C.haltStroke : C.activeStroke);
      an.circ.setAttribute('stroke-width', '3');
      an.glow.setAttribute('opacity', '0.6');
      an.glow.setAttribute('stroke', h ? C.haltStroke : C.activeGlow);
      an.lbl.setAttribute('fill', h ? C.haltText : C.activeStroke);
      an.g.classList.add('active');
    }

    // Highlight active edge
    if (curRead != null) {
      for (const e of edgeEls) {
        if ((e.from === curState || String(e.from) === String(curState)) &&
            e.labels.some(l => l.read === curRead)) {
          if (e.els.path) {
            e.els.path.setAttribute('stroke', C.activeEdge);
            e.els.path.setAttribute('stroke-width', '2.5');
            e.els.path.setAttribute('marker-end', 'url(#ah-a)');
          }
          if (e.els.labels) {
            e.els.labels.forEach(t => {
              t.setAttribute('fill', C.activeEdgeText);
              t.setAttribute('font-weight', 'bold');
            });
          }
        }
      }
    }
  }

  return { update };

  // ── Internal: add multi-line label with background ───────────
  function _addLabel(parent, eData, lines, x, y) {
    const lineH = 13;
    const totalH = lines.length * lineH;
    const startY = y - totalH / 2 + lineH / 2;

    // Measure approximate width
    const maxLen = Math.max(...lines.map(l => l.length));
    const approxW = maxLen * 6.2 + 12;

    // Background pill
    const bg = el('rect', {
      x: x - approxW / 2, y: y - totalH / 2 - 4,
      width: approxW, height: totalH + 6,
      rx: 4, fill: C.labelBg, opacity: '0.92',
      class: 'e-lbl-bg',
    });
    parent.appendChild(bg);
    eData.els.bg = bg;

    // Text lines
    const txts = [];
    lines.forEach((line, i) => {
      const t = el('text', {
        x, y: startY + i * lineH,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': `${FONT_LABEL}px`,
        'font-family': "'JetBrains Mono', monospace",
        fill: C.edgeText, class: 'e-lbl',
      });
      t.textContent = line;
      parent.appendChild(t);
      txts.push(t);
    });
    eData.els.labels = txts;

    // Re-fit background after render
    requestAnimationFrame(() => {
      try {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const t of txts) {
          const b = t.getBBox();
          minX = Math.min(minX, b.x);
          maxX = Math.max(maxX, b.x + b.width);
          minY = Math.min(minY, b.y);
          maxY = Math.max(maxY, b.y + b.height);
        }
        bg.setAttribute('x', minX - 6);
        bg.setAttribute('y', minY - 3);
        bg.setAttribute('width', maxX - minX + 12);
        bg.setAttribute('height', maxY - minY + 6);
      } catch (_) {}
    });
  }
}

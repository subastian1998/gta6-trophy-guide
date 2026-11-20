// Charts — the same progress numbers as the checklist, drawn as
// plain inline SVG (no library, no network, no canvas). Three charts:
//   1. A donut of the four grades: each ring segment is one grade's
//      share of the 55 trophies, coloured by how much of it is earned.
//   2. A horizontal bar per kind: earned against that kind's total.
//   3. A points ladder: points earned per grade against the points
//      that grade is worth (platinum 10, gold 5, silver 3, bronze 1).
// All three read the live earned set, so ticking a trophy anywhere
// redraws them. Every number comes from app/data/trophies.json.

const SVG_NS = "http://www.w3.org/2000/svg";
const GRADE_POINTS = { platinum: 10, gold: 5, silver: 3, bronze: 1 };
const GRADE_LABELS = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };
const GRADE_ORDER = ["platinum", "gold", "silver", "bronze"];
const KIND_LABELS = {
  story: "Story",
  missable: "Missable",
  collectibles: "Collectibles",
  activities: "Activities",
  robbery: "Robbery",
  combat: "Combat",
  money: "Money",
  completion: "100% completion",
  online: "Online",
};
const GRADE_COLORS = { platinum: "#7dd3fc", gold: "#fbbf24", silver: "#cbd5e1", bronze: "#d97706" };

// Grade totals and earned counts, in grade order.
export function gradeChartData(trophies, earned) {
  return GRADE_ORDER.map((g) => {
    const inGrade = trophies.filter((t) => t.grade === g);
    const got = inGrade.filter((t) => earned.has(t.name)).length;
    return {
      grade: g,
      label: GRADE_LABELS[g],
      total: inGrade.length,
      got,
      pct: inGrade.length === 0 ? 0 : Math.round((got / inGrade.length) * 100),
      color: GRADE_COLORS[g],
    };
  });
}

// Kind totals and earned counts, in checklist kind order.
export function kindChartData(trophies, earned) {
  return Object.keys(KIND_LABELS)
    .map((k) => {
      const inKind = trophies.filter((t) => t.kind === k);
      const got = inKind.filter((t) => earned.has(t.name)).length;
      return { kind: k, label: KIND_LABELS[k], total: inKind.length, got, pct: inKind.length === 0 ? 0 : Math.round((got / inKind.length) * 100) };
    })
    .filter((row) => row.total > 0);
}

// Points earned and points possible, per grade and overall.
export function pointsChartData(trophies, earned) {
  const rows = GRADE_ORDER.map((g) => {
    const inGrade = trophies.filter((t) => t.grade === g);
    const worth = inGrade.reduce((n, t) => n + (GRADE_POINTS[t.grade] ?? 1), 0);
    const got = inGrade
      .filter((t) => earned.has(t.name))
      .reduce((n, t) => n + (GRADE_POINTS[t.grade] ?? 1), 0);
    return { grade: g, label: GRADE_LABELS[g], worth, got, pct: worth === 0 ? 0 : Math.round((got / worth) * 100) };
  });
  const worthTotal = rows.reduce((n, r) => n + r.worth, 0);
  const gotTotal = rows.reduce((n, r) => n + r.got, 0);
  return { rows, worthTotal, gotTotal, pct: worthTotal === 0 ? 0 : Math.round((gotTotal / worthTotal) * 100) };
}

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs ?? {})) node.setAttribute(k, String(v));
  return node;
}

function htmlEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

// Donut: one arc per grade, sized by that grade's share of the 55,
// with the earned share in the grade colour and the rest as track.
// A polar-to-cartesian helper keeps the arc math in one place.
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function buildDonut(trophies, earned) {
  const data = gradeChartData(trophies, earned);
  const total = trophies.length;
  const wrap = htmlEl("figure", "chart-figure");
  wrap.append(htmlEl("figcaption", "chart-caption", "Trophies by grade — coloured slice is the earned share"));
  const svg = svgEl("svg", { class: "chart-donut", width: 220, height: 220, viewBox: "0 0 220 220", role: "img" });
  const cx = 110;
  const cy = 110;
  const r = 82;
  const track = svgEl("circle", { class: "donut-track", cx, cy, r, fill: "none" });
  svg.append(track);
  let angle = 0;
  for (const row of data) {
    if (row.total === 0) continue;
    const span = (row.total / total) * 360;
    const earnedSpan = (row.got / total) * 360;
    if (earnedSpan > 0.1) {
      const path = svgEl("path", {
        class: "donut-arc",
        d: arcPath(cx, cy, r, angle, angle + earnedSpan),
        stroke: row.color,
        fill: "none",
      });
      svg.append(path);
    }
    angle += span;
  }
  const center = svgEl("text", { class: "donut-center", x: cx, y: cy - 4, "text-anchor": "middle" });
  center.textContent = `${earned.size}/${total}`;
  const sub = svgEl("text", { class: "donut-sub", x: cx, y: cy + 18, "text-anchor": "middle" });
  sub.textContent = "earned";
  svg.append(center, sub);
  wrap.append(svg);
  const legend = htmlEl("ul", "chart-legend");
  for (const row of data) {
    const li = htmlEl("li", "legend-item");
    const swatch = htmlEl("span", "legend-swatch");
    swatch.style.background = row.color;
    li.append(swatch, htmlEl("span", null, `${row.label}: ${row.got}/${row.total} (${row.pct}%)`));
    legend.append(li);
  }
  wrap.append(legend);
  return wrap;
}

// Horizontal bars: one row per kind, bar length = earned share.
function buildKindBars(trophies, earned) {
  const data = kindChartData(trophies, earned);
  const wrap = htmlEl("figure", "chart-figure");
  wrap.append(htmlEl("figcaption", "chart-caption", "Earned by kind — bar length is the earned share of that kind"));
  const list = htmlEl("div", "chart-bars");
  for (const row of data) {
    const line = htmlEl("div", "chart-bar-row");
    line.append(htmlEl("span", "chart-bar-name", row.label));
    const track = htmlEl("div", "chart-bar-track");
    const fill = htmlEl("div", "chart-bar-fill");
    fill.style.width = `${row.pct}%`;
    track.append(fill);
    line.append(track);
    line.append(htmlEl("span", "chart-bar-count", `${row.got}/${row.total}`));
    list.append(line);
  }
  wrap.append(list);
  return wrap;
}

// Overall stacked bar: one horizontal bar for the whole list, split
// into four coloured segments — one per grade — each split into its
// earned part (solid) and its remaining part (pale). The bar reads
// left to right in grade order, platinum first, so the rarest
// trophies sit at the left end.
function buildOverallBar(trophies, earned) {
  const data = gradeChartData(trophies, earned);
  const total = trophies.length;
  const wrap = htmlEl("figure", "chart-figure");
  wrap.append(htmlEl("figcaption", "chart-caption",
    `The whole list in one bar — ${earned.size} of ${total} earned. Solid is earned, pale is still to go.`));
  const svg = svgEl("svg", { class: "chart-stack", width: 640, height: 64, viewBox: "0 0 640 64", role: "img" });
  const barY = 14;
  const barH = 26;
  const barW = 600;
  const x0 = 20;
  let x = x0;
  for (const row of data) {
    if (row.total === 0) continue;
    const segW = (row.total / total) * barW;
    const gotW = (row.got / total) * barW;
    if (gotW > 0) {
      svg.append(svgEl("rect", { class: "stack-got", x: x.toFixed(1), y: barY, width: gotW.toFixed(1), height: barH, fill: row.color }));
    }
    if (segW - gotW > 0) {
      svg.append(svgEl("rect", { class: "stack-left", x: (x + gotW).toFixed(1), y: barY, width: (segW - gotW).toFixed(1), height: barH, fill: row.color, opacity: 0.25 }));
    }
    const label = svgEl("text", { class: "stack-label", x: (x + segW / 2).toFixed(1), y: barY + barH + 16, "text-anchor": "middle" });
    label.textContent = `${row.label} ${row.got}/${row.total}`;
    svg.append(label);
    x += segW;
  }
  svg.append(svgEl("rect", { class: "stack-frame", x: x0, y: barY, width: barW, height: barH, fill: "none" }));
  wrap.append(svg);
  const note = htmlEl("p", "chart-note",
    "Bronze dominates the bar because there are 46 of them — clearing bronze is what moves the overall percentage. " +
    "The platinum segment is one trophy wide: it fills last, by itself.");
  wrap.append(note);
  return wrap;
}

// Points ladder: one row per grade, bar length = points earned share.
function buildPointsLadder(trophies, earned) {
  const data = pointsChartData(trophies, earned);
  const wrap = htmlEl("figure", "chart-figure");
  wrap.append(htmlEl("figcaption", "chart-caption",
    `Points — platinum 10, gold 5, silver 3, bronze 1. You have ${data.gotTotal} of ${data.worthTotal} points (${data.pct}%).`));
  const list = htmlEl("div", "chart-bars");
  for (const row of data.rows) {
    const line = htmlEl("div", "chart-bar-row");
    line.append(htmlEl("span", "chart-bar-name", row.label));
    const track = htmlEl("div", "chart-bar-track");
    const fill = htmlEl("div", "chart-bar-fill points-fill");
    fill.style.width = `${row.pct}%`;
    track.append(fill);
    line.append(track);
    line.append(htmlEl("span", "chart-bar-count", `${row.got}/${row.worth} pts`));
    list.append(line);
  }
  wrap.append(list);
  const note = htmlEl("p", "chart-note",
    "Bronze trophies are worth 1 point each, so the 46 bronze trophies hold most of the points — " +
    "the ladder fills fastest by clearing the long bronze tail.");
  wrap.append(note);
  return wrap;
}

export function renderCharts(root, { trophies, getEarned }) {
  function render() {
    const earned = getEarned();
    root.replaceChildren();
    root.append(htmlEl("p", "r4-intro",
      "Your progress drawn three ways. All three charts read the same earned set as the checklist, " +
      "so they move the moment you tick a trophy."));
    const grid = htmlEl("div", "chart-grid");
    grid.append(buildDonut(trophies, earned));
    grid.append(buildKindBars(trophies, earned));
    grid.append(buildPointsLadder(trophies, earned));
    grid.append(buildOverallBar(trophies, earned));
    root.append(grid);
  }
  render();
  return { render };
}

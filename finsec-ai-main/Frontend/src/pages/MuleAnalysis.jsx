// LinkAnalysis.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

/**
 * Force-directed customer network with incremental node creation & reuse.
 * - One node per unique customer (account id). Reuse if already created; otherwise create.
 * - For transaction at time T: anchorX(Account1)=x(T); anchorX(Account)=x(T)-OFFSET.
 * - Straight links (left → right by anchor design).
 * - Zoom/pan, drag nodes (nodes remain attracted to anchorX but can be moved).
 * - Node tooltip: aggregated info + recent tx list.
 * - Link tooltip: amount & currency + timestamp & banks.
 * - Suspected (repeat) nodes blink with a pulse ring.
 */

export default function MuleAnalysis({ data }) {
  // ===== Config =====
  const ONLY_IS_LAUNDERING = false;  // set true to include only Is Laundering === 1
  const REPEAT_THRESHOLD = 3;        // nodes with total tx appearances >= threshold blink as suspected
  const HEIGHT = 620;                // canvas height (width responsive)
  const SOURCE_X_OFFSET = 180;       // px left of target for first-seen source anchor
  const FORCE = {
    linkDistance: 110,
    linkStrength: 0.35,
    charge: -320,
    collideRadius: 22,
    xStrength: 0.25,  // how strongly nodes are pulled to anchorX
    yStrength: 0.06,  // slight vertical centering
  };

  // Colors
  const LINK_COLOR = "#8ab4f8";
  const NODE_FILL = "#ffd166";
  const SUSPECT_STROKE = "#ff6b6b";

  // State / refs
  const svgWrapRef = useRef(null);
  const simRef = useRef(null);
  const [hoverLinkId, setHoverLinkId] = useState(null);
  const [hoverNodeId, setHoverNodeId] = useState(null);

  // ===== Normalize & Build Graph Incrementally (REUSE NODES) =====
  const model = useMemo(() => {
    if (!Array.isArray(data)) return null;

    // Normalize one record
    const norm = (rec, idx) => {
      const g = (k) => rec[k] ?? rec[k?.trim()];
      const ts = String(g("Timestamp") || "");
      // Parse "DD-MM-YYYY HH:mm"
      const [d, m, y, hh, mm] = ts.replace(/\//g, "-").replace("  ", " ").trim().split(/[- :]/);
      const timestamp = new Date(+y, +m - 1, +d, +(hh ?? 0), +(mm ?? 0));
      const o = {
        id: `tx-${idx}`,
        timestamp,
        fromAccount: String(g("Account")),
        toAccount: String(g("Account1")),
        fromBank: String(g("From Bank")),
        toBank: String(g("To Bank ")),
        amountReceived: g("Amount Received "),
        amountPaid: g("Amount Paid"),
        receivingCurrency: g("Receiving Currency"),
        paymentCurrency: g("Payment Currency"),
        paymentFormat: g("Payment Format"),
        isLaundering: +g("Is Laundering") === 1,
      };
      o.currency = o.paymentCurrency || o.receivingCurrency || "Unknown";
      o.amount = o.amountPaid ?? o.amountReceived ?? null;
      return o;
    };

    // Sort transactions by time, then process sequentially
    const txAll = data.map(norm).filter((t) => (ONLY_IS_LAUNDERING ? t.isLaundering : true));
    const txns = [...txAll].sort((a, b) => +a.timestamp - +b.timestamp);
    const timeExtent = d3.extent(txns, (t) => t.timestamp);

    // Prepare scales for anchors (created later once we know width)
    // We'll compute anchorX AFTER we know width (in render hook), but we need build order & stats now.

    // Build / reuse nodes incrementally
    const nodeById = new Map();
    const links = [];

    // Stats per node
    const ensureNode = (acct) => {
      if (!nodeById.has(acct)) {
        nodeById.set(acct, {
          id: acct,
          label: acct,
          inCount: 0,
          outCount: 0,
          inflowSum: 0,
          outflowSum: 0,
          banks: new Set(),
          currencies: new Set(),
          txs: [],       // recent tx snapshots
          anchorXSeed: null, // a placeholder for time-based anchor (we store timestamps here)
          firstSeenTs: null, // first time we encountered this account
        });
      }
      return nodeById.get(acct);
    };

    for (const t of txns) {
      const src = ensureNode(t.fromAccount);
      const tgt = ensureNode(t.toAccount);

      // Update stats
      src.outCount++;
      tgt.inCount++;
      if (t.amountPaid != null) src.outflowSum += +t.amountPaid;
      if (t.amountReceived != null) tgt.inflowSum += +t.amountReceived;
      if (t.currency) { src.currencies.add(t.currency); tgt.currencies.add(t.currency); }
      src.banks.add(t.fromBank);
      tgt.banks.add(t.toBank);

      src.txs.push({ dir: "OUT", at: t.timestamp, peer: t.toAccount, bank: t.fromBank, amount: t.amountPaid ?? t.amount, pay: t.paymentCurrency, recv: t.receivingCurrency });
      tgt.txs.push({ dir: "IN",  at: t.timestamp, peer: t.fromAccount, bank: t.toBank, amount: t.amountReceived ?? t.amount, pay: t.paymentCurrency, recv: t.receivingCurrency });

      // FIRST time we see tgt as Account1 at time T → remember T for anchor
      if (tgt.firstSeenTs == null) tgt.firstSeenTs = t.timestamp;
      if (src.firstSeenTs == null) src.firstSeenTs = t.timestamp;

      // For anchoring rule we need both:
      //  - Account1 should anchor at x(T)
      //  - Account should anchor at x(T)-OFFSET
      // We'll store the timestamps per role for later: the latest sets only if still null (first time)
      if (tgt.anchorXSeed == null) tgt.anchorXSeed = { role: "to", ts: t.timestamp };
      if (src.anchorXSeed == null) src.anchorXSeed = { role: "from", ts: t.timestamp };

      // Link for this tx (pointing left→right by our anchor design)
      links.push({
        id: t.id,
        source: t.fromAccount,
        target: t.toAccount,
        amount: t.amount,
        currency: t.currency || "Unknown",
        timestamp: t.timestamp,
        raw: t,
      });
    }

    const nodes = Array.from(nodeById.values()).map((n) => ({
      ...n,
      txCount: n.inCount + n.outCount,
      banks: Array.from(n.banks),
      currencies: Array.from(n.currencies),
    }));

    // Suspected nodes
    const suspected = new Set(nodes.filter((n) => n.txCount >= REPEAT_THRESHOLD).map((n) => n.id));

    return { nodes, links, suspected, txns, timeExtent };
  }, [data]);

  if (!model) return null;
  const { nodes, links, suspected, txns, timeExtent } = model;

  // ===== Render Force-Directed Graph with Straight Links, Timeline Anchors =====
  useEffect(() => {
    if (!svgWrapRef.current || nodes.length === 0) return;
//  console.log(nodes.length)
    // if (nodes.length > 0) return;
    const width = svgWrapRef.current.clientWidth || 980;
    const height = HEIGHT;

    d3.select(svgWrapRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgWrapRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "graph-svg");

    const root = svg.append("g").attr("class", "root");

    // Zoom/Pan
    const zoom = d3.zoom().scaleExtent([0.25, 4]).on("zoom", (ev) => root.attr("transform", ev.transform));
    svg.call(zoom);

    // Time axis (bottom) for reference
    const MARGIN_X = { left: 32, right: 32 };
    const x = d3.scaleTime().domain(timeExtent).range([MARGIN_X.left, width - MARGIN_X.right]).nice();
    const axis = d3.axisBottom(x).ticks(6).tickSize(-height + 40).tickSizeOuter(0);
    root
      .append("g")
      .attr("class", "time-grid")
      .attr("transform", `translate(0,${height - 24})`)
      .call(axis);
    root.selectAll(".time-grid .tick line").attr("stroke", "#243249").attr("opacity", 0.35);
    root.selectAll(".time-grid .tick text").attr("fill", "var(--muted, #9fb1c7)");

    // Compute anchorX for each node based on how it first appeared
    // If first-seen role was 'to' at T: anchorX = x(T)
    // If first-seen role was 'from' at T: anchorX = x(T) - SOURCE_X_OFFSET
    const nodeAnchors = new Map();
    nodes.forEach((n) => {
      const seed = n.anchorXSeed; // { role, ts }
      let ax = x(n.firstSeenTs || timeExtent[0] || new Date());
      if (seed?.role === "from") ax = x(seed.ts) - SOURCE_X_OFFSET;
      if (seed?.role === "to")   ax = x(seed.ts);
      nodeAnchors.set(n.id, Math.max(MARGIN_X.left, Math.min(ax, width - MARGIN_X.right)));
    });

    // Force simulation
    simRef.current?.stop();
    const simNodes = nodes.map((n) => ({
      ...n,
      anchorX: nodeAnchors.get(n.id),
    }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(FORCE.linkDistance)
          .strength(FORCE.linkStrength)
      )
      .force("charge", d3.forceManyBody().strength(FORCE.charge))
      .force("collide", d3.forceCollide().radius(FORCE.collideRadius).iterations(2))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX((d) => d.anchorX).strength(FORCE.xStrength))
      .force("y", d3.forceY(height / 2).strength(FORCE.yStrength));
    simRef.current = simulation;

    // defs: arrowhead + glow
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 14)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "var(--link-color, #8ab4f8)");

    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Links (STRAIGHT LINES)
    const linkSel = root
      .selectAll(".link.tx")
      .data(links, (d) => d.id)
      .join("line")
      .attr("class", "link tx")
      .attr("stroke", LINK_COLOR)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)")
      .on("mouseenter", (_, d) => setHoverLinkId(d.id))
      .on("mouseleave", () => setHoverLinkId(null));

    // Nodes (customers with user icon)
    const nodeSel = root
      .selectAll(".node.customer")
      .data(simulation.nodes(), (d) => d.id)
      .join("g")
      .attr("class", (d) => `node customer ${suspected.has(d.id) ? "suspect blink" : ""}`)
      .call(
        d3
          .drag()
          .on("start", (ev, d) => {
            if (!ev.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end",  (ev, d) => { if (!ev.active) simulation.alphaTarget(0); })
      )
      .on("mouseenter", (_, d) => setHoverNodeId(d.id))
      .on("mouseleave", () => setHoverNodeId(null));

    // Node visuals
    const R = 12;
    nodeSel.append("circle").attr("class", "node-circle").attr("r", R).attr("fill", NODE_FILL);
    const icon = nodeSel.append("g").attr("class", "icon");
    icon.append("circle").attr("r", 3.6).attr("cy", -2.8).attr("fill", "#0b1020");
    icon.append("path").attr("d", "M -6 6 C -4 2, 4 2, 6 6 Z").attr("fill", "#0b1020");
    nodeSel
      .append("text")
      .attr("class", "node-label")
      .attr("y", -18)
      .attr("text-anchor", "middle")
      .text((d) => shorten(d.label, 10));

    // Pulse ring for suspected
    root.selectAll(".node.customer.blink").each(function () {
      const g = d3.select(this);
      if (g.select("circle.pulse").empty()) g.append("circle").attr("class", "pulse").attr("r", R + 2);
    });

    // Tooltip (one shared)
    const tip = d3.select(svgWrapRef.current).append("div").attr("class", "tooltip").style("opacity", 0);

    // Link tooltip (amount + currency + context)
    linkSel
      .on("mousemove", (ev, d) => {
        const amt = d.amount != null ? numberFmt(d.amount) : "-";
        const from = d.source.id ?? d.source;
        const to = d.target.id ?? d.target;
        tip
          .style("opacity", 1)
          .html(
            `
            <div><strong>${formatDate(d.timestamp)}</strong></div>
            <div>From: <b>Acct ${from}</b> → To: <b>Acct ${to}</b></div>
            <div>Amount: <b>${amt}</b></div>
            <div>Currency: <b>${d.currency ?? "Unknown"}</b></div>
            <div>Payment Currency: ${d.raw?.paymentCurrency ?? "-"}</div>
            <div>Receiving Currency: ${d.raw?.receivingCurrency ?? "-"}</div>
            <div>From Bank: ${d.raw?.fromBank ?? "-"}</div>
            <div>To Bank: ${d.raw?.toBank ?? "-"}</div>
            <div>Payment Format: ${d.raw?.paymentFormat ?? "-"}</div>
          `
          )
          .style("left", `${ev.offsetX + 14}px`)
          .style("top", `${ev.offsetY - 10}px`);
      })
      .on("mouseleave", () => tip.style("opacity", 0));

    // Node tooltip (aggregated details + recent tx)
    nodeSel
      .on("mousemove", (ev, d) => {
        const inflow = numberFmt(d.inflowSum ?? 0);
        const outflow = numberFmt(d.outflowSum ?? 0);
        const banks = (d.banks ?? []).join(", ") || "-";
        const currs = (d.currencies ?? []).join(", ") || "-";
        const recents = (d.txs ?? []).slice(-6).reverse();
        tip
          .style("opacity", 1)
          .html(
            `
            <div><strong>Acct ${d.id}</strong> ${suspected.has(d.id) ? `<span style="color:${SUSPECT_STROKE}">(Suspected)</span>` : ""}</div>
            <div>Tx Count: <b>${d.txCount ?? 0}</b> (In: ${d.inCount ?? 0}, Out: ${d.outCount ?? 0})</div>
            <div>Total Inflow: <b>${inflow}</b> | Total Outflow: <b>${outflow}</b></div>
            <div>First Seen: ${formatDate(d.firstSeenTs)}</div>
            <div>Banks: ${banks}</div>
            <div>Currencies: ${currs}</div>
            ${
              recents.length
                ? `<div style="margin-top:6px;"><u>Recent transactions</u></div>` +
                  recents
                    .map((r) => {
                      const amt = r.amount != null ? numberFmt(r.amount) : "-";
                      const arrow = r.dir === "OUT" ? "→" : "←";
                      const curr = r.pay || r.recv || "";
                      return `<div>${formatDate(r.at)} ${arrow} ${r.peer} | ${amt} ${curr}</div>`;
                    })
                    .join("")
                : ""
            }
          `
          )
          .style("left", `${ev.offsetX + 14}px`)
          .style("top", `${ev.offsetY - 10}px`);
      })
      .on("mouseleave", () => tip.style("opacity", 0));

    // TICK
    simulation.on("tick", () => {
      linkSel
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Hover classes
    linkSel.classed("hovered", (l) => l.id === hoverLinkId);
    nodeSel.classed("hovered", (n) => n.id === hoverNodeId);

    // Cleanup
    return () => simulation.stop();
  }, [nodes, links, suspected, timeExtent, hoverLinkId, hoverNodeId]);

  return (
    <div className="la-container">
      <div className="controls">
        <div className="legend">
          <span className="legend-item"><span className="dot user" /> Customer (user icon)</span>
          <span className="legend-item suspected"><span className="dot suspected" /> Suspected (blink)</span>
          <span className="legend-item link"><span className="dash" /> Straight Link (← left | right →)</span>
        </div>
      </div>

      {/* Graph */}
      <div className="graph" ref={svgWrapRef} style={{ width: "100%", height: HEIGHT }} />

      <style>{stylesCSS}</style>
    </div>
  );
}

// ===== Styles =====
const stylesCSS = `
:root {
  --bg: #0f1620;
  --panel: #151e2b;
  --text: #e7ecf3;
  --muted: #9fb1c7;
  --link-color: #8ab4f8;
  --dim: #2b3544;
  --accent: #22d3ee;
  --suspect: #ff6b6b;
}

.la-container {
  background: var(--bg);
  color: var(--text);
  border-radius: 10px;
  border: 1px solid #1f2a3a;
  padding: 10px;
  width: 100%;
}

.controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.legend { color: var(--muted); font-size: 12px; display: flex; gap: 18px; flex-wrap: wrap; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.legend .dot.user { width: 10px; height: 10px; border-radius: 50%; background: #ffd166; display: inline-block; }
.legend .dot.suspected { width: 10px; height: 10px; border-radius: 50%; background: var(--suspect); display: inline-block; }
.legend .dash { display:inline-block; width: 28px; height: 2px; background: var(--link-color); }

.graph {
  height: 620px;
  background: #0c1220;
  border: 1px solid #1b2433;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.graph-svg { width: 100%; height: 100%; }

.time-grid path, .time-grid line { stroke: #243249; }
.time-grid text { fill: var(--muted); font-size: 11px; }

.link.tx {
  stroke: var(--link-color);
  stroke-width: 2px;
  opacity: 0.95;
}
.link.tx.hovered { stroke: var(--accent); stroke-width: 3px; opacity: 1; }

.node .node-circle { stroke: #0d1220; stroke-width: 1px; }
.node .node-label { font-size: 11px; fill: var(--muted); pointer-events: none; }
.node .icon { pointer-events: none; }

.node.customer.hovered .node-circle { stroke: var(--accent); stroke-width: 2.4px; }

.node.customer.suspect .node-circle {
  filter: url(#glow);
  stroke: var(--suspect);
  stroke-width: 2px;
}

@keyframes pulseRing {
  0%   { r: 14; opacity: 0.9; stroke-width: 2px; }
  70%  { r: 24; opacity: 0;   stroke-width: 4px; }
  100% { r: 24; opacity: 0;   stroke-width: 4px; }
}
.node.customer.blink .pulse {
  fill: none;
  stroke: var(--suspect);
  animation: pulseRing 1.8s ease-out infinite;
}

.tooltip {
  position: absolute;
  background: rgba(15,22,32,0.96);
  color: var(--text);
  border: 1px solid #2a3a51;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
}
`;

// ===== Helpers =====
function shorten(s, n = 10) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
function formatDate(dt) {
  if (!(dt instanceof Date) || isNaN(+dt)) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
}
function numberFmt(v) {
  try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v); }
  catch { return String(v); }
}
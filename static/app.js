// static/app.js

// Node Coordinates on the vast canvas grid
const NODE_POSITIONS = {
  "control": { left: 50, top: 400 },
  "pipeline": { left: 480, top: 400 },
  "prospect-0": { left: 1380, top: 100 },
  "prospect-1": { left: 1380, top: 340 },
  "prospect-2": { left: 1380, top: 580 },
  "prospect-3": { left: 1380, top: 820 },
  "prospect-4": { left: 1380, top: 1060 },
  "pack": { left: 1720, top: 580 }
};

const MOCK_PLACEHOLDERS = [
  { id: "p0", name: "Prospect 1", company: "Awaiting outreach run...", title: "Awaiting outreach run...", fit_score: "--", status: "idle", signal_description: null },
  { id: "p1", name: "Prospect 2", company: "Awaiting outreach run...", title: "Awaiting outreach run...", fit_score: "--", status: "idle", signal_description: null },
  { id: "p2", name: "Prospect 3", company: "Awaiting outreach run...", title: "Awaiting outreach run...", fit_score: "--", status: "idle", signal_description: null },
  { id: "p3", name: "Prospect 4", company: "Awaiting outreach run...", title: "Awaiting outreach run...", fit_score: "--", status: "idle", signal_description: null },
  { id: "p4", name: "Prospect 5", company: "Awaiting outreach run...", title: "Awaiting outreach run...", fit_score: "--", status: "idle", signal_description: null }
];

// SVG Connection Wires Mapping (output port -> input port)
const CONNECTIONS = [
  { from: "control-out", to: "pipeline-in" },
  { from: "pipeline-out", to: "prospect-0-in" },
  { from: "pipeline-out", to: "prospect-1-in" },
  { from: "pipeline-out", to: "prospect-2-in" },
  { from: "pipeline-out", to: "prospect-3-in" },
  { from: "pipeline-out", to: "prospect-4-in" },
  { from: "prospect-0-out", to: "pack-in" },
  { from: "prospect-1-out", to: "pack-in" },
  { from: "prospect-2-out", to: "pack-in" },
  { from: "prospect-3-out", to: "pack-in" },
  { from: "prospect-4-out", to: "pack-in" }
];

// Canvas transforms state
let scale = 0.60;
let panX = 40;
let panY = 20;
let isDragging = false;
let startX, startY;

// Dragging individual nodes state
let draggedNode = null;
let dragStartX = 0;
let dragStartY = 0;
let nodeInitialLeft = 0;
let nodeInitialTop = 0;
let isSpacePressed = false;

// State management
let currentRunDate = null;
let currentProspects = [];
let selectedProspectId = null;
let currentTab = "connectionNote";
let runningStage = null;
let stageStatuses = {};

// ---------------- Helper Utilities ----------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/"/g, "&quot;");
}

function flashButton(btn, text) {
  const original = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1500);
}

// ---------------- DOM Initializer ----------------

document.addEventListener("DOMContentLoaded", () => {
  initNodePositions();
  initCanvas();
  fetchHistory();

  // Control panel events
  document.getElementById("run-pipeline-btn").addEventListener("click", runPipeline);
  document.getElementById("view-logs-btn").addEventListener("click", toggleLogPanel);
  document.getElementById("close-logs-btn").addEventListener("click", toggleLogPanel);
  
  // Drawer close
  document.getElementById("drawer-close-btn").addEventListener("click", closeDrawer);
  
  // Export Pack actions
  document.getElementById("copy-pack-btn").addEventListener("click", copyPack);
  document.getElementById("download-pack-btn").addEventListener("click", downloadPack);
  
  // Drawer actions
  document.getElementById("drawer-copy-btn").addEventListener("click", copyDossier);
  document.getElementById("drawer-download-btn").addEventListener("click", downloadDossier);

  // Restore and save security token
  const savedToken = localStorage.getItem("lead_agent_cron_secret");
  if (savedToken) {
    document.getElementById("f-cronSecret").value = savedToken;
  }
  document.getElementById("f-cronSecret").addEventListener("input", (e) => {
    localStorage.setItem("lead_agent_cron_secret", e.target.value.trim());
  });

  // Schedule settings
  fetchScheduleSettings();
  document.getElementById("save-schedule-btn").addEventListener("click", saveScheduleSettings);
});

// ---------------- Scheduler Actions ----------------

async function fetchScheduleSettings() {
  try {
    const res = await fetch("/api/schedule");
    if (!res.ok) throw new Error("Could not fetch schedule settings");
    const data = await res.json();
    if (data) {
      document.getElementById("sched-enabled").checked = !!data.enabled;
      document.getElementById("sched-frequency").value = data.frequency || "daily";
      document.getElementById("sched-time").value = data.time || "09:00";
      document.getElementById("sched-email").value = data.email || "shivamsingh0013@gmail.com";
    }
  } catch (err) {
    console.error("Error fetching schedule settings:", err);
  }
}

async function saveScheduleSettings() {
  const btn = document.getElementById("save-schedule-btn");
  const originalText = btn.textContent;
  
  const enabled = document.getElementById("sched-enabled").checked;
  const frequency = document.getElementById("sched-frequency").value;
  const time = document.getElementById("sched-time").value;
  const email = document.getElementById("sched-email").value.trim();
  
  // Validate email if enabled
  if (enabled && !email) {
    alert("Please enter a notification email address if scheduling is enabled.");
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }
  
  btn.disabled = true;
  btn.textContent = "Saving...";
  
  try {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${val("f-cronSecret")}`
      },
      body: JSON.stringify({ enabled, frequency, time, email })
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Could not save schedule");
    }
    
    btn.textContent = "✓ Settings Saved";
    btn.style.backgroundColor = "var(--success)";
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.style.backgroundColor = "";
    }, 2000);
    
  } catch (err) {
    console.error(err);
    alert(`Error saving schedule: ${err.message}`);
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ---------------- Canvas Zoom & Pan Engine ----------------

function initNodePositions() {
  // Set positions from map
  for (const [key, pos] of Object.entries(NODE_POSITIONS)) {
    const el = document.getElementById(`node-${key}`);
    if (el) {
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
    }
  }
}

function initCanvas() {
  const viewport = document.getElementById("canvas-viewport");
  
  // Set initial cursor style on viewport to look draggable
  viewport.style.cursor = "grab";
  updateTransform();

  // 1. Spacebar to drag (Figma style Hand Tool)
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }
      e.preventDefault();
      if (!isSpacePressed) {
        isSpacePressed = true;
        viewport.style.cursor = "grab";
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      isSpacePressed = false;
      viewport.style.cursor = isDragging ? "grabbing" : "grab";
    }
  });

  // 2. Mouse Down - Canvas panning (Figma style) or node dragging
  viewport.addEventListener("mousedown", (e) => {
    const isMiddleClick = (e.button === 1);
    const isLeftClick = (e.button === 0);

    // If middle click or holding space, pan the screen
    if (isMiddleClick || (isLeftClick && isSpacePressed)) {
      e.preventDefault();
      isDragging = true;
      viewport.style.cursor = "grabbing";
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      return;
    }

    if (!isLeftClick) return;

    // Check if clicking node header to drag card
    const header = e.target.closest(".node-header, .prospect-card-header");
    if (header) {
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea")) {
        return;
      }
      const node = header.closest(".canvas-node");
      if (node) {
        draggedNode = node;
        draggedNode.classList.add("dragging");
        nodeInitialLeft = parseFloat(draggedNode.style.left) || 0;
        nodeInitialTop = parseFloat(draggedNode.style.top) || 0;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
    }

    // Click background to pan canvas
    if (
      e.target.closest(".canvas-node") ||
      e.target.closest(".canvas-controls") ||
      e.target.closest(".site-header") ||
      e.target.closest(".site-footer") ||
      e.target.closest(".output-drawer") ||
      e.target.closest(".log-panel")
    ) {
      return;
    }
    
    // Close output drawer if clicking background
    const drawer = document.getElementById("output-drawer");
    if (drawer && drawer.classList.contains("open")) {
      closeDrawer();
    }
    
    isDragging = true;
    viewport.style.cursor = "grabbing";
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  });

  // 3. Mouse Move
  window.addEventListener("mousemove", (e) => {
    if (draggedNode) {
      const dx = (e.clientX - dragStartX) / scale;
      const dy = (e.clientY - dragStartY) / scale;
      draggedNode.style.left = `${nodeInitialLeft + dx}px`;
      draggedNode.style.top = `${nodeInitialTop + dy}px`;
      drawWires();
    } else if (isDragging) {
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    }
  });

  // 4. Mouse Up
  window.addEventListener("mouseup", () => {
    if (draggedNode) {
      draggedNode.classList.remove("dragging");
      const key = draggedNode.id.replace("node-", "");
      if (NODE_POSITIONS[key]) {
        NODE_POSITIONS[key].left = parseFloat(draggedNode.style.left);
        NODE_POSITIONS[key].top = parseFloat(draggedNode.style.top);
      }
      draggedNode = null;
    }
    if (isDragging) {
      isDragging = false;
      viewport.style.cursor = "grab";
    }
  });

  // 5. Wheel Zoom & Trackpad Pan (Figma style)
  viewport.addEventListener("wheel", (e) => {
    // Zoom on Ctrl/Cmd + scroll or pinch-to-zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Optimized trackpad pinch-zoom calculation
      const sensitivity = 0.0035;
      const factor = 1 - e.deltaY * sensitivity;
      // Clamped zoom factor step for quick yet controllable scaling
      const zoomFactor = Math.min(1.15, Math.max(0.85, factor));
      
      const oldScale = scale;
      let newScale = Math.min(2.0, Math.max(0.15, scale * zoomFactor));
      
      // Zoom relative to cursor position
      panX = mouseX - (mouseX - panX) * (newScale / oldScale);
      panY = mouseY - (mouseY - panY) * (newScale / oldScale);
      scale = newScale;
      updateTransform();
    } else {
      // Normal panning on scroll
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + scroll pans horizontally
        panX -= e.deltaY;
      } else {
        // Two-finger scroll pans dynamically
        panX -= e.deltaX;
        panY -= e.deltaY;
      }
      updateTransform();
    }
  }, { passive: false });

  // 6. Zoom Button Handlers
  document.getElementById("ctrl-zoom-in").addEventListener("click", () => {
    scale = Math.min(2.0, scale + 0.08);
    updateTransform();
  });
  
  document.getElementById("ctrl-zoom-out").addEventListener("click", () => {
    scale = Math.max(0.25, scale - 0.08);
    updateTransform();
  });
  
  document.getElementById("ctrl-zoom-reset").addEventListener("click", () => {
    scale = 0.60;
    panX = 40;
    panY = 20;
    updateTransform();
  });
  
  document.getElementById("ctrl-zoom-fit").addEventListener("click", () => {
    scale = 0.40;
    panX = 10;
    panY = 30;
    updateTransform();
  });
}

function updateTransform() {
  const container = document.getElementById("canvas-container");
  if (container) {
    container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }
  drawWires();
}

// ---------------- SVG Connection Wires drawing ----------------

function drawWires() {
  const svg = document.getElementById("canvas-svg");
  if (!svg) return;

  const container = document.getElementById("canvas-container");
  const containerRect = container.getBoundingClientRect();

  // Clear previous paths
  svg.innerHTML = "";

  CONNECTIONS.forEach((conn, index) => {
    const elFrom = document.querySelector(`[data-port="${conn.from}"]`);
    const elTo = document.querySelector(`[data-port="${conn.to}"]`);

    if (!elFrom || !elTo) return;

    const rFrom = elFrom.getBoundingClientRect();
    const rTo = elTo.getBoundingClientRect();

    // Absolute position within canvas workspace grid
    const x1 = (rFrom.left + rFrom.width / 2 - containerRect.left) / scale;
    const y1 = (rFrom.top + rFrom.height / 2 - containerRect.top) / scale;
    const x2 = (rTo.left + rTo.width / 2 - containerRect.left) / scale;
    const y2 = (rTo.top + rTo.height / 2 - containerRect.top) / scale;

    const dx = Math.abs(x2 - x1) * 0.45;
    const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "wire");
    path.setAttribute("id", `wire-${index}`);

    // Check states to animate wires
    const isRunning = runningStage !== null;
    const fromType = conn.from;
    const toType = conn.to;
    
    if (isRunning) {
      if (fromType === "control-out" && toType === "pipeline-in") {
        path.classList.add("active");
      } else if (fromType === "pipeline-out" && toType.startsWith("prospect-")) {
        path.classList.add("active");
      }
    } else if (currentProspects.length > 0) {
      // Completed wire look
      path.classList.add("completed");
    }

    svg.appendChild(path);
  });
}

// ---------------- Log and Monitor panels ----------------

function toggleLogPanel() {
  const panel = document.getElementById("log-panel");
  panel.classList.toggle("open");
}

function updateLogConsole(text) {
  const out = document.getElementById("log-output");
  if (out) {
    out.textContent += text + "\n";
    out.scrollTop = out.scrollHeight;
  }
}

function clearLogConsole() {
  const out = document.getElementById("log-output");
  if (out) out.textContent = "";
}

function updatePipelineStageDots(stageCode, status) {
  // Translate stage label to step element ID
  // e.g. "STAGE 01" -> "step-01"
  const stepId = "step-" + stageCode.split(" ")[1];
  const stepEl = document.getElementById(stepId);
  if (stepEl) {
    // Clear previous state classes
    stepEl.classList.remove("idle", "running", "done", "error", "skipped");
    stepEl.classList.add(status);
  }
}

function resetPipelineStageDots() {
  document.querySelectorAll(".stage-step").forEach((step) => {
    step.classList.remove("running", "done", "error", "skipped");
    step.classList.add("idle");
  });
}

// ---------------- API Actions ----------------

async function fetchHistory() {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) throw new Error("Could not fetch history");
    const data = await res.json();
    
    if (data && data.length > 0) {
      const latestRun = data[0];
      currentRunDate = latestRun.run_date;
      
      // Update metadata only
      document.getElementById("meta-last-run").textContent = `${latestRun.run_date} ${latestRun.started_at.slice(11, 16)} UTC`;
    }
  } catch (err) {
    console.error(err);
  }
  
  // Render placeholder cards on initial load
  currentProspects = MOCK_PLACEHOLDERS;
  renderProspects();
  updatePackHub();
  resetPipelineStageDots();
  drawWires();
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runPipelineSimulation(data) {
  const prospects = data.prospects || [];
  const logs = data.stageLog || [];
  
  // Set placeholders to discovery status at start of simulation
  currentProspects = MOCK_PLACEHOLDERS.map(p => ({
    ...p,
    status: "processing_discovery"
  }));
  renderProspects();
  resetPipelineStageDots();
  drawWires();
  
  const getStageLog = (stage) => logs.find(l => l.stage === stage);

  // --- STAGE 1: Discovery ---
  runningStage = "STAGE 01";
  updatePipelineStageDots("STAGE 01", "running");
  drawWires();
  const log1 = getStageLog("STAGE 01");
  if (log1) {
    updateLogConsole(`[STAGE 01] RUNNING - ${log1.details}`);
  }
  await delay(1200);
  updatePipelineStageDots("STAGE 01", "done");
  if (log1) {
    updateLogConsole(`[STAGE 01] DONE (${log1.durationMs.toFixed(0)}ms)`);
  }

  // Set placeholders to scoring status
  currentProspects = MOCK_PLACEHOLDERS.map(p => ({
    ...p,
    status: "processing_scoring"
  }));
  renderProspects();

  // --- STAGE 2: Scoring ---
  runningStage = "STAGE 02";
  updatePipelineStageDots("STAGE 02", "running");
  drawWires();
  const log2 = getStageLog("STAGE 02");
  if (log2) {
    updateLogConsole(`[STAGE 02] RUNNING - ${log2.details}`);
  }
  await delay(1200);
  updatePipelineStageDots("STAGE 02", "done");
  if (log2) {
    updateLogConsole(`[STAGE 02] DONE (${log2.durationMs.toFixed(0)}ms)`);
  }
  
  // Render prospects in S2 (Initial Discovery + Scoring stage complete)
  currentRunDate = data.runDate;
  currentProspects = prospects.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company,
    fit_score: p.fit_score,
    title: p.title,
    status: "processing_research",
    signal_description: null
  }));
  renderProspects();

  // --- STAGE 3: Research ---
  runningStage = "STAGE 03";
  updatePipelineStageDots("STAGE 03", "running");
  drawWires();
  const log3 = getStageLog("STAGE 03");
  if (log3) {
    updateLogConsole(`[STAGE 03] RUNNING - ${log3.details}`);
  }
  await delay(1200);
  updatePipelineStageDots("STAGE 03", "done");
  if (log3) {
    updateLogConsole(`[STAGE 03] DONE (${log3.durationMs.toFixed(0)}ms)`);
  }
  
  // Update to show Research complete
  currentProspects = prospects.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company,
    fit_score: p.fit_score,
    title: p.title,
    status: "processing_signal_extraction",
    signal_description: null
  }));
  renderProspects();

  // --- STAGE 4: Signal ---
  runningStage = "STAGE 04";
  updatePipelineStageDots("STAGE 04", "running");
  drawWires();
  const log4 = getStageLog("STAGE 04");
  if (log4) {
    updateLogConsole(`[STAGE 04] RUNNING - ${log4.details}`);
  }
  await delay(1200);
  updatePipelineStageDots("STAGE 04", "done");
  if (log4) {
    updateLogConsole(`[STAGE 04] DONE (${log4.durationMs.toFixed(0)}ms)`);
  }
  
  // Update to show Signal extraction complete
  currentProspects = prospects.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company,
    fit_score: p.fit_score,
    title: p.title,
    status: "processing_use_case",
    signal_description: p.signal_description
  }));
  renderProspects();

  // --- STAGE 5: Use-Case ---
  runningStage = "STAGE 05";
  updatePipelineStageDots("STAGE 05", "running");
  drawWires();
  const log5 = getStageLog("STAGE 05");
  if (log5) {
    updateLogConsole(`[STAGE 05] RUNNING - ${log5.details}`);
  }
  await delay(1200);
  updatePipelineStageDots("STAGE 05", "done");
  if (log5) {
    updateLogConsole(`[STAGE 05] DONE (${log5.durationMs.toFixed(0)}ms)`);
  }
  
  // Update to show Use-Case matching complete
  currentProspects = prospects.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company,
    fit_score: p.fit_score,
    title: p.title,
    status: "processing_outreach_drafts",
    signal_description: p.signal_description
  }));
  renderProspects();

  // --- STAGE 6: Drafting ---
  runningStage = "STAGE 06";
  updatePipelineStageDots("STAGE 06", "running");
  drawWires();
  const log6 = getStageLog("STAGE 06");
  if (log6) {
    updateLogConsole(`[STAGE 06] RUNNING - ${log6.details}`);
  }
  await delay(1200);
  updatePipelineStageDots("STAGE 06", "done");
  if (log6) {
    updateLogConsole(`[STAGE 06] DONE (${log6.durationMs.toFixed(0)}ms)`);
  }
  
  // Update to show Drafting complete
  currentProspects = prospects.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company,
    fit_score: p.fit_score,
    title: p.title,
    status: "processing_safety_audit",
    signal_description: p.signal_description
  }));
  renderProspects();

  // --- STAGE 7: Quality ---
  runningStage = "STAGE 07";
  updatePipelineStageDots("STAGE 07", "running");
  drawWires();
  const log7 = getStageLog("STAGE 07");
  if (log7) {
    updateLogConsole(`[STAGE 07] RUNNING - ${log7.details}`);
  }
  await delay(1200);
  updatePipelineStageDots("STAGE 07", "done");
  if (log7) {
    updateLogConsole(`[STAGE 07] DONE (${log7.durationMs.toFixed(0)}ms)`);
  }

  // --- Final Render (Everything Done!) ---
  currentProspects = prospects;
  runningStage = null;
  renderProspects();
  updatePackHub();
  
  updateLogConsole("🎉 [Pipeline Complete] Surfaced prospects written to local JSON storage.");
}

async function runPipeline() {
  const btn = document.getElementById("run-pipeline-btn");
  btn.disabled = true;
  btn.textContent = "Agent Running...";
  
  clearLogConsole();
  resetPipelineStageDots();
  runningStage = "STAGE 01";
  drawWires();
  
  // Open logs drawer automatically
  document.getElementById("log-panel").classList.add("open");
  updateLogConsole("🎬 [Pipeline Initiated] Starting 7-stage personalization run...");

  const linkedinUrls = val("f-linkedinUrls");
  const csvData = val("f-csv");
  
  const payload = {
    trigger: "manual",
    manualInputs: {
      linkedinUrlsOrPastedActivity: linkedinUrls,
      crmLeadListCsv: csvData
    }
  };

  try {
    const headers = { "Content-Type": "application/json" };
    const cronSecret = val("f-cronSecret");
    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }
    
    // Stage updates will be simulated in the log console via the fetch return
    const res = await fetch("/api/run-pipeline", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Server pipeline error");
    }
    
    const data = await res.json();
    
    if (data.ok) {
      await runPipelineSimulation(data);
    } else {
      throw new Error(data.error || "Execution terminated unexpectedly.");
    }
    
  } catch (err) {
    updateLogConsole(`❌ [Fatal Pipeline Error] Run failed: ${err.message}`);
    alert(`Pipeline Run Failed: ${err.message}`);
  } finally {
    runningStage = null;
    btn.disabled = false;
    btn.textContent = "Start Outreach Agent";
    drawWires();
  }
}

// ---------------- Prospects Rendering ----------------

function renderProspects() {
  const container = document.getElementById("prospects-canvas-area");
  // Remove old prospect nodes
  document.querySelectorAll(".prospect-node").forEach(n => n.remove());
  
  currentProspects.forEach((p, index) => {
    const nodeKey = `prospect-${index}`;
    const pos = NODE_POSITIONS[nodeKey];
    
    // Create card node element
    const card = document.createElement("section");
    card.className = "canvas-node prospect-node";
    card.id = `node-${nodeKey}`;
    card.style.left = `${pos.left}px`;
    card.style.top = `${pos.top}px`;
    
    // Input Port
    const portIn = document.createElement("div");
    portIn.className = "port port-in";
    portIn.dataset.port = `${nodeKey}-in`;
    portIn.title = "Prospect Input";
    card.appendChild(portIn);
    
    // Output Port
    const portOut = document.createElement("div");
    portOut.className = "port port-out";
    portOut.dataset.port = `${nodeKey}-out`;
    portOut.title = "Prospect Output";
    card.appendChild(portOut);
    
    // Card header
    const header = document.createElement("div");
    header.className = "prospect-card-header";
    
    const titleBlock = document.createElement("div");
    titleBlock.className = "prospect-title-block";
    titleBlock.innerHTML = `
      <h4>${escapeHtml(p.name)}</h4>
      <p>${escapeHtml(p.company)}</p>
    `;
    header.appendChild(titleBlock);
    
    const fitPill = document.createElement("span");
    fitPill.className = "fit-pill";
    fitPill.textContent = `Fit ${p.fit_score || 0}`;
    header.appendChild(fitPill);
    
    card.appendChild(header);
    
    // Body details
    const body = document.createElement("div");
    body.className = "prospect-meta-details";
    
    let signalHtml = "";
    if (p.status !== "needs_manual_research" && p.signal_description) {
      signalHtml = `<p class="prospect-signal-snippet" title="${escapeHtml(p.signal_description)}">Signal: ${escapeHtml(p.signal_description)}</p>`;
    }
    
    let statusClass = p.status;
    let statusText = p.status.replace(/_/g, " ");
    statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1);
    
    if (p.status.startsWith("processing_")) {
      statusClass = "processing";
      statusText = "Processing " + p.status.replace("processing_", "");
      statusText = statusText.replace(/_/g, " ");
      statusText = statusText.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    body.innerHTML = `
      <div>Role: ${escapeHtml(p.title)}</div>
      ${signalHtml}
      <div class="prospect-status-badge">
        <span class="status-dot ${statusClass}"></span>
        <span>${statusText}</span>
      </div>
    `;
    card.appendChild(body);
    
    // Open action button
    const actions = document.createElement("div");
    actions.className = "prospect-card-actions";
    
    const openBtn = document.createElement("button");
    openBtn.className = "btn btn-small btn-primary";
    openBtn.textContent = "Open ▾";
    
    const isPlaceholder = p.id.startsWith("p") || p.status === "idle" || p.status === "processing_discovery" || p.status === "processing_scoring";
    if (isPlaceholder) {
      openBtn.addEventListener("click", () => openEmptyDrawer());
    } else {
      openBtn.addEventListener("click", () => openDrawer(p.id));
    }
    actions.appendChild(openBtn);
    
    card.appendChild(actions);
    container.appendChild(card);
  });
  
  drawWires();
  updateDrawerToggleButton();
}

function updatePackHub() {
  const summaryEl = document.getElementById("pack-summary-text");
  const copyBtn = document.getElementById("copy-pack-btn");
  const dlBtn = document.getElementById("download-pack-btn");
  
  // Check if we are still showing only mock placeholders
  const isMock = currentProspects.length === 0 || currentProspects.every(p => p.id.startsWith("p"));
  if (isMock) {
    summaryEl.textContent = "No personalized drafts generated yet. Start the agent to create your campaign pack.";
    copyBtn.disabled = true;
    dlBtn.disabled = true;
    return;
  }
  
  const total = currentProspects.length;
  const approved = currentProspects.filter(p => p.status === "approved" || p.status === "edited_approved").length;
  const needsReview = currentProspects.filter(p => p.status === "needs_review").length;
  const rejected = currentProspects.filter(p => p.status === "rejected").length;
  const manualRes = currentProspects.filter(p => p.status === "needs_manual_research").length;
  
  summaryEl.innerHTML = `
    <strong>Campaign Pack — ${currentRunDate}</strong><br/>
    Total leads processed: ${total}<br/>
    ● Ready to Send: ${approved} · ● For Review: ${needsReview}<br/>
    ● Skipped/Rejected: ${rejected} · ● Need Manual Review: ${manualRes}
  `;
  
  copyBtn.disabled = false;
  dlBtn.disabled = false;
}

// ---------------- Drawer Actions ----------------

function updateDrawerToggleButton() {
  const toggleBtn = document.getElementById("floating-drawer-toggle");
  const drawer = document.getElementById("output-drawer");
  if (!toggleBtn) return;
  
  if (drawer && drawer.classList.contains("open")) {
    toggleBtn.style.display = "none";
  } else {
    toggleBtn.style.display = "flex";
    toggleBtn.onclick = () => {
      const realProspects = currentProspects.filter(p => !p.id.startsWith("p"));
      if (realProspects.length > 0) {
        const targetId = selectedProspectId || realProspects[0].id;
        openDrawer(targetId);
      } else {
        openEmptyDrawer();
      }
    };
  }
}

function openEmptyDrawer() {
  const drawer = document.getElementById("output-drawer");
  if (!drawer) return;
  
  document.getElementById("drawer-title").textContent = "Outreach Console";
  document.getElementById("drawer-subtitle").textContent = "Awaiting Agent Run";
  
  const navContainer = document.getElementById("drawer-nav-pills");
  if (navContainer) navContainer.innerHTML = "";
  
  const body = document.getElementById("drawer-body");
  if (body) {
    body.innerHTML = `
      <div class="drawer-empty-state" style="padding: 80px 24px; text-align: center; color: var(--ink-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div style="font-size: 3.5rem; margin-bottom: 24px; filter: drop-shadow(0 0 16px rgba(38, 166, 154, 0.2));">✉️</div>
        <h3 style="color: var(--ink); margin-bottom: 16px; font-size: 1.4rem; font-weight: 600; letter-spacing: -0.01em;">Outreach Console is Empty</h3>
        <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 32px; max-width: 440px; color: var(--ink-muted);">
          Personalized outreach messages and research dossiers will appear here once the agent runs. Start the agent to automatically build your customized campaign.
        </p>
        <button class="btn btn-primary" onclick="closeDrawer(); document.getElementById('run-pipeline-btn').click();" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; font-weight: 600; font-size: 0.9rem; border-radius: var(--radius); cursor: pointer; transition: all 0.2s ease;">
          <span>⚡</span> Start Outreach Agent
        </button>
      </div>
    `;
  }
  
  document.getElementById("drawer-copy-btn").disabled = true;
  document.getElementById("drawer-copy-btn").style.opacity = "0.4";
  document.getElementById("drawer-download-btn").disabled = true;
  document.getElementById("drawer-download-btn").style.opacity = "0.4";
  
  drawer.classList.add("open");
  updateDrawerToggleButton();
}

function renderDrawerNav(selectedId) {
  const container = document.getElementById("drawer-nav-pills");
  if (!container) return;
  container.innerHTML = "";
  
  currentProspects.forEach(p => {
    const pill = document.createElement("button");
    pill.className = `drawer-nav-pill ${p.id === selectedId ? 'active' : ''}`;
    
    // Extract initials (e.g. Jordan Lee -> JL)
    const parts = p.name.split(" ");
    const initials = parts.map(part => part[0] || "").join("").toUpperCase();
    
    pill.textContent = initials;
    pill.title = `${p.name} (${p.company})`;
    pill.addEventListener("click", () => openDrawer(p.id));
    container.appendChild(pill);
  });
}

function openDrawer(prospectId) {
  selectedProspectId = prospectId;
  const prospect = currentProspects.find(p => p.id === prospectId);
  if (!prospect) return;
  
  // Set title
  document.getElementById("drawer-title").textContent = prospect.name;
  document.getElementById("drawer-subtitle").textContent = `${prospect.title} at ${prospect.company}`;
  
  renderDrawerBody(prospect);
  renderDrawerNav(prospectId);
  
  // Open sliding container
  const drawer = document.getElementById("output-drawer");
  if (drawer) {
    drawer.classList.add("open");
  }
  
  // Re-enable footer buttons
  document.getElementById("drawer-copy-btn").disabled = false;
  document.getElementById("drawer-copy-btn").style.opacity = "";
  document.getElementById("drawer-download-btn").disabled = false;
  document.getElementById("drawer-download-btn").style.opacity = "";
  
  updateDrawerToggleButton();
}

function closeDrawer() {
  const drawer = document.getElementById("output-drawer");
  if (drawer) {
    drawer.classList.remove("open");
  }
  updateDrawerToggleButton();
}

function renderDrawerBody(p) {
  const body = document.getElementById("drawer-body");
  body.innerHTML = "";
  
  const linkedinUrl = p.linkedin_url;
  const email = p.email;

  const linkedinHtml = linkedinUrl 
    ? `<a href="${escapeHtml(linkedinUrl)}" target="_blank">${escapeHtml(linkedinUrl)} ↗</a>` 
    : `<span class="contact-missing">Not found</span>`;
    
  const emailHtml = email 
    ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` 
    : `<span class="contact-missing">Not found</span>`;

  const contactSection = `
    <div class="inspector-section">
      <h4>Contact Details</h4>
      <div class="inspector-grid" style="margin-top: 8px;">
        <div class="meta-box" style="display: flex; flex-direction: column; justify-content: center; min-height: 52px; word-break: break-all;">
          <div class="lbl" style="margin-bottom: 2px;">LinkedIn Profile</div>
          <div style="font-size: 0.9rem; font-weight: 500;">${linkedinHtml}</div>
        </div>
        <div class="meta-box" style="display: flex; flex-direction: column; justify-content: center; min-height: 52px; word-break: break-all;">
          <div class="lbl" style="margin-bottom: 2px;">Official Email ID</div>
          <div style="font-size: 0.9rem; font-weight: 500;">${emailHtml}</div>
        </div>
      </div>
    </div>
  `;

  if (p.status === "needs_manual_research") {
    body.innerHTML = `
      <div class="inspector-section">
        <h4>🚨 Needs Manual Research</h4>
        <p>This prospect was flagged during research enrichment.</p>
        <blockquote style="border-left-color: var(--error); background: var(--error-soft);">
          <strong>Reason:</strong> ${escapeHtml(p.risk_notes)}
        </blockquote>
      </div>
      
      ${contactSection}
      
      <div class="inspector-section">
        <h4>Original Discovery Source</h4>
        <ul class="source-list">
          ${p.sources.map(s => `<li><a href="${s}" target="_blank">${escapeHtml(s)} ↗</a></li>`).join("")}
        </ul>
      </div>
      
      <div class="action-status-block">
        <div><strong>Status:</strong> Marked Needs Research</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-small" onclick="updateStatus('approved')">Approve Anyway</button>
          <button class="btn btn-small" onclick="updateStatus('rejected')">Reject</button>
        </div>
      </div>
    `;
    return;
  }
  
  // Standard dossier layout
  const signalsSection = `
    <div class="inspector-section">
      <h4>Personalization Signal (${escapeHtml(p.signal_type)})</h4>
      <p><strong>Date:</strong> ${escapeHtml(p.signal_date)}</p>
      <blockquote>"${escapeHtml(p.signal_description)}"</blockquote>
      <p style="margin-top: 6px;">
        <strong>Verified Source:</strong> <a href="${p.signal_source_url}" target="_blank">${escapeHtml(p.signal_source_url)} ↗</a>
      </p>
    </div>
  `;
  
  const metricsSection = `
    <div class="inspector-section inspector-grid">
      <div class="meta-box">
        <div class="val">${p.fit_score}/100</div>
        <div class="lbl">Fit Score</div>
      </div>
      <div class="meta-box">
        <div class="val">${p.confidence_score}/100</div>
        <div class="lbl">Confidence Score</div>
      </div>
    </div>
  `;
  
  const strategicSection = `
    <div class="inspector-section">
      <h4>Strategic Alignment</h4>
      <p><strong>Primary Use Case:</strong> ${escapeHtml(p.primary_use_case)}</p>
      ${p.secondary_use_case ? `<p><strong>Secondary Use Case:</strong> ${escapeHtml(p.secondary_use_case)}</p>` : ""}
      <p style="margin-top:8px;"><strong>Hypothesized Pain Point:</strong> ${escapeHtml(p.pain_hypothesis)}</p>
      <p style="margin-top:4px;"><strong>Relevance Reasoning:</strong> ${escapeHtml(p.why_relevant)}</p>
    </div>
  `;
  
  // Outreach tabbed drafts
  const msg = p.outreach_messages || {};
  const connectionNote = msg.connectionNote?.text || "";
  const followUp = msg.followUpMessage?.text || "";
  const emailSubject = msg.coldEmail?.subject || "";
  const emailText = msg.coldEmail?.text || "";
  const followUp2 = msg.followUpDraft2?.text || "";
  
  const outreachSection = `
    <div class="inspector-section">
      <h4>Generated Outreach Drafts</h4>
      <div class="outreach-tabs">
        <button class="outreach-tab-btn active" id="tab-btn-conn" onclick="switchTab('connectionNote')">Connection Note</button>
        <button class="outreach-tab-btn" id="tab-btn-follow" onclick="switchTab('followUp')">Follow-Up</button>
        <button class="outreach-tab-btn" id="tab-btn-email" onclick="switchTab('email')">Cold Email</button>
        <button class="outreach-tab-btn" id="tab-btn-follow2" onclick="switchTab('followUp2')">Follow-Up Alternate</button>
      </div>
      
      <div class="tab-content" id="tab-conn">
        <p style="font-size:0.75rem; color:var(--ink-muted); margin-bottom: 4px;">Limit: 300 Characters</p>
        <textarea class="outreach-textarea" id="edit-connectionNote" oninput="markAsEdited()">${escapeHtml(connectionNote)}</textarea>
      </div>
      <div class="tab-content" id="tab-follow" style="display:none;">
        <p style="font-size:0.75rem; color:var(--ink-muted); margin-bottom: 4px;">Target: 80-120 Words</p>
        <textarea class="outreach-textarea" id="edit-followUp" oninput="markAsEdited()">${escapeHtml(followUp)}</textarea>
      </div>
      <div class="tab-content" id="tab-email" style="display:none;">
        <div class="field" style="margin-bottom:8px;">
          <span>Subject:</span>
          <input type="text" id="edit-email-subject" value="${escapeHtml(emailSubject)}" oninput="markAsEdited()"/>
        </div>
        <textarea class="outreach-textarea" id="edit-email" oninput="markAsEdited()">${escapeHtml(emailText)}</textarea>
      </div>
      <div class="tab-content" id="tab-follow2" style="display:none;">
        <p style="font-size:0.75rem; color:var(--ink-muted); margin-bottom: 4px;">Target: 80-120 Words</p>
        <textarea class="outreach-textarea" id="edit-followUp2" oninput="markAsEdited()">${escapeHtml(followUp2)}</textarea>
      </div>
    </div>
  `;
  
  const sourcesSection = `
    <div class="inspector-section">
      <h4>Sources Consulted (${p.sources.length})</h4>
      <ul class="source-list">
        ${p.sources.map(src => `<li><a href="${src}" target="_blank">${escapeHtml(src)} ↗</a></li>`).join("")}
      </ul>
    </div>
  `;
  
  const riskSection = `
    <div class="inspector-section">
      <h4>Compliance & Risk Notes</h4>
      <p>${escapeHtml(p.risk_notes)}</p>
    </div>
  `;
  
  // Mandatory human checklist
  const checklistSection = `
    <div class="inspector-section">
      <h4>Mandatory Human Review Checklist</h4>
      <p style="font-size:0.75rem; color:var(--ink-muted); margin-bottom:6px;">All items must be verified before approval.</p>
      <div class="checklist-container">
        <label class="checklist-item">
          <input type="checkbox" class="chk-item" onchange="evaluateChecklist()"/>
          <span>Signal is accurate, verified, and current.</span>
        </label>
        <label class="checklist-item">
          <input type="checkbox" class="chk-item" onchange="evaluateChecklist()"/>
          <span>No fabricated or unverifiable claims.</span>
        </label>
        <label class="checklist-item">
          <input type="checkbox" class="chk-item" onchange="evaluateChecklist()"/>
          <span>Outreach tone sounds human and concise.</span>
        </label>
        <label class="checklist-item">
          <input type="checkbox" class="chk-item" onchange="evaluateChecklist()"/>
          <span>No overpromised ROI or medical outcomes.</span>
        </label>
        <label class="checklist-item">
          <input type="checkbox" class="chk-item" onchange="evaluateChecklist()"/>
          <span>Call to action is low pressure and soft.</span>
        </label>
      </div>
    </div>
  `;
  
  // Bottom action buttons
  const isApproved = p.status === "approved" || p.status === "edited_approved";
  const approvedText = isApproved ? "Approved ✓" : "Approve";
  
  const actionsSection = `
    <div class="action-status-block">
      <div>
        <strong>Status:</strong> ${p.status.replace("_", " ")}
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" id="btn-approve-drawer" onclick="approveProspect()" ${isApproved ? "" : "disabled"}>${approvedText}</button>
        <button class="btn" onclick="updateStatus('rejected')">Reject</button>
        <button class="btn" onclick="updateStatus('needs_manual_research')">Flag Research</button>
      </div>
    </div>
  `;
  
  body.innerHTML = signalsSection + metricsSection + contactSection + strategicSection + outreachSection + sourcesSection + riskSection + checklistSection + actionsSection;
  
  // Set active tab state
  switchTab(currentTab);
}

// ---------------- Tab controller ----------------

window.switchTab = function(tabName) {
  currentTab = tabName;
  
  // Hide all tab content
  document.getElementById("tab-conn").style.display = "none";
  document.getElementById("tab-follow").style.display = "none";
  document.getElementById("tab-email").style.display = "none";
  document.getElementById("tab-follow2").style.display = "none";
  
  // Deactivate all buttons
  document.getElementById("tab-btn-conn").classList.remove("active");
  document.getElementById("tab-btn-follow").classList.remove("active");
  document.getElementById("tab-btn-email").classList.remove("active");
  document.getElementById("tab-btn-follow2").classList.remove("active");
  
  // Show targeted tab
  if (tabName === "connectionNote") {
    document.getElementById("tab-conn").style.display = "block";
    document.getElementById("tab-btn-conn").classList.add("active");
  } else if (tabName === "followUp") {
    document.getElementById("tab-follow").style.display = "block";
    document.getElementById("tab-btn-follow").classList.add("active");
  } else if (tabName === "email") {
    document.getElementById("tab-email").style.display = "block";
    document.getElementById("tab-btn-email").classList.add("active");
  } else if (tabName === "followUp2") {
    document.getElementById("tab-follow2").style.display = "block";
    document.getElementById("tab-btn-follow2").classList.add("active");
  }
};

let hasEdits = false;
window.markAsEdited = function() {
  hasEdits = true;
};

window.evaluateChecklist = function() {
  const checkboxes = document.querySelectorAll(".chk-item");
  const allChecked = Array.from(checkboxes).every(chk => chk.checked);
  
  const approveBtn = document.getElementById("btn-approve-drawer");
  if (approveBtn) {
    approveBtn.disabled = !allChecked;
  }
};

window.approveProspect = function() {
  const status = hasEdits ? "edited_approved" : "approved";
  updateStatus(status);
};

window.updateStatus = async function(status) {
  if (!selectedProspectId) return;
  
  const prospect = currentProspects.find(p => p.id === selectedProspectId);
  if (!prospect) return;
  
  // Extract edits if status is approved/edited_approved
  let messageEdits = null;
  if (status === "approved" || status === "edited_approved") {
    messageEdits = {
      connectionNote: { text: document.getElementById("edit-connectionNote").value },
      followUpMessage: { text: document.getElementById("edit-followUp").value },
      coldEmail: {
        subject: document.getElementById("edit-email-subject").value,
        text: document.getElementById("edit-email").value
      },
      followUpDraft2: { text: document.getElementById("edit-followUp2").value }
    };
  }
  
  const payload = {
    prospectId: selectedProspectId,
    status: status,
    messagesUpdates: messageEdits
  };
  
  try {
    const res = await fetch("/api/prospect/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error("Could not update status");
    
    // Update local state
    prospect.status = status;
    if (messageEdits) {
      prospect.outreach_messages.connectionNote.text = messageEdits.connectionNote.text;
      prospect.outreach_messages.followUpMessage.text = messageEdits.followUpMessage.text;
      prospect.outreach_messages.coldEmail.subject = messageEdits.coldEmail.subject;
      prospect.outreach_messages.coldEmail.text = messageEdits.coldEmail.text;
      prospect.outreach_messages.followUpDraft2.text = messageEdits.followUpDraft2.text;
    }
    
    hasEdits = false;
    renderProspects();
    updatePackHub();
    openDrawer(selectedProspectId); // Reload drawer
    
  } catch (err) {
    alert(`Error updating status: ${err.message}`);
  }
};

// ---------------- Export & Copy ----------------

async function copyPack() {
  const btn = document.getElementById("copy-pack-btn");
  try {
    const res = await fetch(`/api/pack?runDate=${currentRunDate}`);
    if (!res.ok) throw new Error("Could not fetch daily pack markdown");
    const text = await res.text();
    
    await navigator.clipboard.writeText(text);
    flashButton(btn, "Copied ✓");
  } catch (err) {
    alert(`Could not copy: ${err.message}`);
  }
}

function downloadPack() {
  if (!currentRunDate) return;
  window.open(`/api/pack?runDate=${currentRunDate}`);
}

async function copyDossier() {
  if (!selectedProspectId) return;
  const prospect = currentProspects.find(p => p.id === selectedProspectId);
  if (!prospect) return;
  
  const btn = document.getElementById("drawer-copy-btn");
  
  // Format as readable markdown snippet
  let md = [];
  md.push(`# Prospect Profile: ${prospect.name} (${prospect.title} at ${prospect.company})`);
  md.push(`- Fit Score: ${prospect.fit_score}/100 | Confidence: ${prospect.confidence_score}/100`);
  md.push(`- Status: ${prospect.status}`);
  md.push(`- Website: ${prospect.company_website || "N/A"}`);
  md.push(`- LinkedIn: ${prospect.linkedin_url || "N/A"}\n`);
  
  if (prospect.status !== "needs_manual_research") {
    md.push(`## Personalization Signal (${prospect.signal_type})`);
    md.push(`> "${prospect.signal_description}"`);
    md.push(`- Date: ${prospect.signal_date}`);
    md.push(`- Source: ${prospect.signal_source_url}\n`);
    
    md.push("## Outreach Messages");
    md.push("### 1. Connection Invite Note");
    md.push(prospect.outreach_messages?.connectionNote?.text || "");
    md.push("\n### 2. Follow-Up Message");
    md.push(prospect.outreach_messages?.followUpMessage?.text || "");
    md.push("\n### 3. Cold Email");
    md.push(`**Subject:** ${prospect.outreach_messages?.coldEmail?.subject || ""}`);
    md.push(prospect.outreach_messages?.coldEmail?.text || "");
  } else {
    md.push(`## Needs Manual Research`);
    md.push(`Reason: ${prospect.risk_notes}`);
  }
  
  try {
    await navigator.clipboard.writeText(md.join("\n"));
    flashButton(btn, "Copied ✓");
  } catch (err) {
    alert(`Could not copy: ${err.message}`);
  }
}

function downloadDossier() {
  if (!selectedProspectId) return;
  const prospect = currentProspects.find(p => p.id === selectedProspectId);
  if (!prospect) return;
  
  // Assemble temporary markdown download link
  let md = [];
  md.push(`# Dossier - ${prospect.name}`);
  md.push(`Company: ${prospect.company}`);
  md.push(`Status: ${prospect.status}\n`);
  
  if (prospect.status !== "needs_manual_research") {
    md.push(`## Signal:\n${prospect.signal_description}\n`);
    md.push(`## Connection Note:\n${prospect.outreach_messages?.connectionNote?.text}\n`);
    md.push(`## LinkedIn Follow-Up:\n${prospect.outreach_messages?.followUpMessage?.text}\n`);
    md.push(`## Cold Email:\n**Subject:** ${prospect.outreach_messages?.coldEmail?.subject}\n\n${prospect.outreach_messages?.coldEmail?.text}\n`);
  } else {
    md.push(`## Flagged Manual Research:\n${prospect.risk_notes}`);
  }
  
  const blob = new Blob([md.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prospect-dossier-${prospect.name.replace(/\s+/g, "-").toLowerCase()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

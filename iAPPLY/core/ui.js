/*
 * ui.js — iAPPLY AutoFill Toolbar Module
 * Approach A (single userscript + @require modules)
 *
 * Responsibilities (UI only):
 *  - Render a sticky toolbar right under iAPPLY header/navbar
 *  - Handle: JSON file load, Preview, Fill Now, Undo, Clear (with sub-actions), Safe mode toggle
 *  - Show Status, Page, and Logs (collapsible)
 *  - Emit high-level events for core/plugins; NO autofill logic here
 *
 * Usage (example):
 *   // in bundle.user.js after @require this file
 *   IAF.ui.mountToolbar({ version: '0.2', appName: 'iAPPLY AutoFill' });
 *   IAF.ui.on('json:loaded', ({ json, text }) => { // validate & store });
 *   IAF.ui.on('preview', ({ safeMode }) => { // call registry.active().dryRun(json, ctx) });
 *   IAF.ui.on('fill',    ({ safeMode }) => { // call registry.active().fill(json, ctx)   });
 *   IAF.ui.on('undo',    () => { // core.undo.restoreAll() });
 *   IAF.ui.on('clear:changed', () => { // clear only fields changed by script });
 *   IAF.ui.on('clear:page',    () => { // clear all fillable on current page  });
 *
 * External setters (from core/plugins):
 *   IAF.ui.setStatus('JSON ready');
 *   IAF.ui.setPage('Q1-3');
 *   IAF.ui.setLog('...');
 *   IAF.ui.showJSONPreview(objOrString);
 *   IAF.ui.setButtons({ preview:true, fill:false, undo:false, clearChanged:false, clearPage:false });
 *
 * Responsive target: tablet 810×1080; scales down to mobile. Shadow DOM used to avoid CSS clashes.
 */

(function () {
  const IAF = (window.IAF = window.IAF || {});
  if (IAF.ui) return; // don't redefine

  // ---- tiny event bus (UI-local) ---------------------------------------
  const listeners = new Map(); // evt -> Set<fn>
  function on(evt, fn) {
    (listeners.get(evt) || listeners.set(evt, new Set()).get(evt)).add(fn);
  }
  function off(evt, fn) {
    listeners.get(evt)?.delete(fn);
  }
  function emit(evt, payload) {
    listeners.get(evt)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error("[UI emit]", evt, e);
      }
    });
  }

  // ---- helpers ---------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function el(root, sel) {
    return root.querySelector(sel);
  }
  function isVisible(dom) {
    if (!dom) return false;
    const r = dom.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function insertAfter(newNode, refNode) {
    refNode?.parentNode?.insertBefore(newNode, refNode.nextSibling);
  }

  function debounce(fn, wait = 120) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function selectHeaderCandidate() {
    const scope = document.body;
    const sels = [
      "app-eappheader",
      "app-appheader",
      "app-header",
      "nav.navbar",
      ".navbar",
      "header",
    ];
    const nodes = [];
    for (const s of sels) {
      nodes.push(...scope.querySelectorAll(s));
    }
    const candidates = nodes.filter((n) => {
      if (!isVisible(n)) return false;
      const cls = (n.className || "").toString();
      // ตัดหัวการ์ดภายในคอนเทนต์ออก (เช่น Form Conditions)
      if (/card-header/i.test(cls)) return false;
      const rect = n.getBoundingClientRect();
      const vw = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0
      );
      // ต้องกว้างพอ (อย่างน้อย 50% ของ viewport) และอยู่ใกล้ด้านบนของหน้า
      return rect.width >= vw * 0.5 && rect.top < 300;
    });
    if (!candidates.length) return null;
    candidates.sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
    );
    return candidates[0];
  }

  // ---- UI state --------------------------------------------------------
  const state = {
    mounted: false,
    safeMode: true,
    json: null,
    jsonText: "",
    version: "0.2",
    appName: "iAPPLY AutoFill",
  };

  // ---- API surface -----------------------------------------------------
  const api = {
    mountToolbar,
    setStatus,
    setPage,
    setLog,
    showJSONPreview,
    setButtons,
    on,
    off,
    getSafeMode: () => state.safeMode,
  };

  Object.defineProperty(IAF, "ui", { value: api, writable: false });

  // ---- implementation --------------------------------------------------
  function mountToolbar(opts = {}) {
    if (state.mounted) return;
    state.version = opts.version || state.version;
    state.appName = opts.appName || state.appName;

    // host
    const host = document.createElement("div");
    host.id = "__iapply_af_toolbar_host__";
    host.style.display = "block";
    host.style.position = "sticky";
    host.style.top = "0";
    host.style.zIndex = "99998";

    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .wrap { width: 100%; box-sizing: border-box; background: rgba(15,23,42,.92); color: #e5e7eb; border-bottom: 1px solid #334155; backdrop-filter: saturate(140%) blur(6px); }
        .bar { max-width: 1280px; margin: 0 auto; padding: 8px 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .brand { font-weight: 800; font-size: 13px; letter-spacing: .3px; padding-right: 8px; border-right: 1px solid #334155; white-space: nowrap; }
        .btn { cursor: pointer; padding: 8px 10px; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-weight: 700; }
        .btn.secondary { background: #374151; color: #e5e7eb; }
        .btn.warn { background: #7c3aed; }
        .btn:disabled { opacity: .5; cursor: not-allowed; }
        .split { position: relative; display: inline-flex; }
        .split > button { border-radius: 10px 0 0 10px; }
        .split > details { position: relative; }
        .split summary { list-style: none; cursor: pointer; padding: 8px 10px; background:#374151; color:#e5e7eb; border-radius: 0 10px 10px 0; border-left: 1px solid #1f2937; user-select: none; }
        .menu { position: absolute; right: 0; top: calc(100% + 6px); background:#0b1220; border:1px solid #1f2937; border-radius: 10px; min-width: 200px; padding: 6px; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,.35) }
        .menu button { width: 100%; text-align: left; background: transparent; color:#e5e7eb; border:none; padding:8px; border-radius: 8px; cursor: pointer; }
        .menu button:hover { background:#111827; }
        .grow { flex: 1 1 120px; }
        label.toggle { display:flex; align-items:center; gap:6px; font-size:12px; user-select:none; }
        input[type=checkbox]{ width:16px; height:16px; }
        input[type=file]{ background:#0b1220; color:#e5e7eb; border:1px solid #334155; border-radius: 10px; padding: 7px 10px; }
        .chip { display: inline-flex; align-items: center; gap: 6px; background: #0b1220; border:1px solid #1f2937; padding: 6px 10px; border-radius: 999px; font-size: 12px; white-space: nowrap; }
        details.logwrap { width: 100%; }
        details.logwrap > summary { cursor:pointer; font-size:12px; color:#94a3b8; }
        .log { white-space: pre-wrap; background:#0b1220; border:1px solid #1f2937; border-radius: 10px; padding:8px; max-height: 240px; overflow:auto; }
        @media (max-width: 840px) { .bar { gap: 6px; } .brand { display:none; } }
        @media (max-width: 600px) { .btn { padding: 7px 9px; } input[type=file]{ width: 100%; } }
      </style>
      <div class="wrap">
        <div class="bar">
          <div class="brand" id="brand"></div>
          <input id="af-file" type="file" accept="application/json" />
          <button class="btn secondary" id="af-preview" disabled>Preview</button>
          <button class="btn" id="af-fill" disabled>Fill Now</button>
          <div class="split">
            <button class="btn warn" id="af-undo" disabled>Undo</button>
            <details id="af-clear-dd">
              <summary>▾</summary>
              <div class="menu">
                <button id="af-clear-changed" disabled>Clear (changed)</button>
                <button id="af-clear-page" disabled>Clear (page)</button>
              </div>
            </details>
          </div>
          <label class="toggle"><input id="af-safe" type="checkbox" checked /> Safe mode</label>
          <div class="grow"></div>
          <span class="chip" id="af-status">status: waiting for JSON</span>
          <span class="chip" id="af-page">page: Unknown</span>
          <details class="logwrap" id="af-logs">
            <summary>Logs</summary>
            <div class="log" id="af-log">(empty)</div>
          </details>
        </div>
      </div>
    `;

    // wire
    const $ = (s) => el(root, s);
    $("#brand").textContent = `${state.appName} v${state.version}`;

    $("#af-safe").addEventListener("change", (e) => {
      state.safeMode = !!e.target.checked;
      emit("ui:safeMode", { safeMode: state.safeMode });
    });

    $("#af-file").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {
          json = null;
        }
        state.json = json;
        state.jsonText = text;
        setStatus(json ? "JSON ready" : "JSON loaded (parse failed)");
        showJSONPreview(json ?? text);
        setButtons({ preview: !!json, fill: !!json });
        emit("json:loaded", { json, text });
      } catch (err) {
        setStatus("JSON read error");
        setLog(String(err?.message || err));
      }
    });

    $("#af-preview").addEventListener("click", () => {
      emit("preview", { safeMode: state.safeMode });
    });

    $("#af-fill").addEventListener("click", () => {
      emit("fill", { safeMode: state.safeMode });
    });

    $("#af-undo").addEventListener("click", () => emit("undo"));
    $("#af-clear-changed").addEventListener("click", () =>
      emit("clear:changed")
    );
    $("#af-clear-page").addEventListener("click", () => emit("clear:page"));

    // mount under navbar (robust)
    function placeToolbar() {
      const anchor = selectHeaderCandidate();
      if (anchor) {
        if (host.previousElementSibling !== anchor) insertAfter(host, anchor);
      } else if (!host.parentNode) {
        document.body.prepend(host);
      }
    }
    placeToolbar();

    // keep toolbar under navbar during SPA/DOM mutations
    const schedule = debounce(placeToolbar, 120);
    const mo = new MutationObserver(() => schedule());
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);

    state.mounted = true;
  }

  function setStatus(s) {
    const root = document.getElementById(
      "__iapply_af_toolbar_host__"
    )?.shadowRoot;
    if (!root) return;
    el(root, "#af-status").textContent = `status: ${s}`;
  }
  function setPage(p) {
    const root = document.getElementById(
      "__iapply_af_toolbar_host__"
    )?.shadowRoot;
    if (!root) return;
    el(root, "#af-page").textContent = `page: ${p}`;
  }
  function setLog(txt) {
    const root = document.getElementById(
      "__iapply_af_toolbar_host__"
    )?.shadowRoot;
    if (!root) return;
    el(root, "#af-log").textContent = String(txt ?? "");
  }
  function showJSONPreview(objOrStr) {
    try {
      const pretty =
        typeof objOrStr === "string"
          ? objOrStr
          : JSON.stringify(objOrStr, null, 2);
      setLog(
        pretty.length > 5000
          ? pretty.slice(0, 5000) + "\n...(truncated)"
          : pretty
      );
    } catch {
      setLog(String(objOrStr));
    }
  }
  function setButtons(enabled = {}) {
    const root = document.getElementById(
      "__iapply_af_toolbar_host__"
    )?.shadowRoot;
    if (!root) return;
    const map = {
      preview: "#af-preview",
      fill: "#af-fill",
      undo: "#af-undo",
      clearChanged: "#af-clear-changed",
      clearPage: "#af-clear-page",
    };
    for (const [k, sel] of Object.entries(map)) {
      if (k in enabled) {
        const b = el(root, sel);
        if (b) b.disabled = !enabled[k];
      }
    }
  }
})();

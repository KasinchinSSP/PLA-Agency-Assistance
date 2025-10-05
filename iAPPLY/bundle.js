// ==UserScript==
// @name         iAPPLY AutoFill (Bundle UI-only Test)
// @namespace    https://kasinchinssp.github.io/
// @version      0.2.3
// @description  Test toolbar UI only (no autofill logic yet)
// @match        https://iservice.philliplife.com/iapply/*
// @run-at       document-idle
// @grant        none
// @noframes
// @require https://kasinchinssp.github.io/PLA-Agency-Assistance/iAPPLY/core/ui.js?v=2025-10-05b
// ==/UserScript==

/* eslint-env browser */
/* global IAF */

(() => {
  // Wait until ui.js is available (avoids race & clears lint "no-undef")
  async function waitForIAFUI(timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (
        window &&
        window.IAF &&
        window.IAF.ui &&
        typeof window.IAF.ui.mountToolbar === "function"
      )
        return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  (async () => {
    const ok = await waitForIAFUI();
    if (!ok) {
      console.error(
        "[Bundle] IAF.ui not available. Check @require URL or cache-bust (?v=...)"
      );
      return;
    }

    // Place toolbar under header
    IAF.ui.mountToolbar({ version: "0.2", appName: "iAPPLY AutoFill" });

    // Initial UI state
    IAF.ui.setStatus("waiting for JSON");
    IAF.ui.setPage("Detecting...");
    IAF.ui.setButtons({
      preview: false,
      fill: false,
      undo: false,
      clearChanged: false,
      clearPage: false,
    });

    // Basic page detection demo
    const detectPage = () => {
      const isQ13 = !!document.querySelector("app-apppart1");
      const isCond = !!document.querySelector(
        "app-conditions, app-eappdet app-conditions"
      );
      const page = isQ13 ? "Q1-3" : isCond ? "Conditions" : "Home/Other";
      IAF.ui.setPage(page);
    };
    detectPage();
    new MutationObserver(detectPage).observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Wire UI events (stub only)
    IAF.ui.on("json:loaded", ({ json, text }) => {
      const jok = !!json;
      IAF.ui.setStatus(jok ? "JSON ready" : "JSON parse error");
      IAF.ui.setButtons({ preview: jok, fill: jok });
      // โชว์เนื้อหา JSON ใน Logs (ทำให้เห็นว่าปุ่ม Browse ใช้ได้)
      IAF.ui.showJSONPreview(json ?? text);
    });

    IAF.ui.on("preview", ({ safeMode }) => {
      IAF.ui.setStatus(`preview (safe=${safeMode})`);
      IAF.ui.setLog(
        "*** Preview stub ***\nยังไม่มีปลั๊กอินกรอกจริงในโหมดทดสอบนี้"
      );
    });

    IAF.ui.on("fill", ({ safeMode }) => {
      IAF.ui.setStatus(`filling (safe=${safeMode})`);
      setTimeout(() => {
        IAF.ui.setStatus("Complete");
        IAF.ui.setLog("*** Fill stub complete ***");
        IAF.ui.setButtons({ undo: true, clearChanged: true, clearPage: true });
      }, 400);
    });

    IAF.ui.on("undo", () => {
      IAF.ui.setStatus("undone (stub)");
    });
    IAF.ui.on("clear:changed", () => {
      IAF.ui.setStatus("cleared changed (stub)");
    });
    IAF.ui.on("clear:page", () => {
      IAF.ui.setStatus("cleared page (stub)");
    });
  })();
})();

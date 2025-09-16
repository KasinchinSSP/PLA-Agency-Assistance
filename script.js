// --- APP Brain ---
const App = {
  config: {
    TEAM_KEY: "agency_team_members",
    PROD_KEY: "agency_production_log",
  },
  state: {
    teamMembers: [],
    productionLog: [],
  },

  // --- INITIALIZATION ---
  init() {
    this.ui.init();
    this.utils.loadState();
    this.team.init();
    this.production.init();
    this.benefits.init();
    this.calculator.init();
  },

  // --- UTILS & HELPERS ---
  utils: {
    saveState() {
      localStorage.setItem(
        App.config.TEAM_KEY,
        JSON.stringify(App.state.teamMembers)
      );
      localStorage.setItem(
        App.config.PROD_KEY,
        JSON.stringify(App.state.productionLog)
      );
    },
    loadState() {
      const teamData = localStorage.getItem(App.config.TEAM_KEY);
      const prodData = localStorage.getItem(App.config.PROD_KEY);
      App.state.teamMembers = teamData ? JSON.parse(teamData) : [];
      App.state.productionLog = prodData ? JSON.parse(prodData) : [];
    },
    getPositionBadgeClass(position) {
      switch (position) {
        case "AL":
          return "bg-green-100 text-green-800";
        case "AG":
          return "bg-yellow-100 text-yellow-800";
        case "AVP":
        case "VP":
        case "SVP":
          return "bg-purple-100 text-purple-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    },
    populateAgentDropdown(element, includeAllOption = false) {
      if (!element) return;
      const selectedValue = element.value;
      element.innerHTML = "";
      if (includeAllOption) {
        element.innerHTML += '<option value="all">ตัวแทนทั้งหมด</option>';
      } else if (element.id !== "report-member") {
        element.innerHTML += '<option value="">-- เลือกตัวแทน --</option>';
      }
      App.state.teamMembers.forEach((member) => {
        element.innerHTML += `<option value="${member.id}">${member.firstName} ${member.lastName}</option>`;
      });
      element.value =
        selectedValue ||
        (includeAllOption
          ? "all"
          : App.state.teamMembers.length > 0
          ? App.state.teamMembers[0].id
          : "");
    },
  },

  // --- UI & NAVIGATION ---
  ui: {
    elements: {
      nav: document.querySelector("nav"),
      pages: {
        team: document.getElementById("team-structure-page"),
        benefits: document.getElementById("benefit-summary-page"),
        production: document.getElementById("production-log-page"),
        report: document.getElementById("commission-report-page"),
      },
      modalContainer: document.getElementById("modal-container"),
    },
    deleteCallback: null,

    init() {
      this.injectAllHtml();
      this.addEventListeners();
    },

    showPage(pageName) {
      Object.values(this.elements.pages).forEach(
        (page) => page && page.classList.add("hidden")
      );
      const navLinks = document.querySelectorAll(".nav-link");
      navLinks.forEach((link) => link && link.classList.remove("active"));

      if (this.elements.pages[pageName]) {
        this.elements.pages[pageName].classList.remove("hidden");
        document
          .getElementById(`nav-${pageName}-link`)
          ?.classList.add("active");
        document
          .getElementById(`nav-${pageName}-link-mobile`)
          ?.classList.add("active");
      }
    },

    addEventListeners() {
      document
        .getElementById("nav-team-link")
        .addEventListener("click", () => this.showPage("team"));
      document
        .getElementById("nav-benefits-link")
        .addEventListener("click", () => this.showPage("benefits"));
      document
        .getElementById("nav-production-link")
        .addEventListener("click", () => this.showPage("production"));
      document
        .getElementById("nav-report-link")
        .addEventListener("click", () => this.showPage("report"));
      document
        .getElementById("nav-team-link-mobile")
        .addEventListener("click", () => this.showPage("team"));
      document
        .getElementById("nav-benefits-link-mobile")
        .addEventListener("click", () => this.showPage("benefits"));
      document
        .getElementById("nav-production-link-mobile")
        .addEventListener("click", () => this.showPage("production"));
      document
        .getElementById("nav-report-link-mobile")
        .addEventListener("click", () => this.showPage("report"));

      document
        .getElementById("backup-all-btn")
        .addEventListener("click", () => this.handleBackupAll());
      document
        .getElementById("restore-all-btn")
        .addEventListener("click", () =>
          document.getElementById("restore-json-input").click()
        );
      document
        .getElementById("restore-json-input")
        .addEventListener("change", (e) => this.handleRestoreAll(e));

      document
        .getElementById("confirm-cancel-btn")
        .addEventListener("click", () => this.hideConfirm());
      document
        .getElementById("confirm-ok-btn")
        .addEventListener("click", () => {
          if (this.deleteCallback) this.deleteCallback();
          this.hideConfirm();
        });
    },

    handleBackupAll() {
      const dataToBackup = {
        team: App.state.teamMembers,
        production: App.state.productionLog,
      };
      const jsonString = JSON.stringify(dataToBackup, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const date = new Date().toISOString().split("T")[0];
      link.download = `agency_backup_${date}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    },

    handleRestoreAll(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        this.showConfirm(
          "ยืนยันการ Restore",
          "การ Restore จะเขียนทับข้อมูลทั้งหมด คุณแน่ใจหรือไม่?",
          () => {
            try {
              const data = JSON.parse(text);
              if (!data.team || !data.production)
                throw new Error("ไฟล์ไม่สมบูรณ์");
              App.state.teamMembers = data.team;
              App.state.productionLog = data.production;
              App.utils.saveState();
              App.init(); // Re-initialize the entire app
              this.showCustomAlert(
                "สำเร็จ",
                "ข้อมูลทั้งหมดถูก Restore เรียบร้อยแล้ว"
              );
            } catch (error) {
              this.showCustomAlert(
                "เกิดข้อผิดพลาด",
                `ไม่สามารถ Restore ข้อมูลได้: ${error.message}`
              );
            } finally {
              event.target.value = null;
            }
          }
        );
      };
      reader.readAsText(file);
    },

    showConfirm(title, message, callback) {
      const confirmModal = document.getElementById("confirm-modal");
      document.getElementById("confirm-title").innerText = title;
      document.getElementById("confirm-message").innerText = message;
      this.deleteCallback = callback;
      document.getElementById("confirm-cancel-btn").style.display =
        "inline-flex";
      document.getElementById("confirm-ok-btn").innerText = "ยืนยัน";
      confirmModal.classList.remove("hidden");
      confirmModal.classList.add("flex");
    },

    showCustomAlert(title, message) {
      const confirmModal = document.getElementById("confirm-modal");
      document.getElementById("confirm-title").innerText = title;
      document.getElementById("confirm-message").innerText = message;
      this.deleteCallback = null;
      document.getElementById("confirm-cancel-btn").style.display = "none";
      document.getElementById("confirm-ok-btn").innerText = "ตกลง";
      confirmModal.classList.remove("hidden");
      confirmModal.classList.add("flex");
    },

    hideConfirm() {
      const confirmModal = document.getElementById("confirm-modal");
      confirmModal.classList.add("hidden");
      this.deleteCallback = null;
    },

    injectAllHtml() {
      this.elements.nav.innerHTML = pageTemplates.nav;
      this.elements.modalContainer.innerHTML = pageTemplates.modals;
      Object.keys(this.elements.pages).forEach((key) => {
        const pageElement = this.elements.pages[key];
        if (pageElement && pageTemplates[key]) {
          pageElement.innerHTML = pageTemplates[key];
        }
      });
      document.getElementById("ag-content").innerHTML = benefitContent.ag;
      document.getElementById("al-content").innerHTML = benefitContent.al;
      document.getElementById("ae-content").innerHTML = benefitContent.ae;
    },
  },

  benefits: {
    /* ... benefits methods ... */
  },
  calculator: {
    /* ... calculator methods ... */
  },
  team: {
    /* ... team methods ... */
  },
  production: {
    /* ... production methods ... */
  },
};

// --- HTML TEMPLATES ---
const pageTemplates = {
  nav: `...`,
  team: `...`,
  benefits: `...`,
  production: `...`,
  report: `...`,
  modals: `...`,
};
const benefitContent = {
  ag: `...`,
  al: `...`,
  ae: `...`,
};

// --- APP ENTRY POINT ---
document.addEventListener("DOMContentLoaded", () => {
  google.charts.load("current", { packages: ["orgchart"] });
  google.charts.setOnLoadCallback(() => App.init());
});

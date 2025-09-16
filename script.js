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
      nav: {
        teamLink: document.getElementById("nav-team-link"),
        benefitsLink: document.getElementById("nav-benefits-link"),
        productionLink: document.getElementById("nav-production-link"),
        reportLink: document.getElementById("nav-report-link"),
        teamLinkMobile: document.getElementById("nav-team-link-mobile"),
        benefitsLinkMobile: document.getElementById("nav-benefits-link-mobile"),
        productionLinkMobile: document.getElementById(
          "nav-production-link-mobile"
        ),
        reportLinkMobile: document.getElementById("nav-report-link-mobile"),
      },
      pages: {
        team: document.getElementById("team-structure-page"),
        benefits: document.getElementById("benefit-summary-page"),
        production: document.getElementById("production-log-page"),
        report: document.getElementById("commission-report-page"),
      },
      confirmModal: null,
      confirmTitle: null,
      confirmMessage: null,
      confirmOkBtn: null,
      confirmCancelBtn: null,
      backupAllBtn: document.getElementById("backup-all-btn"),
      restoreAllBtn: document.getElementById("restore-all-btn"),
      restoreJsonInput: document.getElementById("restore-json-input"),
      modalContainer: document.getElementById("modal-container"),
    },
    deleteCallback: null,

    init() {
      this.injectAllHtml();

      // Re-assign modal elements after injection
      this.elements.confirmModal = document.getElementById("confirm-modal");
      this.elements.confirmTitle = document.getElementById("confirm-title");
      this.elements.confirmMessage = document.getElementById("confirm-message");
      this.elements.confirmOkBtn = document.getElementById("confirm-ok-btn");
      this.elements.confirmCancelBtn =
        document.getElementById("confirm-cancel-btn");

      Object.keys(this.elements.nav).forEach((key) => {
        const link = this.elements.nav[key];
        if (link) {
          const pageName = key.replace("Link", "").replace("Mobile", "");
          link.addEventListener("click", () => this.showPage(pageName));
        }
      });

      this.elements.backupAllBtn.addEventListener("click", () =>
        this.handleBackupAll()
      );
      this.elements.restoreAllBtn.addEventListener("click", () =>
        this.elements.restoreJsonInput.click()
      );
      this.elements.restoreJsonInput.addEventListener("change", (e) =>
        this.handleRestoreAll(e)
      );

      this.elements.confirmCancelBtn.addEventListener("click", () =>
        this.hideConfirm()
      );
      this.elements.confirmOkBtn.addEventListener("click", () => {
        if (this.deleteCallback) this.deleteCallback();
        this.hideConfirm();
      });
    },

    showPage(pageName) {
      Object.values(this.elements.pages).forEach(
        (page) => page && page.classList.add("hidden")
      );

      const navLinks = [
        this.elements.nav.teamLink,
        this.elements.nav.benefitsLink,
        this.elements.nav.productionLink,
        this.elements.nav.reportLink,
        this.elements.nav.teamLinkMobile,
        this.elements.nav.benefitsLinkMobile,
        this.elements.nav.productionLinkMobile,
        this.elements.nav.reportLinkMobile,
      ];
      navLinks.forEach((link) => link && link.classList.remove("active"));

      if (this.elements.pages[pageName]) {
        this.elements.pages[pageName].classList.remove("hidden");
        if (this.elements.nav[pageName + "Link"])
          this.elements.nav[pageName + "Link"].classList.add("active");
        if (this.elements.nav[pageName + "LinkMobile"])
          this.elements.nav[pageName + "LinkMobile"].classList.add("active");
      }
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
          "ยืนยันการ Restore ข้อมูล",
          "การ Restore จะเขียนทับข้อมูลทีมและผลงานทั้งหมดที่มีอยู่ด้วยข้อมูลจากไฟล์ คุณแน่ใจหรือไม่?",
          () => {
            try {
              const data = JSON.parse(text);
              if (
                !data.team ||
                !data.production ||
                !Array.isArray(data.team) ||
                !Array.isArray(data.production)
              ) {
                throw new Error("ไฟล์ JSON ไม่ถูกต้องหรือไม่สมบูรณ์");
              }
              App.state.teamMembers = data.team;
              App.state.productionLog = data.production;
              App.utils.saveState();
              App.team.init();
              App.production.init();
              App.calculator.init();
              this.showCustomAlert(
                "สำเร็จ",
                "ข้อมูลทั้งหมดถูก Restore เรียบร้อยแล้ว"
              );
            } catch (error) {
              console.error("JSON Restore Error:", error);
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
      this.elements.confirmTitle.innerText = title;
      this.elements.confirmMessage.innerText = message;
      this.deleteCallback = callback;
      this.elements.confirmCancelBtn.style.display = "inline-flex";
      this.elements.confirmOkBtn.innerText = "ยืนยัน";
      this.elements.confirmModal.classList.remove("hidden");
      this.elements.confirmModal.classList.add("flex");
    },

    showCustomAlert(title, message) {
      this.elements.confirmTitle.innerText = title;
      this.elements.confirmMessage.innerText = message;
      this.deleteCallback = null;
      this.elements.confirmCancelBtn.style.display = "none";
      this.elements.confirmOkBtn.innerText = "ตกลง";
      this.elements.confirmModal.classList.remove("hidden");
      this.elements.confirmModal.classList.add("flex");
    },

    hideConfirm() {
      this.elements.confirmModal.classList.add("hidden");
      this.deleteCallback = null;
    },

    injectAllHtml() {
      // Inject Modals
      this.modalContainer.innerHTML = `
                <!-- Modal for Add/Edit Member -->
                <div id="member-modal" class="fixed inset-0 z-50 items-center justify-center hidden">
                    <div class="modal-backdrop fixed inset-0"></div>
                    <div class="modal-content bg-white rounded-lg shadow-xl m-4 sm:m-8 relative w-full max-w-lg p-6 overflow-y-auto">
                        <h3 id="modal-title" class="text-2xl font-bold mb-6">เพิ่มบุคลากรใหม่</h3>
                        <form id="member-form">
                            <input type="hidden" id="member-id">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="firstName" class="block text-sm font-medium text-gray-700">ชื่อ</label>
                                    <input type="text" id="firstName" name="firstName" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                </div>
                                <div>
                                    <label for="lastName" class="block text-sm font-medium text-gray-700">นามสกุล</label>
                                    <input type="text" id="lastName" name="lastName" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                </div>
                            </div>
                             <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label for="position" class="block text-sm font-medium text-gray-700">ตำแหน่ง</label>
                                    <select id="position" name="position" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                        <option value="AG">ตัวแทน (AG)</option>
                                        <option value="AL">ผู้บริหารงานขาย (AL)</option>
                                        <option value="AVP">AVP</option>
                                        <option value="VP">VP</option>
                                        <option value="SVP">SVP</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="persistencyRate" class="block text-sm font-medium text-gray-700">อัตราความยั่งยืน (%)</label>
                                    <input type="number" id="persistencyRate" name="persistencyRate" value="100" step="0.1" min="0" max="100" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                     <label for="agentStartDate" class="block text-sm font-medium text-gray-700">วันที่ออกโค้ดตัวแทน</label>
                                    <input type="date" id="agentStartDate" name="agentStartDate" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                                </div>
                            </div>
                            <div class="mt-4">
                                <label for="uplineId" class="block text-sm font-medium text-gray-700">ผู้แนะนำ (Upline)</label>
                                <select id="uplineId" name="uplineId" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">-- ไม่มีผู้แนะนำ --</option>
                                </select>
                            </div>
                            <div class="mt-8 flex justify-end space-x-3">
                                <button type="button" id="cancel-btn" class="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition duration-300">
                                    ยกเลิก
                                </button>
                                <button type="submit" class="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-300">
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Custom Confirmation Modal -->
                <div id="confirm-modal" class="fixed inset-0 z-50 items-center justify-center hidden">
                    <div class="modal-backdrop fixed inset-0"></div>
                    <div class="relative bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm mx-auto">
                        <h3 id="confirm-title" class="text-lg font-bold">ยืนยันการลบ</h3>
                        <p id="confirm-message" class="mt-2 text-sm text-gray-600">คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                         <div class="mt-6 flex justify-end space-x-3">
                            <button id="confirm-cancel-btn" class="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                            <button id="confirm-ok-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">ยืนยัน</button>
                        </div>
                    </div>
                </div>
            `;

      // Inject Page Content
      Object.keys(this.elements.pages).forEach((key) => {
        const pageElement = this.elements.pages[key];
        if (pageElement && pageTemplates[key]) {
          pageElement.innerHTML = pageTemplates[key];
        }
      });
    },
  },

  // --- BENEFITS MODULE ---
  benefits: {
    init() {
      const tabButtons = document.querySelectorAll(
        "#benefit-summary-page .tab-button"
      );
      const tabPanes = document.querySelectorAll(
        "#benefit-summary-page .tab-pane"
      );
      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          tabButtons.forEach((btn) => btn.classList.remove("active"));
          button.classList.add("active");
          tabPanes.forEach((pane) => pane.classList.add("hidden"));
          const tabId = button.getAttribute("data-tab");
          document
            .querySelector(`#${tabId}-content`)
            .classList.remove("hidden");
        });
      });
    },
  },

  // --- REPORT CALCULATOR MODULE ---
  calculator: {
    elements: {
      memberSelect: document.getElementById("report-member"),
      yearSelect: document.getElementById("report-year"),
      periodSelect: document.getElementById("report-period"),
      calculateBtn: document.getElementById("calculate-report-btn"),
      resultsContainer: document.getElementById("report-results-container"),
      reportHeader: document.getElementById("report-header"),
      tableBody: document.getElementById("report-table-body"),
      reportTotal: document.getElementById("report-total"),
      placeholder: document.getElementById("report-placeholder"),
    },

    init() {
      this.populateSelectors();
      this.elements.calculateBtn.addEventListener("click", () =>
        this.startCalculation()
      );
    },

    populateSelectors() {
      App.utils.populateAgentDropdown(this.elements.memberSelect);

      const yearFilter = this.elements.yearSelect;
      const currentYear = new Date().getFullYear();
      const years = new Set(
        App.state.productionLog.map((p) => new Date(p.policyDate).getFullYear())
      );
      years.add(currentYear);
      const selectedYear = yearFilter.value || currentYear;
      yearFilter.innerHTML = "";
      Array.from(years)
        .sort((a, b) => b - a)
        .forEach((year) => {
          yearFilter.innerHTML += `<option value="${year}" ${
            year == selectedYear ? "selected" : ""
          }>${year}</option>`;
        });
    },

    startCalculation() {
      const memberId = parseInt(this.elements.memberSelect.value, 10);
      const year = parseInt(this.elements.yearSelect.value, 10);
      const period = this.elements.periodSelect.value;

      if (!memberId) {
        App.ui.showCustomAlert(
          "ข้อมูลไม่ครบถ้วน",
          "กรุณาเลือกบุคลากรที่ต้องการคำนวณ"
        );
        return;
      }

      const member = App.state.teamMembers.find((m) => m.id === memberId);
      if (!member) {
        App.ui.showCustomAlert("ไม่พบข้อมูล", "ไม่พบบุคลากรที่เลือกในระบบ");
        return;
      }

      const results = this.engine.calculateForMember(member, year, period);

      this.renderReport(member, year, period, results);
    },

    renderReport(member, year, period, results) {
      this.elements.placeholder.classList.add("hidden");
      this.elements.resultsContainer.classList.remove("hidden");

      const periodText =
        this.elements.periodSelect.options[
          this.elements.periodSelect.selectedIndex
        ].text;
      this.elements.reportHeader.textContent = `รายงานผลประโยชน์ของ: ${member.firstName} ${member.lastName} (${member.position}) | ${periodText} ปี ${year}`;

      this.elements.tableBody.innerHTML = "";
      let total = 0;
      results.forEach((res) => {
        if (res.amount === 0) return;
        total += res.amount;
        const row = document.createElement("tr");
        const popoverHtml = res.details
          .map(
            (d) =>
              `<div><span class="font-semibold">${d.label}:</span> ${d.value}</div>`
          )
          .join("");

        row.innerHTML = `
                    <td class="px-4 py-3">${res.name}</td>
                    <td class="px-4 py-3 text-right">${res.amount.toLocaleString(
                      "th-TH",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs">
                         <div class="relative details-icon-container flex items-center">
                            ${res.note}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2 text-blue-500 cursor-pointer details-icon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div class="details-popover">${popoverHtml}</div>
                        </div>
                    </td>
                `;
        this.elements.tableBody.appendChild(row);
      });

      this.elements.reportTotal.textContent = total.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },

    engine: {
      calculateForMember(member, year, period) {
        let results = [];
        const { startDate, endDate } = this.getPeriodDateRange(year, period);
        const aePositions = ["AVP", "VP", "SVP"];

        // --- COMMON BENEFITS ---
        const personalProd = App.state.productionLog.filter(
          (p) =>
            p.agentId === member.id &&
            new Date(p.policyDate) >= startDate &&
            new Date(p.policyDate) <= endDate
        );
        results.push(this.calculateFyc(personalProd));

        // --- POSITION-SPECIFIC BENEFITS ---
        if (member.position === "AG") {
          if (period.startsWith("q") || period === "year") {
            const quarters =
              period === "year" ? [1, 2, 3, 4] : [parseInt(period.slice(1))];
            quarters.forEach((qNum) =>
              results.push(this.calculateQuarterlyBonus(member, year, qNum))
            );
          }
          if (period === "year")
            results.push(this.calculateYearlyBonus(member, year));
          results = results.concat(
            this.calculateRecruitingBenefit(member, startDate, endDate)
          );
        } else if (
          member.position === "AL" ||
          aePositions.includes(member.position)
        ) {
          const directUnitIds = this.getDirectUnitMemberIds(member.id);
          const directUnitProd = App.state.productionLog.filter(
            (p) =>
              directUnitIds.includes(p.agentId) &&
              new Date(p.policyDate) >= startDate &&
              new Date(p.policyDate) <= endDate
          );

          results.push(this.calculateDirectOverriding(member, directUnitProd));
          if (period.startsWith("q") || period === "year") {
            const quarters =
              period === "year" ? [1, 2, 3, 4] : [parseInt(period.slice(1))];
            quarters.forEach((qNum) => {
              results.push(
                this.calculateAlBonus(member, year, qNum, "quarter")
              );
            });
          }
          if (period === "year") {
            results.push(this.calculateAlBonus(member, year, 0, "year"));
          }
        }

        // --- AE-LEVEL BENEFITS ---
        if (aePositions.includes(member.position)) {
          const directLineIds = this.getAeDirectLineMemberIds(member.id);
          const directLineProd = App.state.productionLog.filter(
            (p) =>
              directLineIds.includes(p.agentId) &&
              new Date(p.policyDate) >= startDate &&
              new Date(p.policyDate) <= endDate
          );
          results.push(
            this.calculateAeDirectOverriding(member, directLineProd)
          );

          if (period === "year") {
            const entireLineIds = this.getAeEntireLineMemberIds(member.id);
            const entireLineProd = App.state.productionLog.filter(
              (p) =>
                entireLineIds.includes(p.agentId) &&
                new Date(p.policyDate) >= startDate &&
                new Date(p.policyDate) <= endDate
            );
            results.push(this.calculateAeYearlyBonus(member, entireLineProd));
          }
        }

        return results.filter((r) => r && r.amount > 0);
      },

      getDirectUnitMemberIds(uplineId) {
        let unitIds = [uplineId];
        let queue = App.state.teamMembers.filter(
          (m) => m.uplineId === uplineId
        );

        while (queue.length > 0) {
          const currentMember = queue.shift();
          if (currentMember.position === "AG") {
            unitIds.push(currentMember.id);
            const children = App.state.teamMembers.filter(
              (m) => m.uplineId === currentMember.id
            );
            queue.push(...children);
          }
        }
        return unitIds;
      },

      getAeDirectLineMemberIds(aeId) {
        let lineIds = [];
        let queue = [aeId];
        const aePositions = ["AVP", "VP", "SVP"];

        while (queue.length > 0) {
          const currentId = queue.shift();
          lineIds.push(currentId);
          const children = App.state.teamMembers.filter(
            (m) => m.uplineId === currentId
          );
          children.forEach((child) => {
            if (!aePositions.includes(child.position)) {
              queue.push(child.id);
            }
          });
        }
        return lineIds;
      },

      getAeEntireLineMemberIds(aeId) {
        let lineIds = [];
        let queue = [aeId];
        while (queue.length > 0) {
          const currentId = queue.shift();
          lineIds.push(currentId);
          const children = App.state.teamMembers.filter(
            (m) => m.uplineId === currentId
          );
          queue.push(...children.map((c) => c.id));
        }
        return lineIds;
      },

      calculateFyc(personalProd) {
        const totalFyp = personalProd.reduce((sum, p) => sum + p.fyp, 0);
        const totalComm = personalProd.reduce(
          (sum, p) => sum + p.fyp * (p.fycRate / 100),
          0
        );
        const avgRate = totalFyp > 0 ? (totalComm / totalFyp) * 100 : 0;
        return {
          name: "ค่าบำเหน็จส่วนตัว (FYC)",
          amount: totalComm,
          note: `จากผลงานส่วนตัว`,
          details: [
            { label: "จำนวนเคส", value: personalProd.length },
            { label: "ยอด FYP รวม", value: totalFyp.toLocaleString("th-TH") },
            { label: "อัตราเฉลี่ย", value: `${avgRate.toFixed(2)}%` },
          ],
        };
      },

      calculateQuarterlyBonus(member, year, quarterNum) {
        const result = {
          name: `โบนัสตัวแทน (Q${quarterNum})`,
          amount: 0,
          note: "ไม่เข้าเงื่อนไข",
          details: [],
        };
        if (member.persistencyRate < 80) {
          result.note = `Persistency ไม่ถึง 80%`;
          result.details.push({
            label: "Persistency",
            value: `${member.persistencyRate}%`,
          });
          return result;
        }
        const { startDate, endDate } = this.getPeriodDateRange(
          year,
          `q${quarterNum}`
        );
        const personalProd = App.state.productionLog.filter(
          (p) =>
            p.agentId === member.id &&
            new Date(p.policyDate) >= startDate &&
            new Date(p.policyDate) <= endDate
        );
        const totalAfyp = personalProd.reduce(
          (sum, p) => sum + p.fyp * (p.afypRate / 100),
          0
        );
        let bonusRate = 0;
        if (totalAfyp >= 160000) bonusRate = 0.22;
        else if (totalAfyp >= 110000) bonusRate = 0.18;
        else if (totalAfyp >= 70000) bonusRate = 0.15;
        else if (totalAfyp >= 40000) bonusRate = 0.12;
        else if (totalAfyp >= 25000) bonusRate = 0.1;

        if (bonusRate > 0) {
          result.amount = totalAfyp * bonusRate;
          result.note = `AFYP ${totalAfyp.toLocaleString("th-TH")} x ${
            bonusRate * 100
          }%`;
          result.details = [
            {
              label: "Persistency",
              value: `${member.persistencyRate}% (ผ่าน)`,
            },
            {
              label: "AFYP ไตรมาสนี้",
              value: totalAfyp.toLocaleString("th-TH"),
            },
            { label: "อัตราโบนัส", value: `${bonusRate * 100}%` },
          ];
        } else {
          result.note = `AFYP ไม่ถึงเกณฑ์`;
          result.details.push({
            label: "AFYP ไตรมาสนี้",
            value: totalAfyp.toLocaleString("th-TH"),
          });
        }
        return result;
      },

      calculateYearlyBonus(member, year) {
        const result = {
          name: "โบนัสตัวแทน (รายปี)",
          amount: 0,
          note: "ไม่เข้าเงื่อนไข",
          details: [],
        };
        if (member.persistencyRate < 80) {
          result.note = `Persistency ไม่ถึง 80%`;
          result.details.push({
            label: "Persistency",
            value: `${member.persistencyRate}%`,
          });
          return result;
        }
        if (!member.agentStartDate) {
          result.note = "ไม่พบวันที่ออกโค้ด";
          result.details.push({
            label: "ข้อผิดพลาด",
            value: "กรุณาเพิ่มวันที่ออกโค้ดตัวแทน",
          });
          return result;
        }
        const { startDate, endDate } = this.getPeriodDateRange(year, "year");
        const tenureInMonths =
          (endDate.getTime() - new Date(member.agentStartDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30.44);
        const personalProd = App.state.productionLog.filter(
          (p) =>
            p.agentId === member.id &&
            new Date(p.policyDate) >= startDate &&
            new Date(p.policyDate) <= endDate
        );
        const totalAfyp = personalProd.reduce(
          (sum, p) => sum + p.fyp * (p.afypRate / 100),
          0
        );
        let bonusRate = 0;
        let tierNote = "";
        if (tenureInMonths <= 6) {
          tierNote = "อายุงาน ≤ 6 เดือน";
          if (totalAfyp >= 375000) bonusRate = 0.22;
          else if (totalAfyp >= 250000) bonusRate = 0.18;
          else if (totalAfyp >= 160000) bonusRate = 0.15;
          else if (totalAfyp >= 90000) bonusRate = 0.12;
          else if (totalAfyp >= 60000) bonusRate = 0.1;
        } else {
          tierNote = "อายุงาน > 6 เดือน";
          if (totalAfyp >= 750000) bonusRate = 0.22;
          else if (totalAfyp >= 500000) bonusRate = 0.18;
          else if (totalAfyp >= 320000) bonusRate = 0.15;
          else if (totalAfyp >= 180000) bonusRate = 0.12;
          else if (totalAfyp >= 120000) bonusRate = 0.1;
        }
        if (bonusRate > 0) {
          result.amount = totalAfyp * bonusRate;
          result.note = `AFYP ${totalAfyp.toLocaleString("th-TH")} x ${
            bonusRate * 100
          }%`;
          result.details = [
            {
              label: "Persistency",
              value: `${member.persistencyRate}% (ผ่าน)`,
            },
            {
              label: "อายุงาน",
              value: `${tenureInMonths.toFixed(1)} เดือน (${tierNote})`,
            },
            { label: "AFYP ทั้งปี", value: totalAfyp.toLocaleString("th-TH") },
            { label: "อัตราโบนัส", value: `${bonusRate * 100}%` },
          ];
        } else {
          result.note = `AFYP ไม่ถึงเกณฑ์`;
          result.details.push({
            label: "อายุงาน",
            value: `${tenureInMonths.toFixed(1)} เดือน (${tierNote})`,
          });
          result.details.push({
            label: "AFYP ทั้งปี",
            value: totalAfyp.toLocaleString("th-TH"),
          });
        }
        return result;
      },

      calculateRecruitingBenefit(member, startDate, endDate) {
        const recruits = App.state.teamMembers.filter(
          (m) => m.uplineId === member.id
        );
        if (recruits.length === 0) return [];

        const memberMap = new Map(
          App.state.teamMembers.map((m) => [
            m.id,
            `${m.firstName} ${m.lastName}`,
          ])
        );
        const benefits = [];

        recruits.forEach((recruit) => {
          const recruitProd = App.state.productionLog.filter(
            (p) =>
              p.agentId === recruit.id &&
              new Date(p.policyDate) >= startDate &&
              new Date(p.policyDate) <= endDate
          );
          const totalAfyp = recruitProd.reduce(
            (sum, p) => sum + p.fyp * (p.afypRate / 100),
            0
          );
          if (totalAfyp > 0) {
            const benefitAmount = totalAfyp * 0.1;
            benefits.push({
              name: `ผลประโยชน์สร้างทีม (จาก ${memberMap.get(recruit.id)})`,
              amount: benefitAmount,
              note: `10% จาก AFYP ของทีมงาน`,
              details: [
                { label: "ทีมงาน", value: memberMap.get(recruit.id) },
                {
                  label: "AFYP ที่ผลิตได้",
                  value: totalAfyp.toLocaleString("th-TH"),
                },
                {
                  label: "หมายเหตุ",
                  value:
                    "เงื่อนไข AFYP ขั้นต่ำ 20k ใน 3 เดือนแรกยังไม่ได้ถูกนำมาพิจารณา",
                },
              ],
            });
          }
        });
        return benefits;
      },

      calculateDirectOverriding(al, directUnitProd) {
        const result = {
          name: "ผลประโยชน์หน่วยตรงปีแรก (OV)",
          amount: 0,
          note: "ไม่เข้าเงื่อนไข",
          details: [],
        };
        const totalAfyp = directUnitProd.reduce(
          (sum, p) => sum + p.fyp * (p.afypRate / 100),
          0
        );
        let rate = 0;
        if (totalAfyp >= 150000) rate = 0.35;
        else if (totalAfyp >= 80000) rate = 0.3;
        else if (totalAfyp >= 60000) rate = 0.25;
        else if (totalAfyp >= 40000) rate = 0.2;
        else if (totalAfyp >= 20000) rate = 0.18;
        else if (totalAfyp > 0) rate = 0.15;
        if (rate > 0) {
          const grossAmount = totalAfyp * rate;
          let finalAmount = grossAmount;
          let holdNote = "จ่ายเต็ม";
          if (al.persistencyRate < 65) {
            finalAmount = 0;
            holdNote = "ระงับ 100%";
          } else if (al.persistencyRate < 75) {
            finalAmount = grossAmount * 0.5;
            holdNote = "จ่าย 50%, ระงับ 50%";
          }
          result.amount = finalAmount;
          result.note = `AFYP หน่วย ${totalAfyp.toLocaleString("th-TH")} x ${
            rate * 100
          }%`;
          result.details = [
            {
              label: "AFYP หน่วยตรงรวม",
              value: totalAfyp.toLocaleString("th-TH"),
            },
            { label: "อัตราผลประโยชน์", value: `${rate * 100}%` },
            { label: "Persistency หน่วย", value: `${al.persistencyRate}%` },
            { label: "เงื่อนไขการจ่าย", value: holdNote },
          ];
        } else {
          result.details.push({
            label: "AFYP หน่วยตรงรวม",
            value: totalAfyp.toLocaleString("th-TH"),
          });
        }
        return result;
      },

      calculateAlBonus(al, year, periodValue, periodType) {
        const { startDate, endDate } = this.getPeriodDateRange(
          year,
          periodType === "quarter" ? `q${periodValue}` : "year"
        );
        const result = {
          name:
            periodType === "quarter"
              ? `โบนัสผู้บริหาร (Q${periodValue})`
              : "โบนัสผู้บริหาร (รายปี)",
          amount: 0,
          note: "ไม่เข้าเงื่อนไข",
          details: [],
        };
        if (al.persistencyRate < 75) {
          result.note = `Persistency ไม่ถึง 75%`;
          result.details.push({
            label: "Persistency",
            value: `${al.persistencyRate}%`,
          });
          return result;
        }
        const directUnitIds = this.getDirectUnitMemberIds(al.id);
        const agentIdsInUnit = directUnitIds.filter((id) => id !== al.id);
        const alProd = App.state.productionLog.filter(
          (p) =>
            p.agentId === al.id &&
            new Date(p.policyDate) >= startDate &&
            new Date(p.policyDate) <= endDate
        );
        const teamProd = App.state.productionLog.filter(
          (p) =>
            agentIdsInUnit.includes(p.agentId) &&
            new Date(p.policyDate) >= startDate &&
            new Date(p.policyDate) <= endDate
        );
        const personalAfyp = alProd.reduce(
          (sum, p) => sum + (p.fyp * p.afypRate) / 100,
          0
        );
        const teamAfyp = teamProd.reduce(
          (sum, p) => sum + (p.fyp * p.afypRate) / 100,
          0
        );
        const cappedPersonalAfyp = Math.min(personalAfyp, teamAfyp * 0.3);
        const totalAfypForBonus = teamAfyp + cappedPersonalAfyp;
        let bonusRate = 0;
        if (periodType === "quarter") {
          if (totalAfypForBonus >= 400000) bonusRate = 0.06;
          else if (totalAfypForBonus >= 240000) bonusRate = 0.05;
          else if (totalAfypForBonus >= 180000) bonusRate = 0.04;
        } else {
          // Yearly
          const tenureInMonths =
            (new Date(year, 11, 31) - new Date(al.agentStartDate)) /
            (1000 * 60 * 60 * 24 * 30.44);
          if (tenureInMonths <= 6) {
            if (totalAfypForBonus >= 1250000) bonusRate = 0.09;
            else if (totalAfypForBonus >= 1050000) bonusRate = 0.08;
            else if (totalAfypForBonus >= 850000) bonusRate = 0.07;
            else if (totalAfypForBonus >= 650000) bonusRate = 0.06;
            else if (totalAfypForBonus >= 450000) bonusRate = 0.05;
            else if (totalAfypForBonus >= 350000) bonusRate = 0.04;
          } else {
            if (totalAfypForBonus >= 2500000) bonusRate = 0.09;
            else if (totalAfypForBonus >= 2100000) bonusRate = 0.08;
            else if (totalAfypForBonus >= 1700000) bonusRate = 0.07;
            else if (totalAfypForBonus >= 1300000) bonusRate = 0.06;
            else if (totalAfypForBonus >= 900000) bonusRate = 0.05;
            else if (totalAfypForBonus >= 700000) bonusRate = 0.04;
          }
        }
        if (bonusRate > 0) {
          result.amount = totalAfypForBonus * bonusRate;
          result.note = `AFYP ${totalAfypForBonus.toLocaleString("th-TH")} x ${
            bonusRate * 100
          }%`;
          result.details = [
            { label: "Persistency", value: `${al.persistencyRate}% (ผ่าน)` },
            { label: "AFYP ทีม", value: teamAfyp.toLocaleString("th-TH") },
            {
              label: "AFYP ส่วนตัว (จำกัด 30%)",
              value: `${cappedPersonalAfyp.toLocaleString(
                "th-TH"
              )} (จาก ${personalAfyp.toLocaleString("th-TH")})`,
            },
            {
              label: "ฐาน AFYP รวม",
              value: totalAfypForBonus.toLocaleString("th-TH"),
            },
            { label: "อัตราโบนัส", value: `${bonusRate * 100}%` },
          ];
        } else {
          result.note = `AFYP ไม่ถึงเกณฑ์`;
          result.details.push({
            label: "ฐาน AFYP รวม",
            value: totalAfypForBonus.toLocaleString("th-TH"),
          });
        }
        return result;
      },

      calculateAeDirectOverriding(ae, directLineProd) {
        const result = {
          name: "ผลประโยชน์สายตรงปีแรก (AE OV)",
          amount: 0,
          note: "ไม่เข้าเงื่อนไข",
          details: [],
        };
        const totalAfyp = directLineProd.reduce(
          (sum, p) => sum + p.fyp * (p.afypRate / 100),
          0
        );

        let rate = 0;
        if (totalAfyp >= 1200000) rate = 0.13;
        else if (totalAfyp >= 800000) rate = 0.09;
        else if (totalAfyp >= 400000) rate = 0.08;
        else if (totalAfyp > 0) rate = 0.07;

        if (rate > 0) {
          const grossAmount = totalAfyp * rate;
          let finalAmount = grossAmount;
          let holdNote = "จ่ายเต็ม";
          if (ae.persistencyRate < 60) {
            finalAmount = 0;
            holdNote = "ระงับ 100%";
          } else if (ae.persistencyRate < 70) {
            finalAmount = grossAmount * 0.5;
            holdNote = "จ่าย 50%, ระงับ 50%";
          }

          result.amount = finalAmount;
          result.note = `AFYP สายตรง ${totalAfyp.toLocaleString("th-TH")} x ${
            rate * 100
          }%`;
          result.details = [
            {
              label: "AFYP สายงานตรง",
              value: totalAfyp.toLocaleString("th-TH"),
            },
            { label: "อัตราผลประโยชน์", value: `${rate * 100}%` },
            { label: "Persistency สายงาน", value: `${ae.persistencyRate}%` },
            { label: "เงื่อนไขการจ่าย", value: holdNote },
          ];
        } else {
          result.details.push({
            label: "AFYP สายงานตรง",
            value: totalAfyp.toLocaleString("th-TH"),
          });
        }
        return result;
      },

      calculateAeYearlyBonus(ae, entireLineProd) {
        const result = {
          name: "โบนัสผู้บริหารระดับสูง (รายปี)",
          amount: 0,
          note: "ไม่เข้าเงื่อนไข",
          details: [],
        };
        if (ae.persistencyRate < 70) {
          result.note = `Persistency ไม่ถึง 70%`;
          result.details.push({
            label: "Persistency",
            value: `${ae.persistencyRate}%`,
          });
          return result;
        }
        const totalAfyp = entireLineProd.reduce(
          (sum, p) => sum + p.fyp * (p.afypRate / 100),
          0
        );

        const targets = { AVP: 4500000, VP: 9000000, SVP: 18000000 };
        const target = targets[ae.position] || 0;

        if (totalAfyp > target) {
          const excessAfyp = totalAfyp - target;
          const achievementRate = totalAfyp / target;
          let bonusRate = 0;
          if (achievementRate >= 3) bonusRate = 0.02;
          else if (achievementRate >= 2) bonusRate = 0.015;
          else if (achievementRate >= 1) bonusRate = 0.01;

          if (bonusRate > 0) {
            result.amount = excessAfyp * bonusRate;
            result.note = `ส่วนเกิน ${excessAfyp.toLocaleString("th-TH")} x ${
              bonusRate * 100
            }%`;
            result.details = [
              { label: "Persistency", value: `${ae.persistencyRate}% (ผ่าน)` },
              {
                label: "AFYP สายงานรวม",
                value: totalAfyp.toLocaleString("th-TH"),
              },
              {
                label: "เป้าหมายตำแหน่ง",
                value: target.toLocaleString("th-TH"),
              },
              {
                label: "AFYP ส่วนที่เกินเป้า",
                value: excessAfyp.toLocaleString("th-TH"),
              },
              {
                label: "อัตราโบนัส",
                value: `${(bonusRate * 100).toFixed(1)}%`,
              },
            ];
          }
        } else {
          result.note = `AFYP ไม่ถึงเป้าหมาย`;
          result.details.push({
            label: "AFYP สายงานรวม",
            value: totalAfyp.toLocaleString("th-TH"),
          });
          result.details.push({
            label: "เป้าหมาย",
            value: target.toLocaleString("th-TH"),
          });
        }
        return result;
      },

      getPeriodDateRange(year, period) {
        if (period === "year") {
          return {
            startDate: new Date(year, 0, 1),
            endDate: new Date(year, 11, 31),
          };
        }
        if (period.startsWith("q")) {
          const quarter = parseInt(period.slice(1));
          const startMonth = (quarter - 1) * 3;
          const startDate = new Date(year, startMonth, 1);
          const endDate = new Date(year, startMonth + 3, 0);
          return { startDate, endDate };
        }
        // Monthly
        const month = parseInt(period, 10) - 1;
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        return { startDate, endDate };
      },
    },
  },

  // --- TEAM MODULE ---
  team: {
    elements: {
      addMemberBtn: document.getElementById("add-member-btn"),
      exportCsvBtn: document.getElementById("export-csv-btn"),
      importCsvBtn: document.getElementById("import-csv-btn"),
      importCsvInput: document.getElementById("import-csv-input"),
      modal: document.getElementById("member-modal"),
      modalTitle: document.getElementById("modal-title"),
      form: document.getElementById("member-form"),
      cancelBtn: document.getElementById("cancel-btn"),
      tableBody: document.getElementById("team-table-body"),
      orgChartDiv: document.getElementById("org-chart"),
    },

    init() {
      this.elements.addMemberBtn.addEventListener("click", () =>
        this.openModal("add")
      );
      this.elements.cancelBtn.addEventListener("click", () =>
        this.closeModal()
      );
      this.elements.modal
        .querySelector(".modal-backdrop")
        .addEventListener("click", () => this.closeModal());
      this.elements.form.addEventListener("submit", (e) =>
        this.handleSubmit(e)
      );
      this.elements.exportCsvBtn.addEventListener("click", () =>
        this.exportToCsv()
      );
      this.elements.importCsvBtn.addEventListener("click", () =>
        this.elements.importCsvInput.click()
      );
      this.elements.importCsvInput.addEventListener("change", (e) =>
        this.handleImport(e)
      );
      this.renderAll();
    },

    renderAll() {
      this.renderDashboard();
      this.renderTable();
      this.drawOrgChart();
    },

    renderDashboard() {
      document.getElementById("total-members").textContent =
        App.state.teamMembers.length;
      document.getElementById("total-al").textContent =
        App.state.teamMembers.filter((m) => m.position === "AL").length;
      document.getElementById("total-ag").textContent =
        App.state.teamMembers.filter((m) => m.position === "AG").length;
      const aePositions = ["AVP", "VP", "SVP"];
      document.getElementById("total-ae").textContent =
        App.state.teamMembers.filter((m) =>
          aePositions.includes(m.position)
        ).length;
    },

    renderTable() {
      this.elements.tableBody.innerHTML = "";
      if (App.state.teamMembers.length === 0) {
        this.elements.tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">ยังไม่มีข้อมูลทีม</td></tr>`;
        return;
      }
      App.state.teamMembers.forEach((member) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td class="px-4 py-3 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${
                      member.firstName
                    } ${member.lastName}</div></td>
                    <td class="px-4 py-3 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${App.utils.getPositionBadgeClass(
                      member.position
                    )}">${member.position}</span></td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900" onclick="App.team.handleEdit(${
                          member.id
                        })">แก้ไข</button>
                        <button class="text-red-600 hover:text-red-900 ml-4" onclick="App.team.handleDelete(${
                          member.id
                        })">ลบ</button>
                    </td>
                `;
        this.elements.tableBody.appendChild(row);
      });
    },

    drawOrgChart() {
      if (
        typeof google.visualization === "undefined" ||
        typeof google.visualization.OrgChart === "undefined"
      ) {
        google.charts.setOnLoadCallback(() => this.drawOrgChart());
        return;
      }
      const data = new google.visualization.DataTable();
      data.addColumn("string", "Name");
      data.addColumn("string", "Manager");
      data.addColumn("string", "ToolTip");
      if (App.state.teamMembers.length === 0) {
        this.elements.orgChartDiv.innerHTML =
          '<p class="text-center text-gray-500">ไม่มีข้อมูลสำหรับสร้างแผนผัง</p>';
        return;
      }
      const rows = App.state.teamMembers.map((member) => {
        const managerId = member.uplineId ? String(member.uplineId) : "";
        const nodeContent = `<div class="p-2"><div class="name-text">${member.firstName} ${member.lastName}</div><div class="position-text">${member.position}</div></div>`;
        return [
          { v: String(member.id), f: nodeContent },
          managerId,
          `${member.firstName} ${member.lastName}`,
        ];
      });
      data.addRows(rows);
      const chart = new google.visualization.OrgChart(
        this.elements.orgChartDiv
      );
      chart.draw(data, {
        allowHtml: true,
        nodeClass: "google-visualization-orgchart-node",
      });
    },

    openModal(mode = "add", memberData = null) {
      this.elements.form.reset();
      document.getElementById("member-id").value = "";
      this.populateUplineDropdown();
      if (mode === "edit" && memberData) {
        this.elements.modalTitle.textContent = "แก้ไขข้อมูลบุคลากร";
        document.getElementById("member-id").value = memberData.id;
        document.getElementById("firstName").value = memberData.firstName;
        document.getElementById("lastName").value = memberData.lastName;
        document.getElementById("position").value = memberData.position;
        document.getElementById("persistencyRate").value =
          memberData.persistencyRate || 100;
        document.getElementById("agentStartDate").value =
          memberData.agentStartDate || "";
        document.getElementById("uplineId").value = memberData.uplineId || "";
      } else {
        this.elements.modalTitle.textContent = "เพิ่มบุคลากรใหม่";
        document.getElementById("persistencyRate").value = 100;
        document.getElementById("agentStartDate").value = new Date()
          .toISOString()
          .split("T")[0];
      }
      this.elements.modal.classList.remove("hidden");
      this.elements.modal.classList.add("flex");
    },

    closeModal() {
      this.elements.modal.classList.add("hidden");
      this.elements.modal.classList.remove("flex");
    },

    populateUplineDropdown(currentMemberId = null) {
      const uplineSelect = document.getElementById("uplineId");
      uplineSelect.innerHTML = '<option value="">-- ไม่มีผู้แนะนำ --</option>';
      const possibleUplines = App.state.teamMembers.filter(
        (m) => m.id !== currentMemberId
      );
      possibleUplines.forEach((member) => {
        const option = document.createElement("option");
        option.value = member.id;
        option.textContent = `${member.firstName} ${member.lastName} (${member.position})`;
        uplineSelect.appendChild(option);
      });
    },

    handleSubmit(e) {
      e.preventDefault();
      const id = document.getElementById("member-id").value;
      const newMemberData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        position: document.getElementById("position").value,
        persistencyRate: parseFloat(
          document.getElementById("persistencyRate").value
        ),
        agentStartDate: document.getElementById("agentStartDate").value,
        uplineId: document.getElementById("uplineId").value
          ? parseInt(document.getElementById("uplineId").value, 10)
          : null,
      };
      if (id) {
        const index = App.state.teamMembers.findIndex((m) => m.id == id);
        if (index !== -1)
          App.state.teamMembers[index] = {
            ...App.state.teamMembers[index],
            ...newMemberData,
          };
      } else {
        newMemberData.id =
          App.state.teamMembers.length > 0
            ? Math.max(...App.state.teamMembers.map((m) => m.id)) + 1
            : 1;
        App.state.teamMembers.push(newMemberData);
      }
      App.utils.saveState();
      this.renderAll();
      this.closeModal();
      App.production.renderAllUI();
      App.calculator.populateSelectors();
    },

    handleEdit(id) {
      const member = App.state.teamMembers.find((m) => m.id === id);
      if (member) {
        this.openModal("edit", member);
        this.populateUplineDropdown(id);
      }
    },

    handleDelete(id) {
      const isUplineToSomeone = App.state.teamMembers.some(
        (m) => m.uplineId === id
      );
      if (isUplineToSomeone) {
        App.ui.showCustomAlert(
          "ไม่สามารถลบได้",
          "บุคลากรนี้เป็นผู้แนะนำ (Upline) ของสมาชิกอื่นในทีม กรุณาเปลี่ยนผู้แนะนำของสมาชิกเหล่านั้นก่อน"
        );
        return;
      }
      const hasProduction = App.state.productionLog.some(
        (p) => p.agentId === id
      );
      if (hasProduction) {
        App.ui.showCustomAlert(
          "ไม่สามารถลบได้",
          "บุคลากรนี้มีข้อมูลผลงานที่บันทึกไว้ หากต้องการลบ กรุณาลบข้อมูลผลงานของบุคลากรนี้ทั้งหมดก่อน"
        );
        return;
      }
      const memberToDelete = App.state.teamMembers.find((m) => m.id === id);
      App.ui.showConfirm(
        "ยืนยันการลบ",
        `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ ${memberToDelete.firstName}?`,
        () => {
          App.state.teamMembers = App.state.teamMembers.filter(
            (m) => m.id !== id
          );
          App.utils.saveState();
          this.renderAll();
          App.production.renderAllUI();
          App.calculator.populateSelectors();
        }
      );
    },

    handleImport(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        App.ui.showConfirm(
          "ยืนยันการนำเข้าข้อมูล",
          "การนำเข้าข้อมูลจะลบข้อมูลทีมและข้อมูลผลงานปัจจุบันทั้งหมด คุณต้องการดำเนินการต่อหรือไม่?",
          () => {
            try {
              const importedMembers = this.parseCsv(text);
              App.state.teamMembers = importedMembers;
              App.state.productionLog = []; // Clear production log as well
              App.utils.saveState();
              this.renderAll();
              App.production.renderAllUI();
              App.calculator.populateSelectors();
              if (importedMembers.length > 0) {
                App.ui.showCustomAlert(
                  "สำเร็จ",
                  `นำเข้าข้อมูลทีมจำนวน ${importedMembers.length} คนเรียบร้อยแล้ว`
                );
              } else {
                App.ui.showCustomAlert(
                  "ข้อมูลว่าง",
                  "ไม่พบข้อมูลบุคลากรที่ถูกต้องในไฟล์ CSV ข้อมูลทีมถูกล้างค่า"
                );
              }
            } catch (error) {
              console.error("CSV Parse Error:", error);
              App.ui.showCustomAlert(
                "เกิดข้อผิดพลาด",
                `รูปแบบไฟล์ CSV ไม่ถูกต้อง: ${error.message}`
              );
            } finally {
              event.target.value = null;
            }
          }
        );
      };
      reader.readAsText(file, "UTF-8");
    },

    parseCsv(text) {
      const lines = text.trim().split(/\r\n|\n/);
      if (lines.length < 2) return [];
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const required = [
        "ID",
        "FirstName",
        "LastName",
        "Position",
        "UplineID",
        "AgentStartDate",
      ];
      if (!required.every((h) => headers.includes(h))) {
        throw new Error("ไฟล์ไม่มีคอลลัมน์ที่จำเป็น: " + required.join(", "));
      }
      const members = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        const data = Object.fromEntries(
          headers.map((key, j) => [
            key,
            (lines[i].split(",")[j] || "").trim().replace(/"/g, ""),
          ])
        );
        const id = parseInt(data.ID, 10);
        if (isNaN(id)) continue;
        members.push({
          id: id,
          firstName: data.FirstName,
          lastName: data.LastName,
          position: data.Position || "AG",
          persistencyRate: parseFloat(data.PersistencyRate) || 100,
          agentStartDate:
            data.AgentStartDate || new Date().toISOString().split("T")[0],
          uplineId: data.UplineID ? parseInt(data.UplineID, 10) : null,
        });
      }
      return members;
    },

    exportToCsv() {
      const memberMap = new Map(
        App.state.teamMembers.map((m) => [m.id, `${m.firstName} ${m.lastName}`])
      );
      const headers = [
        "ID",
        "FirstName",
        "LastName",
        "Position",
        "PersistencyRate",
        "AgentStartDate",
        "UplineID",
        "UplineName",
      ];
      const format = (field) => `"${String(field ?? "").replace(/"/g, '""')}"`;
      const rows = App.state.teamMembers.map((m) =>
        [
          m.id,
          m.firstName,
          m.lastName,
          m.position,
          m.persistencyRate,
          m.agentStartDate,
          m.uplineId,
          memberMap.get(m.uplineId),
        ].map(format)
      );
      const csvContent =
        "\uFEFF" +
        headers.map(format).join(",") +
        "\n" +
        rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "team_structure.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    },
  },

  // --- PRODUCTION MODULE ---
  production: {
    elements: {
      form: document.getElementById("production-form"),
      formTitle: document.getElementById("production-form-title"),
      tableBody: document.getElementById("production-table-body"),
      cancelEditBtn: document.getElementById("cancel-production-edit-btn"),
      searchInput: document.getElementById("search-production"),
      importBtn: document.getElementById("import-prod-csv-btn"),
      importInput: document.getElementById("import-prod-csv-input"),
      exportBtn: document.getElementById("export-prod-csv-btn"),
    },

    init() {
      this.elements.form.addEventListener("submit", (e) =>
        this.handleSubmit(e)
      );
      this.elements.cancelEditBtn.addEventListener("click", () =>
        this.cancelEdit()
      );
      ["fyp", "afypRate"].forEach((id) =>
        document
          .getElementById(id)
          .addEventListener("input", () => this.calculateAfyp())
      );

      // Filters
      [
        "filter-metric",
        "filter-agent-prod",
        "filter-year",
        "filter-month",
      ].forEach((id) => {
        document
          .getElementById(id)
          .addEventListener("change", () => this.renderAllUI());
      });
      this.elements.searchInput.addEventListener("input", () =>
        this.renderAllUI()
      );

      // Import/Export
      this.elements.importBtn.addEventListener("click", () =>
        this.elements.importInput.click()
      );
      this.elements.importInput.addEventListener("change", (e) =>
        this.handleImport(e)
      );
      this.elements.exportBtn.addEventListener("click", () =>
        this.exportToCsv()
      );

      this.renderAllUI();
    },

    renderAllUI() {
      App.utils.populateAgentDropdown(
        document.getElementById("filter-agent-prod"),
        true
      );
      App.utils.populateAgentDropdown(document.getElementById("agentId"));
      this.populateYearMonthFilters();
      const filteredData = this.getFilteredData();
      this.renderDashboard();
      this.renderTable(filteredData);
    },

    calculateAfyp() {
      const fyp = parseFloat(document.getElementById("fyp").value) || 0;
      const afypRate =
        parseFloat(document.getElementById("afypRate").value) || 0;
      const afyp = fyp * (afypRate / 100);
      document.getElementById("afyp").value = afyp.toLocaleString("th-TH");
    },

    handleSubmit(e) {
      e.preventDefault();
      const id = document.getElementById("production-id").value;
      const record = {
        policyDate: document.getElementById("policyDate").value,
        agentId: parseInt(document.getElementById("agentId").value, 10),
        clientName: document.getElementById("clientName").value.trim(),
        policyType: document.getElementById("policyType").value.trim(),
        fyp: parseFloat(document.getElementById("fyp").value),
        afypRate: parseFloat(document.getElementById("afypRate").value),
        fycRate: parseFloat(document.getElementById("fycRate").value),
      };

      if (id) {
        const index = App.state.productionLog.findIndex((p) => p.id == id);
        if (index !== -1)
          App.state.productionLog[index] = {
            ...App.state.productionLog[index],
            ...record,
          };
      } else {
        record.id =
          App.state.productionLog.length > 0
            ? Math.max(...App.state.productionLog.map((p) => p.id)) + 1
            : 1;
        App.state.productionLog.push(record);
      }

      App.utils.saveState();
      this.cancelEdit();
      this.renderAllUI();
    },

    cancelEdit() {
      this.elements.form.reset();
      document.getElementById("production-id").value = "";
      this.elements.formTitle.textContent = "บันทึกผลงานใหม่";
      this.elements.cancelEditBtn.classList.add("hidden");
      document.getElementById("afyp").value = "";
      document.getElementById("policyDate").value = new Date()
        .toISOString()
        .split("T")[0];
    },

    handleEdit(id) {
      const record = App.state.productionLog.find((p) => p.id === id);
      if (record) {
        document.getElementById("production-id").value = record.id;
        document.getElementById("policyDate").value = record.policyDate;
        document.getElementById("agentId").value = record.agentId;
        document.getElementById("clientName").value = record.clientName;
        document.getElementById("policyType").value = record.policyType;
        document.getElementById("fyp").value = record.fyp;
        document.getElementById("afypRate").value = record.afypRate;
        document.getElementById("fycRate").value = record.fycRate;
        this.calculateAfyp();
        this.elements.formTitle.textContent = "แก้ไขข้อมูลผลงาน";
        this.elements.cancelEditBtn.classList.remove("hidden");
        this.elements.form.scrollIntoView({ behavior: "smooth" });
      }
    },

    handleDelete(id) {
      const record = App.state.productionLog.find((p) => p.id === id);
      App.ui.showConfirm(
        "ยืนยันการลบ",
        `คุณแน่ใจหรือไม่ว่าต้องการลบผลงานของ ${record.clientName}?`,
        () => {
          App.state.productionLog = App.state.productionLog.filter(
            (p) => p.id !== id
          );
          App.utils.saveState();
          this.renderAllUI();
        }
      );
    },

    populateYearMonthFilters() {
      const yearFilter = document.getElementById("filter-year");
      const currentYear = new Date().getFullYear();
      const years = new Set(
        App.state.productionLog.map((p) => new Date(p.policyDate).getFullYear())
      );
      years.add(currentYear);
      const selectedYear = yearFilter.value || "all";
      yearFilter.innerHTML = '<option value="all">ทุกปี</option>';
      Array.from(years)
        .sort((a, b) => b - a)
        .forEach((year) => {
          yearFilter.innerHTML += `<option value="${year}" ${
            year == selectedYear ? "selected" : ""
          }>${year}</option>`;
        });
    },

    getFilteredData() {
      const agentId = document.getElementById("filter-agent-prod").value;
      const year = document.getElementById("filter-year").value;
      const month = document.getElementById("filter-month").value;
      const searchTerm = this.elements.searchInput.value.toLowerCase();

      return App.state.productionLog.filter((p) => {
        const recordDate = new Date(p.policyDate);
        const agentMatch = agentId === "all" || p.agentId == agentId;
        const yearMatch = year === "all" || recordDate.getFullYear() == year;
        const monthMatch =
          month === "all" || recordDate.getMonth() == month - 1;
        const searchMatch =
          p.clientName.toLowerCase().includes(searchTerm) ||
          p.policyType.toLowerCase().includes(searchTerm);
        return agentMatch && yearMatch && monthMatch && searchMatch;
      });
    },

    renderTable(filteredData) {
      this.elements.tableBody.innerHTML = "";
      if (filteredData.length === 0) {
        this.elements.tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">ไม่พบข้อมูลผลงาน</td></tr>`;
        return;
      }
      const memberMap = new Map(
        App.state.teamMembers.map((m) => [m.id, `${m.firstName} ${m.lastName}`])
      );
      filteredData.forEach((p) => {
        const afyp = p.fyp * (p.afypRate / 100);
        const comm = p.fyp * (p.fycRate / 100);
        const agentName = p.agentId
          ? memberMap.get(p.agentId) || `?? ไม่พบในระบบ`
          : p.unmatchedAgentName || "?? ไม่พบในระบบ";
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td class="px-4 py-3">${p.policyDate}</td>
                    <td class="px-4 py-3 ${
                      !p.agentId ? "text-red-500" : ""
                    }">${agentName}</td>
                    <td class="px-4 py-3">${p.clientName}</td>
                    <td class="px-4 py-3 text-right">${p.fyp.toLocaleString(
                      "th-TH"
                    )}</td>
                    <td class="px-4 py-3 text-right">${afyp.toLocaleString(
                      "th-TH"
                    )}</td>
                    <td class="px-4 py-3 text-right font-semibold">${comm.toLocaleString(
                      "th-TH",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}</td>
                    <td class="px-4 py-3">
                        <button class="text-indigo-600 hover:text-indigo-900" onclick="App.production.handleEdit(${
                          p.id
                        })">แก้ไข</button>
                        <button class="text-red-600 hover:text-red-900 ml-4" onclick="App.production.handleDelete(${
                          p.id
                        })">ลบ</button>
                    </td>
                `;
        this.elements.tableBody.appendChild(row);
      });
    },

    renderDashboard() {
      const metric = document.getElementById("filter-metric").value;
      const year = document.getElementById("filter-year").value;
      const month = document.getElementById("filter-month").value;
      const agentId = document.getElementById("filter-agent-prod").value;

      let selectedDate = new Date();
      if (year !== "all" && month !== "all")
        selectedDate = new Date(year, month - 1, 15);
      else if (year !== "all") selectedDate = new Date(year, 0, 15);

      const currentYear = selectedDate.getFullYear();
      const currentMonth = selectedDate.getMonth();
      const firstDayOfQuarter = new Date(
        currentYear,
        Math.floor(currentMonth / 3) * 3,
        1
      );
      const lastDayOfQuarter = new Date(
        firstDayOfQuarter.getFullYear(),
        firstDayOfQuarter.getMonth() + 3,
        0
      );

      let monthValue = 0,
        quarterValue = 0,
        yearValue = 0,
        yearCases = 0;

      const dataToCalc = App.state.productionLog.filter(
        (p) => agentId === "all" || p.agentId == agentId
      );

      dataToCalc.forEach((p) => {
        const recordDate = new Date(p.policyDate);
        const afyp = p.fyp * (p.afypRate / 100);
        const comm = p.fyp * (p.fycRate / 100);
        let value;
        if (metric === "fyp") value = p.fyp;
        else if (metric === "afyp") value = afyp;
        else value = comm;

        if (recordDate.getFullYear() === currentYear) {
          yearValue += value;
          yearCases++;
          if (
            recordDate >= firstDayOfQuarter &&
            recordDate <= lastDayOfQuarter
          ) {
            quarterValue += value;
            if (recordDate.getMonth() === currentMonth) {
              monthValue += value;
            }
          }
        }
      });

      const metricLabel = metric.toUpperCase();
      document.getElementById(
        "metric-label-month"
      ).textContent = `${metricLabel} เดือนนี้`;
      document.getElementById(
        "metric-label-quarter"
      ).textContent = `${metricLabel} ไตรมาสนี้`;
      document.getElementById(
        "metric-label-year"
      ).textContent = `${metricLabel} ปีนี้`;
      document.getElementById(
        "metric-label-cases"
      ).textContent = `เคสทั้งหมด (${year === "all" ? "ทุกปี" : year})`;

      const displayValue = (val) =>
        val.toLocaleString("th-TH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      document.getElementById("month-value").textContent =
        month === "all" && year === "all" ? "N/A" : displayValue(monthValue);
      document.getElementById("quarter-value").textContent =
        month === "all" && year === "all" ? "N/A" : displayValue(quarterValue);
      document.getElementById("year-value").textContent =
        displayValue(yearValue);
      document.getElementById("year-cases-value").textContent =
        yearCases.toLocaleString();
    },

    handleImport(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        App.ui.showConfirm(
          "ยืนยันการนำเข้าข้อมูลผลงาน",
          "การนำเข้าข้อมูลจะลบข้อมูลผลงานปัจจุบันทั้งหมด คุณต้องการดำเนินการต่อหรือไม่?",
          () => {
            try {
              App.state.productionLog = this.parseCsv(text);
              App.utils.saveState();
              this.renderAllUI();
              App.ui.showCustomAlert(
                "สำเร็จ",
                `นำเข้าข้อมูลผลงานจำนวน ${App.state.productionLog.length} รายการเรียบร้อยแล้ว`
              );
            } catch (error) {
              App.ui.showCustomAlert(
                "เกิดข้อผิดพลาด",
                `รูปแบบไฟล์ CSV ไม่ถูกต้อง: ${error.message}`
              );
            } finally {
              event.target.value = null;
            }
          }
        );
      };
      reader.readAsText(file, "UTF-8");
    },

    parseCsv(text) {
      const lines = text
        .trim()
        .split(/\r\n|\n/)
        .slice(1);
      const records = [];
      const nameMap = new Map(
        App.state.teamMembers.map((m) => [
          `${m.firstName.trim()} ${m.lastName.trim()}`.toLowerCase(),
          m.id,
        ])
      );
      const highestId = App.state.productionLog.reduce(
        (max, p) => Math.max(max, p.id),
        0
      );

      lines.forEach((line, index) => {
        if (line.trim() === "") return;
        const values = line.split(",");
        const [
          policyDate,
          agentName,
          clientName,
          policyType,
          fyp,
          afypRate,
          fycRate,
        ] = values.map((v) => (v || "").trim().replace(/"/g, ""));
        const agentId = nameMap.get(agentName.toLowerCase()) || null;

        records.push({
          id: highestId + index + 1,
          policyDate,
          agentId,
          unmatchedAgentName: agentId ? null : agentName,
          clientName,
          policyType,
          fyp: parseFloat(fyp) || 0,
          afypRate: parseFloat(afypRate) || 100,
          fycRate: parseFloat(fycRate) || 0,
        });
      });
      return records;
    },

    exportToCsv() {
      const filteredData = this.getFilteredData();
      const memberMap = new Map(App.state.teamMembers.map((m) => [m.id, m]));
      const headers = [
        "PolicyDate",
        "AgentName",
        "ClientName",
        "PolicyType",
        "FYP",
        "AFYPRate",
        "FYCRate",
        "AFYP",
        "COMM",
      ];

      const rows = filteredData.map((p) => {
        const agent = p.agentId ? memberMap.get(p.agentId) : null;
        const agentName = agent
          ? `${agent.firstName} ${agent.lastName}`
          : p.unmatchedAgentName || "N/A";
        const afyp = p.fyp * (p.afypRate / 100);
        const comm = p.fyp * (p.fycRate / 100);
        return [
          p.policyDate,
          agentName,
          p.clientName,
          p.policyType,
          p.fyp,
          p.afypRate,
          p.fycRate,
          afyp,
          comm,
        ];
      });

      const format = (field) => `"${String(field ?? "").replace(/"/g, '""')}"`;
      const csvContent =
        "\uFEFF" +
        headers.map(format).join(",") +
        "\n" +
        rows.map((row) => row.map(format).join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "production_log.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    },
  },
};

// --- HTML TEMPLATES ---
const pageTemplates = {
  team: `
        <div class="container mx-auto p-4 md:p-8">
            <header class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">หน้าภาพรวมและจัดการโครงสร้างทีม</h1>
                <p class="text-gray-500 mt-1">Team Structure & Management Dashboard</p>
            </header>
            <section id="summary-dashboard" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
                    <div class="bg-blue-100 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                        <p class="text-gray-500 text-sm">บุคลากรทั้งหมด</p>
                        <p id="total-members" class="text-2xl font-bold">0</p>
                    </div>
                </div>
                 <div class="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
                    <div class="bg-yellow-100 p-3 rounded-full">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1-3.72a4 4 0 00-4 0A6 6 0 003 20v1z" /></svg>
                    </div>
                    <div>
                        <p class="text-gray-500 text-sm">ตัวแทน (AG)</p>
                        <p id="total-ag" class="text-2xl font-bold">0</p>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
                    <div class="bg-green-100 p-3 rounded-full">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                        <p class="text-gray-500 text-sm">ผู้บริหารงานขาย (AL)</p>
                        <p id="total-al" class="text-2xl font-bold">0</p>
                    </div>
                </div>
                 <div class="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
                     <div class="bg-purple-100 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                     </div>
                    <div>
                        <p class="text-gray-500 text-sm">ผู้บริหารระดับสูง (AE)</p>
                        <p id="total-ae" class="text-2xl font-bold">0</p>
                    </div>
                </div>
            </section>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                    <h2 class="text-xl font-bold mb-4">จัดการข้อมูลทีม</h2>
                    <div class="grid grid-cols-3 gap-2 mb-4">
                        <button id="add-member-btn" class="col-span-3 sm:col-span-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">
                            + เพิ่มบุคลากร
                        </button>
                        <button id="import-csv-btn" class="col-span-3 sm:col-span-1 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition duration-300">
                            Import CSV
                        </button>
                        <button id="export-csv-btn" class="col-span-3 sm:col-span-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                            Export CSV
                        </button>
                    </div>
                    <input type="file" id="import-csv-input" accept=".csv" class="hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่ง</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="team-table-body" class="bg-white divide-y divide-gray-200"></tbody>
                        </table>
                    </div>
                </div>
                <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow-md min-h-[400px]">
                    <h2 class="text-xl font-bold mb-4">แผนผังโครงสร้างทีม</h2>
                    <div id="org-chart" class="w-full h-full overflow-auto"></div>
                </div>
            </div>
        </div>
    `,
  benefits: `
        <div class="container mx-auto p-4 md:p-8">
            <header class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">สรุปโครงสร้างผลประโยชน์</h1>
                <p class="text-gray-500 mt-1">Benefit Structure Summary</p>
            </header>
            <div class="mb-8">
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-6" aria-label="Tabs">
                        <button class="tab-button active whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="ag">ตัวแทน (AG)</button>
                        <button class="tab-button text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="al">ผู้บริหารงานขาย (AL)</button>
                        <button class="tab-button text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="ae">ผู้บริหารระดับสูง (AE)</button>
                    </nav>
                </div>
            </div>
            <div id="tab-content">
                <div id="ag-content" class="tab-pane space-y-8">
                    <!-- AG Benefits Content is loaded from a separate object -->
                </div>
                <div id="al-content" class="tab-pane space-y-8 hidden">
                    <!-- AL Benefits Content is loaded from a separate object -->
                </div>
                <div id="ae-content" class="tab-pane space-y-8 hidden">
                    <!-- AE Benefits Content is loaded from a separate object -->
                </div>
            </div>
        </div>
    `,
  production: `
        <div class="container mx-auto p-4 md:p-8">
            <header class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">บันทึกและจัดการผลงาน</h1>
                <p class="text-gray-500 mt-1">Production Log & Management</p>
            </header>
            <section class="control-panel bg-white p-4 rounded-xl shadow-md mb-8">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label for="filter-metric" class="block text-sm font-medium text-gray-700">แสดงข้อมูล</label>
                        <select id="filter-metric" class="mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="fyp" selected>FYP</option>
                            <option value="afyp">AFYP</option>
                            <option value="comm">COMM</option>
                        </select>
                    </div>
                    <div>
                         <label for="filter-agent-prod" class="block text-sm font-medium text-gray-700">ตัวแทน</label>
                        <select id="filter-agent-prod" class="mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="all">ตัวแทนทั้งหมด</option>
                        </select>
                    </div>
                    <div>
                        <label for="filter-year" class="block text-sm font-medium text-gray-700">ปี</label>
                        <select id="filter-year" class="mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="all">ทุกปี</option>
                        </select>
                    </div>
                    <div>
                        <label for="filter-month" class="block text-sm font-medium text-gray-700">เดือน</label>
                        <select id="filter-month" class="mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                             <option value="all">ทุกเดือน</option>
                            <option value="1">มกราคม</option> <option value="2">กุมภาพันธ์</option> <option value="3">มีนาคม</option>
                            <option value="4">เมษายน</option> <option value="5">พฤษภาคม</option> <option value="6">มิถุนายน</option>
                            <option value="7">กรกฎาคม</option> <option value="8">สิงหาคม</option> <option value="9">กันยายน</option>
                            <option value="10">ตุลาคม</option> <option value="11">พฤศจิกายน</option> <option value="12">ธันวาคม</option>
                        </select>
                    </div>
                </div>
            </section>
            <section id="production-summary-dashboard" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-xl shadow-md">
                    <p id="metric-label-month" class="text-gray-500 text-sm">FYP เดือนนี้</p>
                    <p id="month-value" class="text-2xl font-bold">0</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-md">
                    <p id="metric-label-quarter" class="text-gray-500 text-sm">FYP ไตรมาสนี้</p>
                    <p id="quarter-value" class="text-2xl font-bold">0</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-md">
                    <p id="metric-label-year" class="text-gray-500 text-sm">FYP ปีนี้</p>
                    <p id="year-value" class="text-2xl font-bold">0</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-md">
                    <p id="metric-label-cases" class="text-gray-500 text-sm">เคสทั้งหมด (ปีนี้)</p>
                    <p id="year-cases-value" class="text-2xl font-bold">0</p>
                </div>
            </section>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1 bg-white p-6 rounded-xl shadow-md self-start">
                    <h2 class="text-xl font-bold mb-4" id="production-form-title">บันทึกผลงานใหม่</h2>
                    <form id="production-form" class="space-y-4">
                        <input type="hidden" id="production-id">
                        <div>
                            <label for="policyDate" class="block text-sm font-medium text-gray-700">วันที่ออกกรมธรรม์</label>
                            <input type="date" id="policyDate" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                        </div>
                         <div>
                            <label for="agentId" class="block text-sm font-medium text-gray-700">ตัวแทนผู้ขาย</label>
                            <select id="agentId" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></select>
                        </div>
                         <div>
                            <label for="clientName" class="block text-sm font-medium text-gray-700">ชื่อผู้เอาประกัน</label>
                            <input type="text" id="clientName" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                        </div>
                        <div>
                            <label for="policyType" class="block text-sm font-medium text-gray-700">แบบประกัน</label>
                            <input type="text" id="policyType" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                        </div>
                         <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="fyp" class="block text-sm font-medium text-gray-700">เบี้ยประกัน (FYP)</label>
                                <input type="number" id="fyp" step="100" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                            </div>
                            <div>
                                <label for="afypRate" class="block text-sm font-medium text-gray-700">อัตราส่วน AFYP (%)</label>
                                <input type="number" id="afypRate" value="100" step="1" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                            </div>
                        </div>
                         <div class="grid grid-cols-2 gap-4">
                            <div>
                                 <label for="fycRate" class="block text-sm font-medium text-gray-700">อัตราค่าบำเหน็จ (%)</label>
                                <input type="number" id="fycRate" value="30" step="1" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                            </div>
                            <div>
                                <label for="afyp" class="block text-sm font-medium text-gray-500">AFYP (คำนวณ)</label>
                                <input type="text" id="afyp" readonly class="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm py-2 px-3">
                            </div>
                        </div>
                        <div class="flex justify-end space-x-2 pt-4">
                           <button type="button" id="cancel-production-edit-btn" class="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 hidden">ยกเลิก</button>
                           <button type="submit" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 w-full">บันทึกผลงาน</button>
                        </div>
                    </form>
                     <div class="mt-8 border-t pt-6">
                        <h3 class="text-lg font-semibold mb-4">จัดการข้อมูลผลงาน</h3>
                        <div class="grid grid-cols-2 gap-2">
                            <button id="import-prod-csv-btn" class="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition duration-300">
                                Import CSV
                            </button>
                            <button id="export-prod-csv-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                                Export CSV
                            </button>
                        </div>
                        <input type="file" id="import-prod-csv-input" accept=".csv" class="hidden">
                    </div>
                </div>
                <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                     <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                        <h2 class="text-xl font-bold">รายการผลงานทั้งหมด</h2>
                        <input type="text" id="search-production" placeholder="ค้นหาชื่อผู้เอาประกัน/แบบประกัน..." class="block w-full md:w-1/2 border-gray-300 rounded-md shadow-sm">
                     </div>
                     <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left font-medium text-gray-500">วันที่</th>
                                    <th class="px-4 py-3 text-left font-medium text-gray-500">ตัวแทน</th>
                                    <th class="px-4 py-3 text-left font-medium text-gray-500">ผู้เอาประกัน</th>
                                    <th class="px-4 py-3 text-right font-medium text-gray-500">FYP</th>
                                    <th class="px-4 py-3 text-right font-medium text-gray-500">AFYP</th>
                                    <th class="px-4 py-3 text-right font-medium text-gray-500">COMM</th>
                                    <th class="px-4 py-3 text-left font-medium text-gray-500">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="production-table-body" class="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>
        </div>
    `,
  report: `
         <div class="container mx-auto p-4 md:p-8">
            <header class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">รายงานผลประโยชน์</h1>
                <p class="text-gray-500 mt-1">Commission & Benefit Calculation Report</p>
            </header>
            <section class="control-panel bg-white p-4 rounded-xl shadow-md mb-8">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label for="report-member" class="block text-sm font-medium text-gray-700">เลือกบุคลากร</label>
                        <select id="report-member" class="mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"></select>
                    </div>
                     <div>
                        <label for="report-year" class="block text-sm font-medium text-gray-700">เลือกปี</label>
                        <select id="report-year" class="mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"></select>
                    </div>
                    <div>
                        <label for="report-period" class="block text-sm font-medium text-gray-700">เลือกช่วงเวลา</label>
                        <select id="report-period" class="mt-1 block w-full rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                             <option value="year">สรุปทั้งปี</option>
                             <optgroup label="รายไตรมาส">
                                 <option value="q1">ไตรมาสที่ 1 (ม.ค.-มี.ค.)</option> <option value="q2">ไตรมาสที่ 2 (เม.ย.-มิ.ย.)</option>
                                 <option value="q3">ไตรมาสที่ 3 (ก.ค.-ก.ย.)</option> <option value="q4">ไตรมาสที่ 4 (ต.ค.-ธ.ค.)</option>
                             </optgroup>
                             <optgroup label="รายเดือน">
                                <option value="1">มกราคม</option> <option value="2">กุมภาพันธ์</option> <option value="3">มีนาคม</option>
                                <option value="4">เมษายน</option> <option value="5">พฤษภาคม</option> <option value="6">มิถุนายน</option>
                                <option value="7">กรกฎาคม</option> <option value="8">สิงหาคม</option> <option value="9">กันยายน</option>
                                <option value="10">ตุลาคม</option> <option value="11">พฤศจิกายน</option> <option value="12">ธันวาคม</option>
                             </optgroup>
                        </select>
                    </div>
                    <button id="calculate-report-btn" class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">คำนวณผลประโยชน์</button>
                </div>
            </section>
            <div id="report-results-container" class="bg-white p-6 rounded-xl shadow-md hidden">
                <h2 id="report-header" class="text-xl font-bold mb-4 border-b pb-3"></h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">รายการผลประโยชน์</th>
                                <th class="px-4 py-3 text-right font-medium text-gray-500">ยอดที่คำนวณได้ (บาท)</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">หมายเหตุ/วิธีคำนวณ</th>
                            </tr>
                        </thead>
                        <tbody id="report-table-body"></tbody>
                        <tfoot class="bg-gray-50 font-bold">
                            <tr>
                                <td class="px-4 py-3 text-left">รวมผลประโยชน์ทั้งสิ้น</td>
                                <td id="report-total" class="px-4 py-3 text-right text-lg text-blue-600"></td>
                                <td class="px-4 py-3"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
             <div id="report-placeholder" class="text-center py-12 bg-white rounded-xl shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h3m-3-10l-1.5-1.5a2.25 2.25 0 00-3.182 0l-1.5 1.5M9 7v2.25M15 7v2.25m0 10V9.75M9 9.75M15 9.75M3 11.25a8.963 8.963 0 013.364-6.857 8.963 8.963 0 0111.272 0 8.963 8.963 0 013.364 6.857m-18 0a8.963 8.963 0 01-3.364-6.857m0 0A8.963 8.963 0 013 4.393m18 0a8.963 8.963 0 01-3.364 6.857m3.364-6.857A8.963 8.963 0 0121 11.25m-18 0a8.963 8.963 0 013.364 6.857m11.272 0a8.963 8.963 0 013.364-6.857m-3.364 6.857a8.963 8.963 0 01-11.272 0m11.272 0A8.963 8.963 0 019 18.107m0 0A8.963 8.963 0 013 11.25" /></svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">กรุณาเลือกข้อมูลและกด "คำนวณผลประโยชน์"</h3>
                <p class="mt-1 text-sm text-gray-500">เลือกบุคลากร, ปี, และช่วงเวลาที่ต้องการเพื่อดูรายงาน</p>
            </div>
        </div>
    `,
};

const benefitContent = {
  ag: `...`, // AG benefit cards HTML
  al: `...`, // AL benefit cards HTML
  ae: `...`, // AE benefit cards HTML
};
// --- APP ENTRY POINT ---
document.addEventListener("DOMContentLoaded", () => {
  google.charts.load("current", { packages: ["orgchart"] });
  google.charts.setOnLoadCallback(() => App.init());
});

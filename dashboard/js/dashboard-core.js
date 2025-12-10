
// BX Media Dashboard Core Logic
// Shared helpers: API, auth, utilities, sidebar wiring

(function() {
  const API_BASE = "https://script.google.com/macros/s/AKfycbyFiMCMGZMAFJTpORtauFS7AzmV_xZ2I4bE1_NnE7dDfLlQfo-tL7YZw5Cue2tQ2nCQJw/exec";
  const SESSION_KEY = "bxm_dashboard_session_v1";
  let cachedData = null;

  function unwrapBody(obj) {
    if (obj && typeof obj === "object" && "body" in obj && obj.body) return obj.body;
    return obj;
  }

  async function apiGetAll(force = false) {
    if (!force && cachedData) return cachedData;
    const res = await fetch(API_BASE + "?action=getAll");
    if (!res.ok) throw new Error("Failed to fetch data");
    const json = await res.json();
    cachedData = unwrapBody(json);
    return cachedData;
  }

  async function apiPost(payload) {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Request failed");
    const json = await res.json();
    return unwrapBody(json);
  }

  async function sha256(text) {
    if (!window.crypto?.subtle) return text;
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function computeSummary(tasks) {
    const summary = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      blocked: 0,
    };
    (tasks || []).forEach((t) => {
      const s = t.status || "not-started";
      if (s === "completed") summary.completed++;
      else if (s === "in-progress") summary.inProgress++;
      else if (s === "blocked") summary.blocked++;
      else summary.notStarted++;
    });
    return summary;
  }

  function computeProjectProgress(tasks) {
    if (!tasks || !tasks.length) return 0;
    const values = tasks.map((t) => Math.max(0, Math.min(100, Number(t.progress || 0))));
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }

  function formatDate(val) {
    if (!val) return "—";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(val) {
    if (!val) return "—";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function requireAuth(options = {}, redirectIfMissing = true) {
    const sess = getSession();
    if (!sess && redirectIfMissing) {
      window.location.href = "login.html";
      return null;
    }
    if (!sess) return null;

    if (options.role && sess.role !== options.role) {
      // If wrong role, send to overview
      window.location.href = "dashboard-overview.html";
      return null;
    }
    return sess;
  }

  function updateSidebarStats(data) {
    if (!data) return;
    const projects = data.projects || [];
    const tasks = data.tasks || [];
    const summary = computeSummary(tasks);

    const setText = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    setText("statTotalProjects", projects.length);
    setText("statTotalTasks", tasks.length);
    setText("statInProgress", summary.inProgress);
    setText("statCompleted", summary.completed);
    setText("statNotStarted", summary.notStarted);
  }

  function initSidebarChrome() {
    const sess = getSession();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        clearSession();
        window.location.href = "login.html";
      });
    }

    // Hide admin-only links for clients
    if (sess && sess.role !== "admin") {
      const adminLinks = ["navClientsLink"];
      adminLinks.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
    }

    // Active link
    const path = (window.location.pathname.split("/").pop() || "").toLowerCase();
    const map = {
      "dashboard-overview.html": "navOverview",
      "dashboard-clients.html": "navClientsLink",
      "dashboard-projects.html": "navProjectsLink",
      "dashboard-tasks.html": "navTasksLink",
    };
    const activeId = map[path];
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) el.classList.add("active");
    }
  }

  document.addEventListener("DOMContentLoaded", initSidebarChrome);

  window.BXCore = {
    apiGetAll,
    apiPost,
    sha256,
    computeSummary,
    computeProjectProgress,
    formatDate,
    formatDateTime,
    saveSession,
    getSession,
    clearSession,
    requireAuth,
    updateSidebarStats,
    API_BASE,
  };
})();

// BX Media Dashboard Core Logic
// Shared helpers: API, auth, utilities, sidebar wiring

(function() {
  const API_BASE = "https://script.google.com/macros/s/AKfycbzNjg0iGqHY0vIIgjIId9eJElTC-wK42FKQYS7DBVAzJvQ-4YkRh_o1RPFtJhLpfi0OMg/exec";
  const SESSION_KEY = "bxm_dashboard_session_v1";
  let cachedData = null;
  let firstLoadPending = true;

  function ensurePageLoader() {
    if (document.getElementById("pageLoader")) return;
    const mount = () => {
      if (document.getElementById("pageLoader")) return;
      const loader = document.createElement("div");
      loader.id = "pageLoader";
      loader.className = "page-loader";
      loader.innerHTML = `
        <div class="spinner" aria-hidden="true"></div>
        <div class="message" role="status" aria-live="polite">Loading...</div>
      `;
      document.body.appendChild(loader);
    };
    if (document.body) {
      mount();
    } else {
      document.addEventListener("DOMContentLoaded", mount);
    }
  }

  function showPageLoader(message) {
    ensurePageLoader();
    const loader = document.getElementById("pageLoader");
    if (!loader) return;
    const msg = loader.querySelector(".message");
    if (msg) msg.textContent = message || "Loading...";
    loader.classList.add("is-visible");
  }

  function hidePageLoader() {
    const loader = document.getElementById("pageLoader");
    if (!loader) return;
    loader.classList.remove("is-visible");
  }

  function setButtonLoading(btn, isLoading, loadingText) {
    if (!btn) return;
    const labelEl = btn.querySelector(".btn-text");
    if (!btn.dataset.defaultLabel) {
      if (labelEl) {
        btn.dataset.defaultLabel = labelEl.textContent.trim();
      } else {
        btn.dataset.defaultLabel = btn.textContent.trim();
      }
    }
    if (isLoading) {
      const nextLabel = loadingText || "Loading...";
      if (labelEl) {
        labelEl.textContent = nextLabel;
      } else {
        btn.textContent = nextLabel;
      }
    } else {
      const restore = btn.dataset.defaultLabel || "Submit";
      if (labelEl) {
        labelEl.textContent = restore;
      } else {
        btn.textContent = restore;
      }
    }
    btn.disabled = !!isLoading;
    btn.classList.toggle("is-loading", !!isLoading);
    btn.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  function renderSkeleton(container, type, count = 3) {
    if (!container) return;
    container.innerHTML = "";
    const classes = ["skeleton", `skeleton-${type}`];
    for (let i = 0; i < count; i += 1) {
      const item = document.createElement("div");
      item.className = classes.join(" ");
      container.appendChild(item);
    }
  }

  function unwrapBody(obj) {
    if (obj && typeof obj === "object" && "body" in obj && obj.body) return obj.body;
    return obj;
  }

  async function apiGetAll(force = false) {
    if (!force && cachedData) return cachedData;
    if (firstLoadPending) showPageLoader("Loading dashboard...");
    try {
      const res = await fetch(API_BASE + "?action=getAll");
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      cachedData = unwrapBody(json);
      return cachedData;
    } finally {
      if (firstLoadPending) {
        firstLoadPending = false;
        hidePageLoader();
      }
    }
  }

  async function apiPost(payload) {
    const res = await fetch(API_BASE, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Request failed");

    const json = await res.json();

    // Important: force cache refresh
    cachedData = null;

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
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(val) {
    if (!val) return "";
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
      showPageLoader("Redirecting to sign in...");
      window.location.href = "login.html";
      return null;
    }
    if (!sess) return null;

    if (options.role && sess.role !== options.role) {
      // If wrong role, send to overview
      showPageLoader("Redirecting...");
      window.location.href = "dashboard-overview.html";
      return null;
    }
    return sess;
  }

  function updateSidebarStats(data) {
    if (!data) return;
    const sess = getSession();

    let projects = data.projects || [];
    let tasks = data.tasks || [];

    if (sess && sess.role === "client") {
      const clients = data.clients || [];
      let clientId = sess.clientId;
      if (!clientId && sess.username) {
        const match = clients.find((c) => c.username === sess.username);
        clientId = match ? match.clientId : null;
      }

      if (clientId) {
        projects = projects.filter((p) => p.clientId === clientId);
        const projectIds = new Set(projects.map((p) => p.projectId));
        tasks = tasks.filter((t) => projectIds.has(t.projectId));
      } else {
        projects = [];
        tasks = [];
      }
    }

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
        showPageLoader("Signing out...");
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
    if (path.startsWith("client-") && sess && sess.role !== "client") {
      showPageLoader("Redirecting...");
      window.location.href = "dashboard-overview.html";
      return;
    }
    const map = {
      "dashboard-overview.html": "navOverview",
      "dashboard-clients.html": "navClientsLink",
      "dashboard-projects.html": "navProjectsLink",
      "dashboard-tasks.html": "navTasksLink",
      "client-dashboard-overview.html": "navOverview",
      "client-dashboard-projects.html": "navProjectsLink",
      "client-dashboard-tasks.html": "navTasksLink",
    };
    const activeId = map[path];
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) el.classList.add("active");
    }

    const nav = document.querySelector(".nav");
    if (nav) {
      nav.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;
        if (link.target === "_blank") return;
        showPageLoader("Loading...");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensurePageLoader();
    initSidebarChrome();
  });

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
    showPageLoader,
    hidePageLoader,
    setButtonLoading,
    renderSkeleton,
    API_BASE,
  };
})();

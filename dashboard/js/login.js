document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const statusBox = document.getElementById("loginStatus");

  if (!form) return;
  const submitBtn = form.querySelector("button[type=\"submit\"]");

  if (errorBox) errorBox.style.display = "none";
  if (statusBox) statusBox.style.display = "none";

  const inputs = Array.from(form.querySelectorAll("input, select, textarea"));

  const setStatus = (message, type = "info") => {
    if (!statusBox) return;
    statusBox.classList.remove("alert-info", "alert-success", "alert-error");
    statusBox.classList.add(`alert-${type}`);
    statusBox.textContent = message || "";
    statusBox.style.display = message ? "block" : "none";
  };

  const setLoading = (isLoading, message) => {
    if (submitBtn) BXCore.setButtonLoading(submitBtn, isLoading, message || "Signing in...");
    inputs.forEach((input) => {
      input.disabled = isLoading;
    });
    form.setAttribute("aria-busy", isLoading ? "true" : "false");
    if (isLoading) {
      BXCore.showPageLoader(message || "Signing you in...");
    } else {
      BXCore.hidePageLoader();
    }
    if (message) setStatus(message, "info");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.style.display = "none";
    setStatus("", "info");

    const fd = new FormData(form);
    const username = String(fd.get("username") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    setLoading(true, "Signing in...");

    try {
      const data = await BXCore.apiGetAll(true);
      const accounts = data.accounts || [];
      const clients  = data.clients || [];

      // ------------------------
      // 1. ADMIN LOGIN
      // ------------------------
      const admin = accounts.find(a =>
        String(a.username || "").trim().toLowerCase() === username
      );

      if (admin) {
        const ok = String(admin.password || "") === password;

        if (!ok) {
          if (errorBox) {
            errorBox.textContent = "Invalid username or password.";
            errorBox.style.display = "block";
          }
          setLoading(false);
          setStatus("", "info");
          return;
        }

        BXCore.saveSession({
          username: admin.username,
          role: "admin",
          clientId: null,
          clientName: null
        });

        setStatus("Signed in. Redirecting to your dashboard...", "success");
        BXCore.showPageLoader("Redirecting...");
        setTimeout(() => {
          window.location.href = "dashboard-overview.html";
        }, 350);
        return;
      }

      // ------------------------
      // 2. CLIENT LOGIN
      // ------------------------
      const client = clients.find(c =>
        String(c.username || "").trim().toLowerCase() === username
      );

      if (!client) {
        // No client with this username
        if (errorBox) {
          errorBox.textContent = "Invalid username or password.";
          errorBox.style.display = "block";
        }
        setLoading(false);
        setStatus("", "info");
        return;
      }

      const ok = String(client.password || "") === password;

      if (!ok) {
        if (errorBox) {
          errorBox.textContent = "Invalid username or password.";
          errorBox.style.display = "block";
        }
        setLoading(false);
        setStatus("", "info");
        return;
      }

      // Save session for CLIENT
      BXCore.saveSession({
        username: client.username,
        role: "client",
        clientId: client.clientId,
        clientName: client.clientName
      });

      setStatus("Signed in. Redirecting to your dashboard...", "success");
      BXCore.showPageLoader("Redirecting...");
      setTimeout(() => {
        window.location.href = "client-dashboard-overview.html";
      }, 350);

    } catch (err) {
      console.error(err);
      if (errorBox) {
        errorBox.textContent = "Login failed. Please try again.";
        errorBox.style.display = "block";
      }
      setLoading(false);
      setStatus("", "info");
    }
  });
});

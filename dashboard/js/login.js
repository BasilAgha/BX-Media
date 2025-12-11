document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  if (!form) return;
  if (errorBox) errorBox.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.style.display = "none";

    const fd = new FormData(form);
    const username = String(fd.get("username") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");

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
          if (errorBox) errorBox.style.display = "block";
          return;
        }

        BXCore.saveSession({
          username: admin.username,
          role: "admin",
          clientId: null,
          clientName: null
        });

        window.location.href = "dashboard-overview.html";
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
        if (errorBox) errorBox.style.display = "block";
        return;
      }

      const ok = String(client.password || "") === password;

      if (!ok) {
        if (errorBox) errorBox.style.display = "block";
        return;
      }

      // Save session for CLIENT
      BXCore.saveSession({
        username: client.username,
        role: "client",
        clientId: client.clientId,
        clientName: client.clientName
      });

      window.location.href = "dashboard-overview.html";

    } catch (err) {
      console.error(err);
      if (errorBox) {
        errorBox.textContent = "Login failed. Please try again.";
        errorBox.style.display = "block";
      }
    }
  });
});

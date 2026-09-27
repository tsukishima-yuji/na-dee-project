/* =========================================================
   admin-auth.js — logic for admin-login.html only
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Already signed in? Skip straight to the dashboard.
  if (isAdminLoggedIn()) {
    window.location.href = "admin-dashboard.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
    const submitBtn = document.getElementById("loginBtn");

    errorBox.classList.remove("show");
    submitBtn.disabled = true;

    const result = await adminLogin(email, password); // mock-api.js
    if (result.success) {
      window.location.href = "admin-dashboard.html";
    } else {
      errorBox.textContent = t("login_error");
      errorBox.classList.add("show");
      submitBtn.disabled = false;
    }
  });
});
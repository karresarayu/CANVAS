// client/auth.js
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");

const apiBase = "/api/auth"; // backend routes

if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      return showMessage("Please fill in all fields.", "error");
    }

    try {
      const res = await fetch(`${apiBase}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showMessage("Signup successful! Redirecting...", "success");
        setTimeout(() => (window.location.href = "index.html"), 1000);
      } else {
        showMessage(data.error || "Signup failed.", "error");
      }
    } catch (err) {
      showMessage("Network error during signup.", "error");
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      return showMessage("Please fill in all fields.", "error");
    }

    try {
      const res = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showMessage("Login successful! Redirecting...", "success");
        setTimeout(() => (window.location.href = "index.html"), 1000);
      } else {
        showMessage(data.error || "Login failed.", "error");
      }
    } catch (err) {
      showMessage("Network error during login.", "error");
    }
  });
}

function showMessage(msg, type) {
  if (message) {
    message.textContent = msg;
    message.style.color = type === "error" ? "red" : "green";
  }
}

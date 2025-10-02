/* TranscriptEase - Order page wiring */
(function () {
  // Ensure API_BASE exists (config.js is optional; fallback here)
  if (!window.API_BASE) {
    const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname) || location.origin === "null" || location.protocol === "file:";
    window.API_BASE = isLocal ? "http://localhost:3000" : "https://REPLACE_WITH_YOUR_SERVER_URL";
  }

  const form = document.getElementById("orderForm");
  const emailInput = document.getElementById("schoolEmail");
  const idInput = document.getElementById("studentId");
  const schoolSelect = document.getElementById("university");

  const emailError = document.getElementById("emailError");
  const idError = document.getElementById("idError");
  const schoolError = document.getElementById("schoolError");

  const confirmation = document.getElementById("confirmation");
  const confText = document.getElementById("confText");

  function show(el) { el.classList.remove("hidden"); el.setAttribute("aria-hidden", "false"); }
  function hide(el) { el.classList.add("hidden"); el.setAttribute("aria-hidden", "true"); }

  function validateEmail(value) {
    // very light check + encourage .edu
    const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return basic;
  }

  function maskEmail(email) {
    const [user, domain] = email.split("@");
    if (!domain) return "•••@•••";
    const u = user.length <= 2 ? user[0] + "•" : user[0] + "•".repeat(user.length - 2) + user[user.length - 1];
    return `${u}@${domain}`;
  }

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || data?.message || res.statusText || "Request failed";
      throw new Error(msg);
    }
    return data;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Reset errors
    hide(emailError); hide(idError); hide(schoolError);

    const email = emailInput.value.trim();
    const studentId = idInput.value.trim();
    const university = schoolSelect.value.trim();

    let valid = true;
    if (!validateEmail(email) || !email.endsWith(".edu")) {
      emailError.textContent = "Please enter a valid .edu school email.";
      show(emailError);
      valid = false;
    }
    if (studentId.length < 4) {
      idError.textContent = "Please enter your student ID (at least 4 characters).";
      show(idError);
      valid = false;
    }
    if (!university) {
      show(schoolError);
      valid = false;
    }
    if (!valid) return;

    // Disable submit button to avoid double submit
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending code...";

    try {
      const payload = { email, studentId, university };
      const data = await postJSON(`${window.API_BASE}/api/send-code`, payload);
      // Persist orderId for verification step
      sessionStorage.setItem("te.orderId", data.orderId);
      sessionStorage.setItem("te.maskedEmail", data.maskedEmail || maskEmail(email));

      confText.textContent = `We sent a 6-digit code to ${data.maskedEmail || maskEmail(email)}. You'll be redirected to verification.`;
      show(confirmation);

      // Redirect to verify page after short delay
      setTimeout(() => {
        location.href = "verify.html";
      }, 1200);
    } catch (err) {
      confText.textContent = `Couldn't send code: ${err.message}. Please try again in a minute.`;
      show(confirmation);
      confirmation.classList.remove("border-green-200", "bg-green-50");
      confirmation.classList.add("border-red-200", "bg-red-50");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
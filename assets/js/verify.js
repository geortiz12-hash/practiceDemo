/* TranscriptEase - Verify page wiring */
(function () {
  // Ensure API_BASE exists (config.js is optional; fallback here)
  if (!window.API_BASE) {
    const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname) || location.origin === "null" || location.protocol === "file:";
    window.API_BASE = isLocal ? "http://localhost:3000" : "https://REPLACE_WITH_YOUR_SERVER_URL";
  }

  const noPending = document.getElementById("noPending");
  const verifyArea = document.getElementById("verifyArea");
  const maskedEmailEl = document.getElementById("maskedEmail");
  const info = document.getElementById("info");

  const form = document.getElementById("verifyForm");
  const codeInput = document.getElementById("codeInput");
  const codeError = document.getElementById("codeError");

  const success = document.getElementById("success");
  const successText = document.getElementById("successText");
  const resendBtn = document.getElementById("resendBtn");

  function show(el) { el.classList.remove("hidden"); el.setAttribute("aria-hidden", "false"); }
  function hide(el) { el.classList.add("hidden"); el.setAttribute("aria-hidden", "true"); }

  function getOrderId() {
    return sessionStorage.getItem("te.orderId");
  }
  function getMaskedEmail() {
    return sessionStorage.getItem("te.maskedEmail") || "•••";
  }

  async function getJSON(url) {
    const res = await fetch(url, { method: "GET", credentials: "omit" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || data?.message || res.statusText || "Request failed";
      throw new Error(msg);
    }
    return data;
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

  async function loadPending(orderId) {
    try {
      const data = await getJSON(`${window.API_BASE}/api/pending/${orderId}`);
      maskedEmailEl.textContent = data.maskedEmail || getMaskedEmail();
      if (data.expiresAt) {
        const dt = new Date(data.expiresAt);
        info.textContent = `This code expires at ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
      } else {
        info.textContent = "";
      }
    } catch (err) {
      // If pending not found, show "no pending"
      hide(verifyArea);
      show(noPending);
    }
  }

  async function init() {
    const orderId = getOrderId();
    if (!orderId) {
      hide(verifyArea);
      show(noPending);
      return;
    }
    maskedEmailEl.textContent = getMaskedEmail();
    await loadPending(orderId);
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(codeError);
    const orderId = getOrderId();
    if (!orderId) { hide(verifyArea); show(noPending); return; }

    const code = codeInput.value.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      codeError.textContent = "Invalid code. Please enter the 6 digits in your email.";
      show(codeError);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    try {
      const data = await postJSON(`${window.API_BASE}/api/verify-code`, { orderId, code });
      // On success, clear session, show success
      sessionStorage.removeItem("te.orderId");
      sessionStorage.removeItem("te.maskedEmail");
      successText.textContent = data.message || "Your email has been verified and your transcript order is confirmed.";
      show(success);
      // Optionally hide form
      hide(form);
    } catch (err) {
      codeError.textContent = err.message || "Invalid code. Please try again.";
      show(codeError);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  resendBtn?.addEventListener("click", async () => {
    const orderId = getOrderId();
    if (!orderId) { hide(verifyArea); show(noPending); return; }

    try { resendBtn.disabled = true; } catch (e) {}

    try {
      const res = await fetch(`${window.API_BASE}/api/resend/${orderId}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);
      info.textContent = (data.message || "A new code has been sent.") + (data.expiresAt ? " Code expires soon." : "");
      // Update masked email if provided
      if (data.maskedEmail) {
        maskedEmailEl.textContent = data.maskedEmail;
        sessionStorage.setItem("te.maskedEmail", data.maskedEmail);
      }
    } catch (err) {
      info.textContent = `Couldn't resend code: ${err.message}`;
    } finally {
      try { resendBtn.disabled = false; } catch (e) {}
    }
  });

  // Kick off
  init();
})();
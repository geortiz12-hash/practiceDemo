document.addEventListener('DOMContentLoaded', function () {
  var orderId = null;
  try { orderId = localStorage.getItem('pendingOrderId'); } catch (err) { console.warn(err); }
  if (!orderId) {
    document.getElementById('noPending').classList.remove('hidden');
    document.getElementById('verifyArea').classList.add('hidden');
    return;
  }

  var maskedEmailEl = document.getElementById('maskedEmail');
  var codeInput = document.getElementById('codeInput');
  var codeError = document.getElementById('codeError');
  var info = document.getElementById('info');
  var success = document.getElementById('success');
  var successText = document.getElementById('successText');

  function maskEmail(email) {
    var parts = email.split('@');
    if (parts.length !== 2) return email;
    var local = parts[0];
    var domain = parts[1];
    if (local.length <= 2) local = local[0] + '*';
    else local = local[0] + Array(Math.max(0, local.length - 2)).fill('*').join('') + local.slice(-1);
    return local + '@' + domain;
  }

  var pendingData = null;
  var API_BASE = window.API_BASE || '';

  // load pending info from server
  fetch(API_BASE + '/api/pending/' + encodeURIComponent(orderId)).then(function (r) { return r.json(); }).then(function (data) {
    if (!data || !data.ok) {
      document.getElementById('noPending').classList.remove('hidden');
      document.getElementById('verifyArea').classList.add('hidden');
      return;
    }
    pendingData = data;
    maskedEmailEl.textContent = data.maskedEmail || '';
    updateInfo();
    var infoTimer = setInterval(updateInfo, 10000);

    document.getElementById('resendBtn').addEventListener('click', function () {
      fetch(API_BASE + '/api/resend/' + encodeURIComponent(orderId), { method: 'POST' }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res || !res.ok) { alert('Failed to resend code'); return; }
        alert('A new verification code was sent to ' + (res.maskedEmail || 'your email') + ' (mock).');
        pendingData = res; updateInfo();
      }).catch(function (err) { console.error(err); alert('Network error while resending'); });
    });

    function isExpired() { return Date.now() > (pendingData.expiresAt || 0); }
    function updateInfo() {
      if (!pendingData) return;
      if (isExpired()) info.textContent = 'The code has expired. Click "Resend Code" to get a new one.';
      else {
        var mins = Math.ceil(((pendingData.expiresAt || 0) - Date.now()) / 60000);
        info.textContent = 'The code will expire in ' + mins + ' minute(s).';
      }
    }

    // attach submit handler now that pendingData exists
    document.getElementById('verifyForm').addEventListener('submit', function (e) {
      e.preventDefault();
      codeError.classList.add('hidden');
      var entered = (codeInput.value || '').trim();
      if (!entered || entered.length < 6) { codeError.textContent = 'Please enter the 6-digit code.'; codeError.classList.remove('hidden'); return; }
      if (isExpired()) { codeError.textContent = 'This code has expired. Please resend.'; codeError.classList.remove('hidden'); return; }

      fetch(API_BASE + '/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId, code: entered })
      }).then(function (r) { return r.json(); }).then(function (resp) {
        if (!resp || !resp.ok) { codeError.textContent = (resp && resp.error) || 'Verification failed'; codeError.classList.remove('hidden'); return; }
        successText.value = 'Thank you — your request for ' + (resp.confirmed && resp.confirmed.university || pendingData.university || '') + ' has been confirmed. We will process it shortly.';
        success.classList.remove('hidden');
        success.setAttribute('aria-hidden', 'false');
        document.getElementById('verifyForm').querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
      }).catch(function (err) { console.error(err); codeError.textContent = 'Network error verifying code'; codeError.classList.remove('hidden'); });
    });

  }).catch(function (err) { console.error(err); document.getElementById('noPending').classList.remove('hidden'); document.getElementById('verifyArea').classList.add('hidden'); });

  document.getElementById('verifyForm').addEventListener('submit', function (e) {
    e.preventDefault();
    codeError.classList.add('hidden');
    var entered = (codeInput.value || '').trim();
    if (!entered || entered.length < 6) { codeError.textContent = 'Please enter the 6-digit code.'; codeError.classList.remove('hidden'); return; }
    if (isExpired()) { codeError.textContent = 'This code has expired. Please resend.'; codeError.classList.remove('hidden'); return; }
    if (entered !== String(pending.code)) { codeError.textContent = 'Invalid code. Please try again.'; codeError.classList.remove('hidden'); return; }

    // Verified — move pending to lastTranscriptOrder and remove pending
    var confirmed = Object.assign({}, pending, { verifiedAt: Date.now() });
    try { localStorage.setItem('lastTranscriptOrder', JSON.stringify(confirmed)); localStorage.removeItem('pendingTranscriptOrder'); } catch (err) { console.warn(err); }

  successText.value = 'Thank you — your request for ' + (confirmed.university || '') + ' has been confirmed. We will process it shortly.';
  success.classList.remove('hidden');
  success.setAttribute('aria-hidden', 'false');
    document.getElementById('verifyForm').querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
    clearInterval(infoTimer);
  });
});

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('orderForm');
  var email = document.getElementById('schoolEmail');
  var studentId = document.getElementById('studentId');
  var university = document.getElementById('university');

  var emailError = document.getElementById('emailError');
  var idError = document.getElementById('idError');
  var schoolError = document.getElementById('schoolError');

  var confirmation = document.getElementById('confirmation');
  var confText = document.getElementById('confText');

  function validateEmailField() {
    if (!email.checkValidity()) {
      emailError.classList.remove('hidden');
      return false;
    }
    emailError.classList.add('hidden');
    return true;
  }

  function validateIdField() {
    if (!studentId.checkValidity()) {
      idError.classList.remove('hidden');
      return false;
    }
    idError.classList.add('hidden');
    return true;
  }

  function validateSchoolField() {
    if (!university.value) {
      schoolError.classList.remove('hidden');
      return false;
    }
    schoolError.classList.add('hidden');
    return true;
  }

  email.addEventListener('input', validateEmailField);
  studentId.addEventListener('input', validateIdField);
  university.addEventListener('change', validateSchoolField);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = validateEmailField() & validateIdField() & validateSchoolField();
    if (!ok) return;

    var payload = {
      email: email.value.trim(),
      studentId: studentId.value.trim(),
      university: university.value
    };

    // POST to server to send verification code via SMTP
    var API_BASE = window.API_BASE || '';
    fetch(API_BASE + '/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!data || !data.ok) {
        alert('Failed to send verification code. Please try again.');
        console.error('send-code failed', data);
        return;
      }
      // Save orderId so verify page can look it up
      try { localStorage.setItem('pendingOrderId', data.orderId); } catch (err) { }
      // optionally save masked email for UX
      try { localStorage.setItem('pendingMaskedEmail', data.maskedEmail || ''); } catch (err) { }
      window.location.href = 'verify.html';
    }).catch(function (err) { console.error(err); alert('Network error sending code'); });
  });
});

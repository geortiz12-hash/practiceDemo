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

    // Simulate sending the order (no backend in starter template)
    var payload = {
      email: email.value.trim(),
      studentId: studentId.value.trim(),
      university: university.value
    };

    // Save to localStorage as a simple mock of sending
    try { localStorage.setItem('lastTranscriptOrder', JSON.stringify(payload)); } catch (err) { }

  // Show confirmation (update output and make visible to assistive tech)
  confText.value = 'We received your request for ' + payload.university + '. A confirmation was sent to ' + payload.email + ' (mock).';
  confirmation.classList.remove('hidden');
  confirmation.setAttribute('aria-hidden', 'false');

    // Optionally clear the form or disable inputs
    form.querySelectorAll('input, select, button').forEach(function (el) { el.disabled = true; });
  });
});

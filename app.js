(() => {
  const $ = (id) => document.getElementById(id);
  const shell = $('siteShell');
  const triggerBtn = $('triggerBtn');
  const timerBtn = $('timerBtn');
  const caseModel = $('caseModel');
  const caseStage = $('caseStage');
  const notification = $('pushNotification');
  const success = $('phoneSuccess');

  let doseState = 'idle';
  let countdownInterval = null;
  let countdownRemaining = 0;
  let reminderDueAt = null;
  let confirmedAt = null;
  let toastTimeout = null;
  let successTimeout = null;
  let drag = null;
  let angleX = 53;
  let angleY = -18;
  let angleZ = -13;

  function timeString() {
    return new Date().toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  function setText(id, value) { $(id).textContent = value; }
  function durationString(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const secs = whole % 60;
    const two = (value) => String(value).padStart(2, '0');
    return hours ? `${two(hours)}:${two(minutes)}:${two(secs)}` : `${two(minutes)}:${two(secs)}`;
  }
  function caseClockTime(date = new Date()) {
    return [date.getHours(), date.getMinutes(), date.getSeconds()]
      .map((value) => String(value).padStart(2, '0')).join(':');
  }
  function updateCaseCounter() {
    if (countdownInterval) {
      setText('counterLabel', 'DOSE IN');
      setText('counterDigits', durationString(countdownRemaining));
    } else if (doseState === 'due') {
      setText('counterLabel', 'DUE FOR');
      setText('counterDigits', durationString((Date.now() - reminderDueAt) / 1000));
    } else if (doseState === 'taken') {
      setText('counterLabel', 'CONFIRMED AT');
      setText('counterDigits', caseClockTime(new Date(confirmedAt)));
    } else {
      setText('counterLabel', 'LOCAL TIME');
      setText('counterDigits', caseClockTime());
    }
  }
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3100);
  }
  function clearCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = null;
    countdownRemaining = 0;
  }
  function render() {
    shell.dataset.doseState = doseState;
    notification.hidden = doseState !== 'due';
    success.hidden = doseState !== 'taken';
    $('stepReminder').classList.toggle('step-done', doseState === 'due' || doseState === 'taken');
    $('stepCase').classList.toggle('step-done', doseState === 'due' || doseState === 'taken');
    $('stepConfirm').classList.toggle('step-done', doseState === 'taken');
    $('medicationItem').classList.toggle('med-item-due', doseState === 'due');
    $('medicationItem').classList.toggle('med-item-taken', doseState === 'taken');
    $('medStatus').className = 'med-status' + (doseState === 'due' ? ' med-status-due' : doseState === 'taken' ? ' med-status-taken' : '');
    setText('medStatus', doseState === 'due' ? '●  Due now' : doseState === 'taken' ? '✓  Taken' : '●  Scheduled');
    setText('progressLabel', doseState === 'taken' ? '1 of 1 doses taken' : '0 of 1 doses taken');
    setText('progressPercentage', doseState === 'taken' ? '100%' : '0%');
    $('progressFill').style.width = doseState === 'taken' ? '100%' : '0%';
    setText('progressSubcopy', doseState === 'taken' ? 'Great job! You’re all caught up today.' : 'You\'re one step away from your daily goal.');
    setText('phoneTipText', doseState === 'taken' ? 'Your dose has been recorded in your schedule.' : doseState === 'due' ? 'Your case is glowing. Tap it to acknowledge.' : 'Your PillPath case keeps everything in one place.');
    setText('triggerLabel', doseState === 'idle' ? 'Trigger reminder' : doseState === 'due' ? 'Reminder active' : 'Remind again');
    triggerBtn.disabled = doseState === 'due';
    timerBtn.disabled = doseState === 'due' || doseState === 'taken';
    $('caseModel').setAttribute('aria-label', doseState === 'due' ? 'Smart case reminder active. Click or press Enter to confirm the dose was taken.' : 'Interactive smart pill case. Drag to rotate. Start a reminder to acknowledge a dose.');

    if (doseState === 'due') {
      setText('displaySmall', 'PILLPATH · REMINDER');
      setText('displayMain', 'TAKE YOUR DOSE');
      setText('floatingCaseText', 'Reminder active');
      setText('caseFooterHint', 'Tap the glowing case to confirm');
      setText('notificationFooterText', 'Reminder delivered to app');
      setText('demoHint', 'Now tap the 3D case to clear the notification.');
      setText('activityTitle', 'Reminder delivered to both devices');
      setText('activityDescription', 'Waiting for confirmation from the smart case.');
      setText('activityTime', timeString());
    } else if (doseState === 'taken') {
      setText('displaySmall', 'PILLPATH · CONFIRMED');
      setText('displayMain', 'DOSE RECORDED ✓');
      setText('floatingCaseText', 'Dose confirmed');
      setText('caseFooterHint', 'Compartment acknowledged');
      setText('notificationFooterText', 'Reminder automatically dismissed');
      setText('demoHint', 'Success! The app cleared its notification automatically.');
      setText('activityTitle', 'Dose marked as taken');
      setText('activityDescription', 'The case confirmation instantly updated the app.');
      setText('activityTime', timeString());
    } else {
      setText('displaySmall', 'PILLPATH · READY');
      setText('displayMain', 'All set for today');
      setText('floatingCaseText', 'Standby mode');
      setText('caseFooterHint', 'Waiting for a reminder');
      setText('notificationFooterText', 'Ready to send a reminder');
      setText('demoHint', 'Start a reminder to see the devices respond.');
      setText('activityTitle', 'Devices are connected');
      setText('activityDescription', 'Waiting for the next dose reminder.');
      setText('activityTime', 'LIVE');
    }
    if (!countdownInterval) setText('timerLabel', '20s countdown');
    updateCaseCounter();
  }
  function triggerReminder() {
    clearCountdown();
    reminderDueAt = Date.now();
    confirmedAt = null;
    doseState = 'due';
    render();
    showToast('Reminder sent to the app and smart case');
    if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
  }
  function confirmTaken() {
    if (doseState !== 'due') {
      if (doseState === 'taken') showToast('Dose already recorded. Choose “Remind again” to replay.');
      else showToast('Trigger a reminder first to test the case.');
      return;
    }
    confirmedAt = Date.now();
    doseState = 'taken';
    render();
    showToast('✓ Dose confirmed — app notification dismissed');
    clearTimeout(successTimeout);
    successTimeout = setTimeout(() => { success.hidden = true; }, 4500);
  }
  function startTimer() {
    if (doseState !== 'idle') return;
    clearCountdown();
    countdownRemaining = 20;
    setText('timerLabel', 'Reminder in 20s');
    setText('demoHint', 'Countdown running — the reminder will fire automatically.');
    setText('displaySmall', 'PILLPATH · NEXT DOSE');
    setText('displayMain', 'REMINDER IN');
    timerBtn.classList.add('counting');
    updateCaseCounter();
    countdownInterval = setInterval(() => {
      countdownRemaining -= 1;
      if (countdownRemaining <= 0) {
        clearCountdown();
        timerBtn.classList.remove('counting');
        triggerReminder();
      } else {
        setText('timerLabel', `Reminder in ${countdownRemaining}s`);
        updateCaseCounter();
      }
    }, 1000);
  }
  function reset() {
    clearCountdown();
    clearTimeout(successTimeout);
    timerBtn.classList.remove('counting');
    reminderDueAt = null;
    confirmedAt = null;
    doseState = 'idle';
    render();
    showToast('Demo reset — ready for a new walkthrough');
  }

  function updateClock() {
    const now = new Date();
    setText('phoneTime', now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setText('phoneDay', new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }).format(now).toUpperCase());
    const doseTime = new Date(now);
    doseTime.setHours(9, 0, 0, 0);
    setText('doseTime', '9:00');
    setText('doseMeridiem', 'AM');
  }

  triggerBtn.addEventListener('click', () => {
    if (doseState === 'taken') { reset(); triggerReminder(); }
    else if (doseState === 'idle') triggerReminder();
  });
  timerBtn.addEventListener('click', startTimer);
  $('resetBtn').addEventListener('click', reset);

  function applyRotation() {
    caseModel.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg) rotateZ(${angleZ}deg)`;
  }
  applyRotation();
  caseModel.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    drag = { x: event.clientX, y: event.clientY, startX: angleX, startY: angleY, didMove: false };
    caseModel.setPointerCapture(event.pointerId);
    caseStage.classList.add('dragging');
  });
  caseModel.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.didMove = true;
    if (drag.didMove) {
      angleY = Math.max(-55, Math.min(55, drag.startY + dx * 0.25));
      angleX = Math.max(24, Math.min(73, drag.startX - dy * 0.18));
      applyRotation();
    }
  });
  caseModel.addEventListener('pointerup', () => {
    if (drag && !drag.didMove) confirmTaken();
    drag = null;
    caseStage.classList.remove('dragging');
  });
  caseModel.addEventListener('pointercancel', () => { drag = null; caseStage.classList.remove('dragging'); });
  caseModel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); confirmTaken(); }
    if (event.key === 'ArrowLeft') { angleY = Math.max(-55, angleY - 8); applyRotation(); }
    if (event.key === 'ArrowRight') { angleY = Math.min(55, angleY + 8); applyRotation(); }
  });

  updateClock();
  setInterval(updateClock, 60000);
  setInterval(updateCaseCounter, 1000);
  render();
})();

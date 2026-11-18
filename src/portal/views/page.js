for (const el of document.querySelectorAll('time[datetime]')) {
  el.textContent = new Date(el.dateTime).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  var original = button.innerHTML;
  button.addEventListener('click', () => {
    var text = document.getElementById(button.dataset.copyTarget).textContent;
    navigator.clipboard.writeText(text).then(() => {
      button.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
      setTimeout(() => {
        button.innerHTML = original;
      }, 1500);
    });
  });
});

document.querySelectorAll('form[data-once]').forEach((form) => {
  form.addEventListener('submit', () => {
    setTimeout(() => {
      form.querySelectorAll('button[type="submit"]').forEach((button) => {
        button.disabled = true;
      });
    }, 0);
  });
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.querySelectorAll('form[data-once] button[type="submit"]').forEach((button) => {
      button.disabled = false;
    });
  }
});

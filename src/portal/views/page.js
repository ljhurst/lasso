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

document.querySelectorAll('[data-scope-picker]').forEach((picker) => {
  var list = picker.querySelector('[data-scope-list]');
  var select = picker.querySelector('[data-scope-select]');
  var template = picker.querySelector('[data-scope-template]');

  picker.querySelector('[data-scope-add]').addEventListener('click', () => {
    var scope = select.value;
    if (!scope) {
      return;
    }
    var row = template.content.firstElementChild.cloneNode(true);
    row.querySelector('code').textContent = scope;
    row.querySelector('input').value = scope;
    var remove = row.querySelector('[data-scope-remove]');
    remove.setAttribute('aria-label', 'Remove ' + scope);
    remove.setAttribute('title', 'Remove ' + scope);
    list.append(row);
    Array.from(select.options)
      .find((option) => option.value === scope)
      .remove();
    select.value = '';
  });

  list.addEventListener('click', (event) => {
    var button = event.target.closest('[data-scope-remove]');
    if (!button) {
      return;
    }
    var row = button.closest('li');
    var scope = row.querySelector('input').value;
    row.remove();
    var placeholder = select.options[0];
    var options = Array.from(select.options).slice(1);
    options.push(new Option(scope, scope));
    options.sort((a, b) => a.value.localeCompare(b.value));
    select.replaceChildren(placeholder, ...options);
    select.value = '';
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

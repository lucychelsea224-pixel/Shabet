// Minimal toast utility — no dependencies, works from any module. Used to
// surface database write failures that would otherwise only show up as a
// console.warn (invisible to anyone who isn't watching devtools) and as a
// change that mysteriously reverts on the next reload.

let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.id = 'shabet-toast-container';
  document.body.appendChild(container);
  return container;
}

export function showToast(message, type = 'error') {
  const el = document.createElement('div');
  el.className = `shabet-toast shabet-toast-${type}`;
  el.textContent = message;
  ensureContainer().appendChild(el);

  // Force a reflow so the enter transition actually plays, then trigger it.
  requestAnimationFrame(() => el.classList.add('shabet-toast-visible'));

  setTimeout(() => {
    el.classList.remove('shabet-toast-visible');
    setTimeout(() => el.remove(), 300);
  }, 6000);
}

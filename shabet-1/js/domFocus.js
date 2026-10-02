// Both admin.js and agent.js redraw their whole tab on every store change
// (root.innerHTML = ...longTemplate...), including changes that have
// nothing to do with whatever the person is currently doing — most
// importantly, Supabase realtime pushes (another device editing odds,
// a new ticket coming in, etc.) can arrive at any moment, including
// while someone is mid-keystroke in a field like the stake input.
//
// A full innerHTML replacement destroys the actual <input> DOM node and
// creates a brand new one in its place. The browser sees that as "the
// focused element just disappeared" and, on mobile, that's exactly what
// dismisses the on-screen keyboard — it's not really "minimising", the
// input the keyboard was attached to no longer exists.
//
// This wraps a render pass: remember which field was focused (and where
// the cursor was) right before repainting, then find the equivalent
// field in the new DOM afterwards and restore focus + cursor position.
// The visible VALUE is unaffected either way — it already comes from
// the live state the same render draws from — this only restores focus.
export function withFocusPreserved(root, paint) {
  const snapshot = captureFocus(root);
  paint();
  if (snapshot) restoreFocus(root, snapshot);
}

function captureFocus(root) {
  const active = document.activeElement;
  if (!active || !root.contains(active)) return null;
  const tag = active.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return null;

  const selector = buildSelector(active);
  if (!selector) return null; // not specific enough to safely re-find — skip rather than risk focusing the wrong field

  return {
    selector,
    selectionStart: 'selectionStart' in active ? active.selectionStart : null,
    selectionEnd: 'selectionEnd' in active ? active.selectionEnd : null,
  };
}

function restoreFocus(root, snapshot) {
  let el;
  try {
    el = root.querySelector(snapshot.selector);
  } catch (e) {
    return; // malformed selector (shouldn't happen given buildSelector, but never let this break a render)
  }
  if (!el) return;
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;

  el.focus({ preventScroll: true });
  if (snapshot.selectionStart !== null && typeof el.setSelectionRange === 'function') {
    try {
      el.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    } catch (e) {
      // Some input types (e.g. type="number") don't support setSelectionRange
      // in some browsers — focus is already restored, which is the part that
      // matters for keeping the keyboard open, so just ignore this.
    }
  }
}

// Builds a selector specific enough to find the SAME logical field again
// after a full re-render. Prefers a real id; otherwise combines tag name,
// classes, and any data-* attributes (every per-row field in this app —
// stake, score, odds, names — carries a data-fixture/data-scorer/etc.
// identifier for exactly this reason).
function buildSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;

  const dataAttrs = [...el.attributes].filter((a) => a.name.startsWith('data-'));
  if (dataAttrs.length === 0) return null;

  const tag = el.tagName.toLowerCase();
  const classSel = el.className && typeof el.className === 'string'
    ? [...el.classList].map((c) => `.${CSS.escape(c)}`).join('')
    : '';
  const attrSel = dataAttrs.map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
  return `${tag}${classSel}${attrSel}`;
}

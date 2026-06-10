// Badge component

/**
 * Create a badge element
 * @param {'driver'|'rider'|'scheduled'|'requested'|'admin'} type
 * @param {string} [label] - Custom label, defaults to type name
 * @returns {HTMLElement}
 */
export function createBadge(type, label) {
  const el = document.createElement('span');
  el.className = `badge badge--${type}`;
  el.textContent = label || type.charAt(0).toUpperCase() + type.slice(1);
  return el;
}

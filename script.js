const alerts = [
  { group: 'Dairy herd A',    product: 'Milk', days: 0,  status: 'CLEARED' },
  { group: 'Heifers B',       product: 'Milk', days: 2,  status: 'EXPIRING' },
  { group: 'Dairy herd A',    product: 'Meat', days: 20, status: 'HOLD' },
  { group: 'Broiler batch 7', product: 'Meat', days: 13, status: 'HOLD' },
  { group: 'Broiler batch 7', product: 'Eggs', days: 13, status: 'HOLD' }
];
 
const herds = [
  { name: 'Dairy herd A',    detail: 'Cattle · 25 head',    status: 'CLEARED' },
  { name: 'Heifers B',       detail: 'Cattle · 12 head',    status: 'EXPIRING' },
  { name: 'Broiler batch 7', detail: 'Poultry · 500 birds', status: 'HOLD' }
];
 
const treatments = [
  { title: 'Oxytetracycline · Dairy herd A', detail: 'Injection · 10 mg/kg · once daily · respiratory infection', rx: true },
  { title: 'Amoxicillin · Heifers B',        detail: 'Injection · 8 mg/kg · twice daily · mastitis',            rx: false }
];
 
const early = [
  { id: 'e1', title: 'Heifers B · Milk',        note: 'Sold 2 days before the withdrawal period ended',  reviewed: false },
  { id: 'e2', title: 'Broiler batch 7 · Meat',  note: 'Sold 13 days before the withdrawal period ended', reviewed: false }
];
 
const filters = [
  { key: 'ALL',      label: 'All' },
  { key: 'HOLD',     label: 'Do not sell' },
  { key: 'EXPIRING', label: 'Expiring soon' },
  { key: 'CLEARED',  label: 'Cleared' }
];
 
const chipFor = {
  CLEARED:  { cls: 'chip-ok',   text: 'CLEARED',       herd: 'MILK OK' },
  EXPIRING: { cls: 'chip-soon', text: 'EXPIRING SOON', herd: 'MILK IN 2 DAYS' },
  HOLD:     { cls: 'chip-hold', text: 'DO NOT SELL',   herd: 'HOLD BACK' }
};
 
let activeFilter = 'ALL';
 
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
 
function renderHerds() {
  $('herd-list').innerHTML = herds.map((h) => `
    <div class="herd">
      <div><div class="herd-name">${esc(h.name)}</div><div class="herd-detail">${esc(h.detail)}</div></div>
      <span class="chip ${chipFor[h.status].cls}">${chipFor[h.status].herd}</span>
    </div>`).join('');
}
 
function renderFilters() {
  $('filters').innerHTML = filters.map((f) => {
    const count = alerts.filter((a) => f.key === 'ALL' || a.status === f.key).length;
    const sel = f.key === activeFilter ? ' selected' : '';
    return `<button type="button" class="filter${sel}" data-key="${f.key}">${f.label} (${count})</button>`;
  }).join('');
}
 
function renderAlerts() {
  const rows = alerts.filter((a) => activeFilter === 'ALL' || a.status === activeFilter);
  $('alert-rows').innerHTML = rows.map((a) => `
    <tr>
      <td>${esc(a.group)}</td><td>${esc(a.product)}</td><td>${a.days}</td>
      <td><span class="chip ${chipFor[a.status].cls}">${chipFor[a.status].text}</span></td>
    </tr>`).join('');
}
 
function renderTreatments() {
  $('treatment-list').innerHTML = treatments.map((t) => `
    <div class="item">
      <div><div class="item-title">${esc(t.title)}</div><div class="item-note">${esc(t.detail)}</div></div>
      <span class="chip ${t.rx ? 'chip-ok' : 'chip-hold'}">${t.rx ? 'PRESCRIBED' : 'NO PRESCRIPTION'}</span>
    </div>`).join('');
}
 
function renderEarly() {
  $('early-list').innerHTML = early.map((e) => `
    <div class="item">
      <div><div class="item-title">${esc(e.title)}</div><div class="item-note">${esc(e.note)}</div></div>
      <button type="button" class="btn ${e.reviewed ? 'btn-done' : 'btn-outline'}" data-id="${e.id}">
        ${e.reviewed ? 'Reviewed. Undo' : 'Mark reviewed'}
      </button>
    </div>`).join('');
}
 
// Alert filters
$('filters').addEventListener('click', (ev) => {
  const btn = ev.target.closest('.filter');
  if (!btn) return;
  activeFilter = btn.dataset.key;
  renderFilters();
  renderAlerts();
});
 
// Mark reviewed
$('early-list').addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-id]');
  if (!btn) return;
  const item = early.find((e) => e.id === btn.dataset.id);
  item.reviewed = !item.reviewed;
  renderEarly();
});
 
// Log-treatment modal
const overlay = $('overlay');
function openForm() {
  $('saved-notice').hidden = true;
  $('form-error').hidden = true;
  overlay.hidden = false;
  $('f-group').focus();
}
function closeForm() { overlay.hidden = true; $('open-form').focus(); }
 
$('open-form').addEventListener('click', openForm);
$('cancel-form').addEventListener('click', closeForm);
overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeForm(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !overlay.hidden) closeForm(); });
 
$('treatment-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const dose = parseFloat($('f-dose').value);
  if (!(dose > 0)) { $('form-error').hidden = false; return; }
  const route = $('f-route').value;
  treatments.unshift({
    title: $('f-drug').value + ' · ' + $('f-group').value,
    detail: route.charAt(0).toUpperCase() + route.slice(1) + ' · ' + dose + ' mg/kg · logged just now',
    rx: $('f-rx').checked
  });
  renderTreatments();
  overlay.hidden = true;
  $('saved-notice').hidden = false;
  $('open-form').focus();
});
 
renderHerds();
renderFilters();
renderAlerts();
renderTreatments();
renderEarly();
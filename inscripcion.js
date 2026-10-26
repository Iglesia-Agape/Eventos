// Si el logo no carga, se oculta (antes era un atributo onerror; la CSP no permite manejadores dentro del HTML)
(function () {
  const logo = document.getElementById('logo');
  if (!logo) return;
  const hide = () => { logo.style.display = 'none'; };
  logo.addEventListener('error', hide);
  if (logo.complete && logo.naturalWidth === 0) hide();
})();

// ---- Configuración (misma fuente que el panel: config.js) ----
const cfg = window.APP_CONFIG || {};
const WEBHOOK_URL = (cfg.WEBHOOK_URL || '').trim();
const SB_URL = (cfg.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SB_KEY = (cfg.SUPABASE_ANON_KEY || '').trim();
const MAX_FILE = 10 * 1024 * 1024;

const $ = (id) => document.getElementById(id);
let sb = null, evt = null, myPass = null;

function show(name) { ['st-loading', 'st-msg', 'st-form', 'st-pass'].forEach(n => $(n).classList.toggle('hidden', n !== name)); window.scrollTo(0, 0); }
function showMsg(icon, title, text) { $('msg-icon').textContent = icon; $('msg-title').textContent = title; $('msg-text').textContent = text; show('st-msg'); }
function fmtDate(d) { const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function newCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = new Uint8Array(6); crypto.getRandomValues(r); return Array.from(r, v => a[v % a.length]).join(''); }
function formError(msg) { const e = $('form-error'); e.textContent = msg || ''; e.classList.toggle('hidden', !msg); }
const passKey = () => 'eventsync_mypass_' + evt.id;

// ---- Inicio ----
document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(location.search).get('evento');
  if (!id) return showMsg('🔗', 'Enlace incompleto', 'Pide a la iglesia el enlace de inscripción del evento.');
  if (!SB_URL || !SB_KEY || !window.supabase) return showMsg('⚠️', 'Servicio no disponible', 'No pudimos conectar. Intenta de nuevo en unos minutos.');
  sb = window.supabase.createClient(SB_URL, SB_KEY);

  // Solo se descarga ESTE evento (nunca la lista de inscritos)
  const { data, error } = await sb.from('events')
    .select('id,title,date,capacity,is_paid,price,bank_info,description,drive_folder_id').eq('id', id).maybeSingle();
  if (error || !data) return showMsg('🔍', 'Evento no encontrado', 'El enlace es inválido o el evento ya no está disponible.');
  evt = { id: data.id, title: data.title, date: data.date, capacity: data.capacity, isPaid: data.is_paid, price: parseFloat(data.price) || 0, description: data.description, driveFolderId: data.drive_folder_id };

  const spots = await remainingSpots();
  if (spots !== null && spots <= 0) return showMsg('😔', 'Cupos agotados', 'Este evento alcanzó su capacidad máxima. Gracias por tu interés.');
  renderEvent(spots);
  try { myPass = JSON.parse(localStorage.getItem(passKey())); } catch (e) { myPass = null; }
  $('btn-mypass').classList.toggle('hidden', !myPass);
  show('st-form');
});

// Cupos disponibles: usa la función SQL opcional; si no existe aún, simplemente no se muestra
async function remainingSpots() {
  try {
    const { data, error } = await sb.rpc('event_registration_count', { p_event_id: evt.id });
    if (error || typeof data !== 'number') return null;
    return evt.capacity - data;
  } catch (e) { return null; }
}

function renderEvent(spots) {
  $('ev-title').textContent = evt.title;
  $('ev-desc').textContent = evt.description || 'Te esperamos para vivir este evento juntos.';
  $('ev-date').textContent = evt.date ? fmtDate(evt.date) : 'Fecha por confirmar';
  const p = $('ev-price');
  if (evt.isPaid) {
    p.textContent = 'Inscripción: L. ' + evt.price.toFixed(2);
    p.className = 'px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold';
  } else {
    p.textContent = '✓ Evento 100% gratuito';
    p.className = 'px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold';
  }
  if (spots !== null && spots <= 20) { $('ev-spots').textContent = 'Quedan ' + spots + ' cupos'; $('ev-spots').classList.remove('hidden'); }
  $('pay-channels').classList.toggle('hidden', !evt.isPaid);
  $('pay-section').classList.toggle('hidden', !evt.isPaid);
  $('btn-submit').textContent = evt.isPaid ? 'Completar inscripción y obtener pase QR' : 'Confirmar asistencia y obtener pase QR';
  toggleProof();
}

const needsProof = () => evt && evt.isPaid && ['BAC Credomatic', 'PayPal'].includes($('f-method').value);
function toggleProof() { $('proof-box').classList.toggle('hidden', !needsProof()); }
$('f-method').addEventListener('change', toggleProof);
$('f-proof').addEventListener('change', (e) => { const f = e.target.files[0]; $('proof-name').textContent = f ? '✓ ' + f.name + ' (' + Math.round(f.size / 1024) + ' KB)' : 'Máximo 10 MB. Se guarda de forma segura.'; });
$('btn-copy').addEventListener('click', () => { navigator.clipboard.writeText($('bac-acc').textContent).then(() => { $('btn-copy').textContent = '¡Copiado!'; setTimeout(() => $('btn-copy').textContent = 'Copiar', 2000); }); });
$('btn-mypass').addEventListener('click', () => myPass && showPass(myPass));

// ---- Google Apps Script (misma comunicación que el panel) ----
async function postToGoogleScript(payload) {
  if (!WEBHOOK_URL) return { success: false, error: 'Webhook no configurado' };
  try {
    const res = await fetch(WEBHOOK_URL, { method: 'POST', mode: 'cors', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    return await res.json();
  } catch (err) { return { success: false, error: err.message || String(err) }; }
}

// Inscripción repetida (mismo nombre y celular en este evento). La función SQL es opcional:
// si no existe se omite, y la base de datos igual impide el duplicado.
const DUP_MSG = 'Ya existe una inscripción con este nombre y celular en este evento. Si necesitas tu pase, comunícate con la iglesia.';
async function alreadyRegistered(name, phone) {
  try {
    const { data, error } = await sb.rpc('inscripcion_duplicada', { p_event_id: evt.id, p_name: name, p_phone: phone });
    return !error && data === true;
  } catch (e) { return false; }
}

// Compresión de fotos en el navegador (igual que antes)
function compressImageFile(file, maxWidth = 1600, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!file.type.startsWith('image/')) return resolve(reader.result.split(',')[1]);
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.onerror = () => resolve(event.target.result.split(',')[1]);
    };
  });
}

// ---- Envío ----
$('reg-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  formError('');
  const name = $('f-name').value.trim().replace(/\s+/g, ' '), phone = $('f-phone').value.trim(), age = parseInt($('f-age').value, 10);
  const method = evt.isPaid ? $('f-method').value : 'Gratuito';
  const file = $('f-proof').files[0];

  if (name.length < 3 || name.split(' ').length < 2) return formError('Escribe tu nombre y apellido.');
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) return formError('Escribe un número de celular válido (8 dígitos).');
  if (!Number.isInteger(age) || age < 1 || age > 120) return formError('Escribe tu edad (entre 1 y 120 años).');
  if (needsProof()) {
    if (!file) return formError('Adjunta el comprobante o captura de tu pago.');
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return formError('El comprobante debe ser una foto o un PDF.');
    if (file.size > MAX_FILE) return formError('El archivo pesa más de 10 MB. Elige uno más liviano.');
  }

  const btn = $('btn-submit'), prog = $('progress'), progText = $('progress-text');
  btn.disabled = true; prog.classList.remove('hidden');
  try {
    if (await alreadyRegistered(name, phone)) return formError(DUP_MSG);

    // Volver a revisar cupos justo antes de inscribir
    const spots = await remainingSpots();
    if (spots !== null && spots <= 0) return showMsg('😔', 'Cupos agotados', 'Este evento alcanzó su capacidad máxima.');

    const code = newCode();
    let paymentStatus = 'Exento';
    if (evt.isPaid) paymentStatus = needsProof() ? 'En Revisión' : (method === 'POS' ? 'Pendiente Pago (POS)' : method === 'Efectivo' ? 'Pendiente Pago (Efectivo)' : 'Pendiente Pago');

    let receiptUrl = '';
    if (needsProof()) {
      progText.textContent = 'Optimizando foto del comprobante...';
      const base64Data = await compressImageFile(file);
      progText.textContent = 'Subiendo comprobante...';
      const up = await postToGoogleScript({
        action: 'upload_receipt',
        folderId: evt.driveFolderId || '',
        eventName: evt.title,
        fileDataBase64: base64Data,
        fileType: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
        fileName: `EVT-${code} - ${name} - ${method}.${file.type === 'application/pdf' ? 'pdf' : 'jpg'}`
      });
      if (!up || !up.success) return formError('No pudimos subir tu comprobante. Revisa tu conexión e inténtalo de nuevo.');
      receiptUrl = up.fileUrl;
    }

    progText.textContent = 'Generando tu pase digital...';
    const reg = { id: 'reg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), eventId: evt.id, code, name, phone, age, isPaid: evt.isPaid, paymentMethod: method, paymentStatus, receiptUrl, attended: false, createdAt: new Date().toISOString() };
    const { error } = await sb.from('registrations').insert([{
      id: reg.id, event_id: reg.eventId, code: reg.code, name: reg.name, phone: reg.phone, age: reg.age,
      is_paid: reg.isPaid, payment_method: reg.paymentMethod, payment_status: reg.paymentStatus,
      receipt_url: reg.receiptUrl, attended: reg.attended, created_at: reg.createdAt
    }]);
    if (error) {
      console.error(error);
      if (String(error.message || '').includes('uq_registrations_event_name_phone')) return formError(DUP_MSG);
      return formError('No pudimos completar tu inscripción. Inténtalo de nuevo en un momento.');
    }

    myPass = { code, name, phone, age, isPaid: reg.isPaid, paymentMethod: method, paymentStatus };
    try { localStorage.setItem(passKey(), JSON.stringify(myPass)); } catch (e) {}
    try { confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } }); } catch (e) {}
    showPass(myPass);
  } finally {
    btn.disabled = false; prog.classList.add('hidden');
  }
});

// ---- Pase ----
function showPass(p) {
  myPass = p;
  $('p-event').textContent = evt.title;
  $('p-code').textContent = 'EVT-' + p.code;
  $('p-name').textContent = p.name;
  $('p-phone').textContent = 'Cel: ' + (p.phone || p.dni || '-') + (p.age ? ' • ' + p.age + ' años' : '');
  const st = $('p-status');
  const map = !p.isPaid ? ['✓ Acceso gratuito confirmado', 'indigo'] : p.paymentStatus === 'Pagado' ? ['✓ Pago aprobado', 'emerald'] : p.paymentStatus === 'En Revisión' ? ['⏳ Comprobante en revisión', 'amber'] : ['📍 Pagar en cafetería (' + p.paymentMethod + ')', 'sky'];
  st.textContent = map[0];
  st.className = 'inline-block text-xs font-semibold px-3 py-1 rounded-full border ' + { indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20', sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20' }[map[1]];
  $('qr').innerHTML = '';
  new QRCode($('qr'), { text: 'EVT-' + p.code, width: 160, height: 160, colorDark: '#020617', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  show('st-pass');
}

$('btn-print').addEventListener('click', () => window.print());
$('btn-another').addEventListener('click', () => { $('reg-form').reset(); $('proof-name').textContent = 'Máximo 10 MB. Se guarda de forma segura.'; formError(''); show('st-form'); });
$('btn-wa').addEventListener('click', () => {
  const t = `¡Hola! Aquí está mi pase para *${evt.title}* en Ministerio Internacional Ágape.\n\n👤 *Nombre:* ${myPass.name}\n🔑 *Código de Entrada:* EVT-${myPass.code}\n📱 *Celular:* ${myPass.phone || myPass.dni || '-'}${myPass.isPaid ? `\n💳 *Estado:* ${myPass.paymentStatus}` : ''}\n\nPresenta este código al ingresar.`;
  window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(t), '_blank');
});

$('btn-save').addEventListener('click', () => {
  const qr = document.querySelector('#qr img') || document.querySelector('#qr canvas');
  const c = document.createElement('canvas'); c.width = 600; c.height = 800;
  const x = c.getContext('2d'), mid = c.width / 2;
  x.fillStyle = '#0f172a'; x.fillRect(0, 0, 600, 800);
  x.strokeStyle = '#334155'; x.lineWidth = 4; x.strokeRect(20, 20, 560, 760);
  x.fillStyle = '#6366f1'; x.fillRect(20, 20, 560, 100);
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText('MINISTERIO INTERNACIONAL ÁGAPE', mid, 60);
  x.fillStyle = '#e0e7ff'; x.font = '14px sans-serif'; x.fillText('PASE DIGITAL DE ACCESO', mid, 90);
  x.fillStyle = '#fff'; x.font = 'bold 24px sans-serif'; x.fillText(evt.title.substring(0, 36), mid, 170);
  if (qr) { x.fillStyle = '#fff'; x.fillRect(mid - 110, 210, 220, 220); x.drawImage(qr, mid - 95, 225, 190, 190); }
  x.fillStyle = '#34d399'; x.font = 'bold 32px monospace'; x.fillText('EVT-' + myPass.code, mid, 480);
  x.fillStyle = '#f8fafc'; x.font = 'bold 22px sans-serif'; x.fillText(myPass.name, mid, 530);
  x.fillStyle = '#94a3b8'; x.font = '16px monospace'; x.fillText('Cel: ' + (myPass.phone || myPass.dni || '-'), mid, 565);
  x.fillStyle = myPass.isPaid ? '#f59e0b' : '#38bdf8'; x.font = 'bold 16px sans-serif'; x.fillText(myPass.isPaid ? 'Estado: ' + myPass.paymentStatus : 'Acceso gratuito', mid, 615);
  x.fillStyle = '#64748b'; x.font = '14px sans-serif'; x.fillText('Presenta este código en la entrada • www.agapehn.org', mid, 740);
  const a = document.createElement('a');
  a.download = 'Pase_' + myPass.name.replace(/\s+/g, '_') + '_EVT-' + myPass.code + '.png';
  a.href = c.toDataURL('image/png'); a.click();
});

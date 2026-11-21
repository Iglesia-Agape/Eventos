// Lista pública de inscritos (solo lectura).
// Lee los datos con la función segura lista_publica de Supabase, que exige el
// código secreto (parámetro "k" del enlace). No usa la tabla registrations directamente.
(function () {
  'use strict';

  var REFRESH_MS = 15000;      // cada cuánto se vuelve a consultar
  var cfg = window.APP_CONFIG || {};
  var qs = new URLSearchParams(window.location.search);
  var eventId = qs.get('evento');
  var token = qs.get('k');

  var sb = null;
  var rows = [];
  var eventInfo = null;
  var lastOk = 0;
  var timer = null;

  function $(id) { return document.getElementById(id); }

  function showMessage(title, text) {
    $('msg-title').textContent = title;
    $('msg-text').textContent = text || '';
    $('state-msg').classList.remove('hidden');
    $('content').classList.add('hidden');
  }

  function showContent() {
    $('state-msg').classList.add('hidden');
    $('content').classList.remove('hidden');
  }

  function formatDate(raw) {
    if (!raw) return '';
    var d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function statusPill(estado) {
    var s = estado || '';
    var cls = 'mute';
    if (s === 'Pagado') cls = 'ok';
    else if (s === 'Rechazado') cls = 'bad';
    else if (s === 'En Revisión' || s.indexOf('Pendiente') === 0) cls = 'warn';
    var el = document.createElement('span');
    el.className = 'pill ' + cls;
    el.textContent = s === 'Exento' ? 'Gratis' : s;
    return el;
  }

  function render() {
    var total = rows.length;
    var attended = rows.filter(function (r) { return r.llego; }).length;
    var capacity = eventInfo && eventInfo.capacity ? eventInfo.capacity : 0;

    $('c-total').textContent = total;
    $('c-label').textContent = total === 1 ? 'inscrito' : 'inscritos';
    var sub = [];
    if (capacity) sub.push('Cupo: ' + capacity + ' (' + Math.max(capacity - total, 0) + ' disponibles)');
    if (attended) sub.push(attended + ' ya llegaron');
    $('c-sub').textContent = sub.join(' · ');
    $('c-bar').style.width = capacity ? Math.min(100, Math.round(total / capacity * 100)) + '%' : '0';

    // En eventos gratuitos todos están "Exento": se oculta la columna de pago.
    var hideStatus = total > 0 && rows.every(function (r) { return r.estado === 'Exento'; });
    $('th-status').classList.toggle('hidden', hideStatus);

    var q = $('search').value.trim().toLowerCase();
    var shown = rows.filter(function (r) { return !q || (r.nombre || '').toLowerCase().indexOf(q) !== -1; });

    var tbody = $('tbody');
    tbody.textContent = '';
    shown.forEach(function (r) {
      var tr = document.createElement('tr');

      var tdN = document.createElement('td');
      tdN.className = 'num';
      tdN.textContent = r.n;
      tr.appendChild(tdN);

      var tdName = document.createElement('td');
      tdName.className = 'name';
      tdName.textContent = r.nombre;
      tr.appendChild(tdName);

      if (!hideStatus) {
        var tdS = document.createElement('td');
        tdS.appendChild(statusPill(r.estado));
        tr.appendChild(tdS);
      }

      var tdA = document.createElement('td');
      tdA.textContent = r.llego ? 'Llegó' : '—';
      tr.appendChild(tdA);

      tbody.appendChild(tr);
    });

    var empty = $('empty');
    if (shown.length === 0) {
      empty.textContent = total === 0 ? 'Todavía no hay inscritos.' : 'Nadie coincide con esa búsqueda.';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
    }
  }

  function paintUpdated() {
    if (!lastOk) return;
    var secs = Math.round((Date.now() - lastOk) / 1000);
    var offline = secs > (REFRESH_MS / 1000) * 3;
    $('dot').classList.toggle('off', offline);
    $('updated').textContent = offline
      ? 'Sin conexión, reintentando…'
      : (secs < 5 ? 'Actualizado ahora' : 'Actualizado hace ' + secs + ' s');
  }

  async function load() {
    try {
      var evReq = sb.from('events').select('title,date,capacity').eq('id', eventId).maybeSingle();
      var listReq = sb.rpc('lista_publica', { p_event_id: eventId, p_token: token });
      var results = await Promise.all([evReq, listReq]);

      var listRes = results[1];
      if (listRes.error) {
        if ((listRes.error.message || '').indexOf('enlace_invalido') !== -1) {
          clearInterval(timer);
          showMessage('Enlace no válido', 'Este enlace es incorrecto o fue reemplazado. Pide uno nuevo a quien te lo compartió.');
          return;
        }
        throw listRes.error;
      }

      if (results[0].data) {
        eventInfo = results[0].data;
        $('ev-title').textContent = eventInfo.title || 'Evento';
        $('ev-date').textContent = formatDate(eventInfo.date);
        document.title = 'Inscritos: ' + (eventInfo.title || 'Evento');
      }

      rows = listRes.data || [];
      lastOk = Date.now();
      showContent();
      render();
      paintUpdated();
    } catch (e) {
      if (!lastOk) {
        showMessage('No se pudo cargar la lista', 'Revisa tu conexión y vuelve a abrir el enlace.');
      }
    }
  }

  function start() {
    if (!eventId || !token) {
      showMessage('Falta el enlace completo', 'Abre la lista con el enlace completo que te compartieron, incluyendo todo lo que va después del signo ?.');
      return;
    }
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      showMessage('No se pudo cargar la lista', 'Falta la configuración de la página (config.js).');
      return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY.trim());

    $('search').addEventListener('input', render);

    load();
    timer = setInterval(function () { if (!document.hidden) load(); }, REFRESH_MS);
    setInterval(paintUpdated, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  }

  // Los scripts van con "defer": al ejecutarse este, config.js y supabase-js ya cargaron.
  start();
})();

// Campos del formulario de inscripción por evento (Nombre / Celular / Edad + extras).
(function (global) {
  const SYS = {
    name: { id: 'name', key: 'name', type: 'text', label: 'Nombre y apellido', required: true, enabled: true },
    phone: { id: 'phone', key: 'phone', type: 'phone', label: 'Celular', required: true, enabled: true },
    age: { id: 'age', key: 'age', type: 'number', label: 'Edad', required: true, enabled: true }
  };
  const MAX_EXTRA = 12;
  const MAX_OPTS = 30;
  const MAX_LABEL = 80;
  const MAX_VAL = 200;
  const MAX_LONG = 500;
  const YESNO = ['Sí', 'No'];
  const EXTRA_TYPES = ['text', 'number', 'select', 'textarea', 'yesno'];
  const DEFAULT_LABELS = { text: 'Campo extra', number: 'Número', select: 'Lista', textarea: 'Texto largo', yesno: 'Sí / No' };
  const INPUT_PUBLIC = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500';
  const INPUT_ADMIN = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function defaultFormFields() { return [clone(SYS.name), clone(SYS.phone), clone(SYS.age)]; }
  function newFieldId() { return 'f-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  function sanitizeLabel(s, fallback) {
    const t = String(s || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL);
    return t || fallback;
  }

  function sanitizeOptions(arr) {
    const out = [];
    const seen = new Set();
    (Array.isArray(arr) ? arr : []).forEach(raw => {
      const o = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const k = o.toLowerCase();
      if (o && !seen.has(k) && out.length < MAX_OPTS) { seen.add(k); out.push(o); }
    });
    return out;
  }

  function normalizeFormFields(raw) {
    const defaults = defaultFormFields();
    const list = Array.isArray(raw) ? raw : [];
    if (!list.length) return defaults;

    // Se respeta el orden guardado (los campos fijos también se pueden mover)
    const out = [];
    const seenSys = {};
    let extrasCount = 0;
    list.forEach(f => {
      if (!f || typeof f !== 'object') return;
      if (f.key === 'name' || f.key === 'phone' || f.key === 'age') {
        if (seenSys[f.key]) return;
        seenSys[f.key] = true;
        const row = defaults.find(x => x.key === f.key);
        row.label = sanitizeLabel(f.label, row.label);
        if (f.key !== 'name') {
          row.enabled = f.enabled !== false;
          row.required = row.enabled && f.required !== false;
        }
        out.push(row);
        return;
      }
      if (extrasCount >= MAX_EXTRA) return;
      const type = EXTRA_TYPES.indexOf(f.type) !== -1 ? f.type : 'text';
      const id = String(f.id || newFieldId()).replace(/[^\w-]/g, '').slice(0, 24) || newFieldId();
      extrasCount++;
      out.push({
        id,
        key: 'extra',
        type,
        label: sanitizeLabel(f.label, DEFAULT_LABELS[type]),
        required: !!f.required,
        enabled: true,
        options: type === 'select' ? sanitizeOptions(f.options) : undefined
      });
    });
    // Si falta algún campo fijo, vuelve al inicio en su orden normal
    ['name', 'phone', 'age'].forEach((k, i, order) => {
      if (seenSys[k]) return;
      const row = defaults.find(x => x.key === k);
      let at = 0;
      for (let j = i - 1; j >= 0; j--) {
        const idx = out.findIndex(x => x.key === order[j]);
        if (idx !== -1) { at = idx + 1; break; }
      }
      out.splice(at, 0, row);
    });
    return out;
  }

  function visibleFields(fields) {
    return normalizeFormFields(fields).filter(f => f.enabled !== false);
  }

  function extraFields(fields) {
    return normalizeFormFields(fields).filter(f => f.key === 'extra');
  }

  function fieldInputId(prefix, field) {
    if (field.key === 'name') return prefix + 'name';
    if (field.key === 'phone') return prefix + 'phone';
    if (field.key === 'age') return prefix + 'age';
    return prefix + 'x-' + field.id;
  }

  function renderFormFields(container, fields, opts) {
    if (!container) return;
    const prefix = (opts && opts.prefix) || 'f-';
    const compact = !!(opts && opts.compact);
    const values = (opts && opts.values) || {};
    const extraData = values.extraData && typeof values.extraData === 'object' ? values.extraData : {};
    const cls = compact ? INPUT_ADMIN : INPUT_PUBLIC;
    container.innerHTML = '';
    visibleFields(fields).forEach(field => {
      const wrap = document.createElement('div');
      const id = fieldInputId(prefix, field);
      const label = document.createElement('label');
      label.htmlFor = id;
      label.className = 'block text-xs font-medium text-slate-300 mb-1';
      label.textContent = field.label + (field.required ? ' *' : '');
      wrap.appendChild(label);

      let input;
      if (field.type === 'select' || field.type === 'yesno') {
        input = document.createElement('select');
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = 'Selecciona una opción';
        input.appendChild(ph);
        (field.type === 'yesno' ? YESNO : (field.options || [])).forEach(o => {
          const opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o;
          input.appendChild(opt);
        });
      } else if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = compact ? 2 : 3;
        input.maxLength = MAX_LONG;
      } else {
        input = document.createElement('input');
        if (field.type === 'phone') {
          input.type = 'tel';
          input.inputMode = 'tel';
          input.maxLength = 20;
          input.autocomplete = compact ? 'off' : 'tel';
        } else if (field.key === 'age' || field.type === 'number') {
          input.type = 'number';
          input.inputMode = field.key === 'age' ? 'numeric' : 'decimal';
          if (field.key === 'age') { input.min = '1'; input.max = '120'; } else { input.step = 'any'; }
        } else {
          input.type = 'text';
          input.maxLength = field.key === 'name' ? 120 : MAX_VAL;
          input.autocomplete = (field.key === 'name' && !compact) ? 'name' : 'off';
        }
      }
      input.id = id;
      input.className = cls;
      if (field.key === 'name') input.value = values.name || '';
      else if (field.key === 'phone') input.value = values.phone || '';
      else if (field.key === 'age') input.value = (values.age != null && values.age !== '') ? String(values.age) : '';
      else input.value = extraData[field.id] != null ? String(extraData[field.id]) : '';
      wrap.appendChild(input);
      container.appendChild(wrap);
    });
  }

  function readFormFields(fields, prefix, admin) {
    const vis = visibleFields(fields);
    const out = { name: '', phone: '', age: null, extraData: {}, error: '' };
    for (let i = 0; i < vis.length; i++) {
      const field = vis[i];
      const el = document.getElementById(fieldInputId(prefix, field));
      const raw = el ? String(el.value || '').trim() : '';
      if (field.key === 'name') {
        out.name = raw.replace(/\s+/g, ' ');
        if (out.name.length < 3) {
          out.error = admin ? 'Escribe el nombre de la persona.' : 'Escribe tu nombre y apellido.';
          return out;
        }
        if (!admin && out.name.split(' ').length < 2) {
          out.error = 'Escribe tu nombre y apellido.';
          return out;
        }
      } else if (field.key === 'phone') {
        out.phone = raw;
        if (!raw) {
          if (field.required) {
            out.error = admin ? 'Escribe el celular.' : 'Escribe tu número de celular.';
            return out;
          }
        } else {
          const digits = raw.replace(/\D/g, '');
          if (digits.length < 8 || digits.length > 15) {
            out.error = admin ? 'El celular debe tener entre 8 y 15 dígitos (o déjalo vacío).' : 'Escribe un número de celular válido (8 dígitos).';
            return out;
          }
        }
      } else if (field.key === 'age') {
        if (!raw) {
          if (field.required) {
            out.error = admin ? 'Escribe la edad.' : 'Escribe tu edad.';
            return out;
          }
          out.age = null;
        } else {
          const age = parseInt(raw, 10);
          if (!Number.isInteger(age) || age < 1 || age > 120) {
            out.error = admin ? 'La edad debe estar entre 1 y 120 (o déjala vacía).' : 'Escribe tu edad (entre 1 y 120 años).';
            return out;
          }
          out.age = age;
        }
      } else {
        if (field.required && !raw) {
          out.error = 'Completa: ' + field.label;
          return out;
        }
        if (field.type === 'select' && raw && (field.options || []).indexOf(raw) === -1) {
          out.error = 'Elige una opción válida en ' + field.label;
          return out;
        }
        if (field.type === 'yesno' && raw && YESNO.indexOf(raw) === -1) {
          out.error = 'Elige Sí o No en ' + field.label;
          return out;
        }
        if (field.type === 'number' && raw && !isFinite(Number(raw))) {
          out.error = 'Escribe un número válido en ' + field.label;
          return out;
        }
        if (raw.length > (field.type === 'textarea' ? MAX_LONG : MAX_VAL)) {
          out.error = field.label + ' es demasiado largo.';
          return out;
        }
        if (raw) out.extraData[field.id] = raw;
      }
    }
    return out;
  }

  global.FormFields = {
    defaultFormFields,
    normalizeFormFields,
    visibleFields,
    extraFields,
    newFieldId,
    renderFormFields,
    readFormFields,
    fieldInputId,
    MAX_EXTRA,
    DEFAULT_LABELS
  };
})(window);

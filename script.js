// ============================================================
// CONFIGURACIÓN
// ============================================================
const TASA_BASE = 22;
const IVA_FIJO = 0.16;
const EMPLEADOS_VALIDOS = ['00001','00002','00003','00004','00005'];
const PLAZO_TASAS = { 12: TASA_BASE, 24: TASA_BASE * 2, 36: TASA_BASE * 3, 48: TASA_BASE * 4 };

// EmailJS — credenciales
const EJS_SERVICE  = 'service_xol8cqe';
const EJS_TEMPLATE = 'template_oths8sk';
const EJS_KEY      = 'agFUWSHdmLuHRxJl0';

let rolActual      = '';
let plazoActual    = 12;
let varOn          = false;
let pCount         = 0;
let nombreCompleto = '';

// Datos del último cálculo (para email)
let ultimaSimulacion = null;

// ============================================================
// EMAILJS INIT
// ============================================================
(function () {
  if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: EJS_KEY });
  }
})();

// ============================================================
// LOGIN
// ============================================================
function selLogin(tipo) {
  rolActual = tipo;
  document.getElementById('opt-cliente').classList.toggle('sel', tipo === 'cliente');
  document.getElementById('opt-asesor').classList.toggle('sel',  tipo === 'asesor');
  document.getElementById('campos-cliente').style.display = tipo === 'cliente' ? 'block' : 'none';
  document.getElementById('campos-asesor').style.display  = tipo === 'asesor'  ? 'block' : 'none';
  document.getElementById('login-error').style.display    = 'none';
}
selLogin('cliente');

function acceder() {
  const err = document.getElementById('login-error');
  err.style.display = 'none';

  if (rolActual === 'asesor') {
    const emp = document.getElementById('login-empleado').value.trim();
    if (!EMPLEADOS_VALIDOS.includes(emp)) {
      err.textContent = 'Número de empleado no encontrado. Verifica e intenta de nuevo.';
      err.style.display = 'block';
      return;
    }
    nombreCompleto = 'Asesor Emp. ' + emp;
    document.getElementById('f-asesor').value = 'Empleado #' + emp;
  } else {
    const n  = document.getElementById('login-nombre').value.trim();
    const a1 = document.getElementById('login-ap1').value.trim();
    const a2 = document.getElementById('login-ap2').value.trim();
    if (!n && !a1) { err.textContent = 'Ingresa al menos tu nombre.'; err.style.display = 'block'; return; }
    nombreCompleto = [n, a1, a2].filter(Boolean).join(' ');
    document.getElementById('f-nombre').value = n;
    document.getElementById('f-ap1').value    = a1;
    document.getElementById('f-ap2').value    = a2;
  }

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display          = 'block';

  const badge = document.getElementById('role-badge');
  badge.textContent = rolActual === 'asesor' ? 'Asesor' : 'Cliente';
  badge.className   = 'role-badge' + (rolActual === 'asesor' ? ' asesor' : '');
  document.getElementById('display-nombre').textContent = nombreCompleto;
  document.getElementById('card-asesor-config').style.display = rolActual === 'asesor' ? 'block' : 'none';

  actualizarTodo();
}

function cerrarSesion() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display          = 'none';
  document.getElementById('login-error').style.display  = 'none';
  ['login-empleado','login-nombre','login-ap1','login-ap2'].forEach(id => {
    document.getElementById(id).value = '';
  });
  varOn = false; pCount = 0;
  document.getElementById('periodos-list').innerHTML = '';
  document.getElementById('var-sw').classList.remove('on');
  document.getElementById('periodos-wrap').classList.remove('show');
  selLogin('cliente');
}

// ============================================================
// PLAZO
// ============================================================
function selPlazo(meses, el) {
  plazoActual = meses;
  document.querySelectorAll('.plazo-btn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  actualizarTodo();
}

function tasaParaPlazo(meses) {
  return Math.min(PLAZO_TASAS[meses] || TASA_BASE * (meses / 12), 90);
}

function actualizarTodo() {
  const monto = parseFloat(document.getElementById('f-monto').value) || 0;

  [12, 24, 36, 48].forEach(m => {
    const el = document.getElementById('tasa-tag-' + m);
    if (el) el.textContent = tasaParaPlazo(m).toFixed(1) + '% anual';
  });

  let tasa = rolActual === 'asesor'
    ? (parseFloat(document.getElementById('f-tasa').value) || TASA_BASE)
    : tasaParaPlazo(plazoActual);

  const desc = {
    12: 'Tasa base del banco (referencia BBVA/Santander)',
    24: 'Doble de intereses por mayor plazo',
    36: 'Triple de intereses por mayor plazo',
    48: 'Cuádruple de intereses por mayor plazo'
  };
  document.getElementById('ii-tasa-val').textContent   = tasa.toFixed(2) + '%';
  document.getElementById('ii-mensual').textContent    = 'Mensual: ' + (tasa / 12).toFixed(4) + '%';
  document.getElementById('ii-plazo-desc').textContent = plazoActual + ' meses — ' + (desc[plazoActual] || 'Tasa ajustada');

  if (rolActual === 'asesor') {
    const com = monto * 0.015;
    document.getElementById('cb-val').textContent = fmt(com);
    document.getElementById('cb-pct').textContent = '1.5% de ' + fmt(monto);
  }
}

function syncTasa(from) {
  let v;
  if (from === 'slider') {
    v = parseFloat(document.getElementById('f-tasa-slider').value);
    document.getElementById('f-tasa').value = v;
  } else {
    v = parseFloat(document.getElementById('f-tasa').value) || 10;
    if (v < 10) v = 10;
    if (v > 60) v = 60;
    document.getElementById('f-tasa-slider').value = v;
  }
  document.getElementById('tasa-display').textContent = v + '%';
  actualizarTodo();
}

// ============================================================
// TASAS VARIABLES
// ============================================================
function toggleVar() {
  varOn = !varOn;
  document.getElementById('var-sw').classList.toggle('on', varOn);
  document.getElementById('periodos-wrap').classList.toggle('show', varOn);
  if (varOn && pCount === 0) addPeriodo();
}

function addPeriodo() {
  pCount++;
  const list = document.getElementById('periodos-list');
  const d    = document.createElement('div');
  d.className = 'periodo-row';
  d.innerHTML = `
    <div class="periodo-num">T${pCount}</div>
    <div>
      <div style="font-size:9px;color:#6b8070;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Mes inicio</div>
      <input type="number" placeholder="Desde" min="1" class="p-from">
    </div>
    <div>
      <div style="font-size:9px;color:#6b8070;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Mes fin</div>
      <input type="number" placeholder="Hasta" min="1" class="p-to">
    </div>
    <div>
      <div style="font-size:9px;color:#6b8070;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Tasa anual %</div>
      <input type="number" placeholder="Ej. 28" step="0.1" min="10" class="p-tasa">
    </div>
    <button class="btn-del" onclick="this.parentElement.remove()" title="Eliminar tramo">×</button>
  `;
  list.appendChild(d);
}

// ============================================================
// LIMPIAR FORMULARIO
// ============================================================
function limpiar() {
  if (!confirm('¿Limpiar todos los datos del formulario?')) return;
  document.getElementById('f-nombre').value = '';
  document.getElementById('f-ap1').value    = '';
  document.getElementById('f-ap2').value    = '';
  document.getElementById('f-monto').value  = '80000';
  if (rolActual === 'asesor') {
    document.getElementById('f-tasa').value        = '22';
    document.getElementById('f-tasa-slider').value = '22';
    document.getElementById('tasa-display').textContent = '22%';
    document.getElementById('f-comision-ap').value = '1';
    document.getElementById('f-cat').value          = '25.3';
  }
  document.querySelectorAll('.plazo-btn').forEach((b, i) => b.classList.toggle('sel', i === 0));
  plazoActual = 12;
  document.getElementById('periodos-list').innerHTML = '';
  pCount = 0;
  if (varOn) {
    varOn = false;
    document.getElementById('var-sw').classList.remove('on');
    document.getElementById('periodos-wrap').classList.remove('show');
  }
  actualizarTodo();
}

// ============================================================
// BORRAR HISTORIAL GUARDADO EN LOCALSTORAGE
// ============================================================
function borrarStorage() {
  if (!confirm('¿Deseas borrar todo el historial guardado localmente? Esta acción no se puede deshacer.')) return;

  // Borrar todas las claves relacionadas al simulador
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    keysToRemove.push(localStorage.key(i));
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // También sessionStorage
  sessionStorage.clear();

  alert('Historial borrado correctamente. No hay datos guardados en este navegador.');
}

// ============================================================
// MODAL PRINCIPAL
// ============================================================
function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}
document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) cerrarModal();
});

function descargarPDF() {
  window.print();
}

// ============================================================
// MODAL EMAIL
// ============================================================
function abrirModalEmail() {
  if (!ultimaSimulacion) { alert('Primero genera una simulación.'); return; }
  document.getElementById('email-status').style.display = 'none';
  document.getElementById('modal-email-overlay').classList.add('open');
}

function cerrarModalEmail() {
  document.getElementById('modal-email-overlay').classList.remove('open');
}

document.getElementById('modal-email-overlay').addEventListener('click', function (e) {
  if (e.target === this) cerrarModalEmail();
});

function enviarEmail() {
  const destino = document.getElementById('email-destino').value.trim();
  const mensaje = document.getElementById('email-msg').value.trim();
  const status  = document.getElementById('email-status');
  const btn     = document.getElementById('btn-enviar-email');

  if (!destino || !/\S+@\S+\.\S+/.test(destino)) {
    mostrarStatus(status, 'Ingresa un correo electrónico válido.', 'error');
    return;
  }

  if (!ultimaSimulacion) {
    mostrarStatus(status, 'No hay simulación para enviar. Calcula primero.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const s = ultimaSimulacion;
  const templateParams = {
    to_email       : destino,
    to_name        : destino,
    from_name      : 'Simulador de Crédito Personal',
    solicitante    : s.nombre,
    monto          : s.monto,
    plazo          : s.plazo + ' meses',
    tasa           : s.tasa + '% anual',
    sistema        : s.sistema,
    primer_pago    : s.primerPago,
    ultimo_pago    : s.ultimoPago,
    total_pagar    : s.totalPagar,
    total_intereses: s.totalIntereses,
    cat            : s.cat + '%',
    mensaje        : mensaje || 'Adjunto encontrará el resumen de su cotización de crédito personal.'
  };

  emailjs.send(EJS_SERVICE, EJS_TEMPLATE, templateParams)
    .then(() => {
      mostrarStatus(status, 'Correo enviado correctamente a ' + destino, 'ok');
      btn.disabled = false;
      btn.textContent = 'Enviar cotización';
    })
    .catch(err => {
      console.error('EmailJS error:', err);
      mostrarStatus(status, 'Error al enviar. Verifica tu conexión o las credenciales de EmailJS.', 'error');
      btn.disabled = false;
      btn.textContent = 'Enviar cotización';
    });
}

function mostrarStatus(el, msg, tipo) {
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color   = tipo === 'ok' ? '#2d6a46' : '#c0392b';
  el.style.background = tipo === 'ok' ? '#e8f5ee' : '#fdf0ef';
  el.style.border  = '1px solid ' + (tipo === 'ok' ? '#b8d9c4' : '#f5c4c0');
  el.style.borderRadius = '8px';
  el.style.padding = '9px 13px';
}

// ============================================================
// FORMATO
// ============================================================
function fmt(n) {
  if (isNaN(n)) return '$0.00';
  return '$' + parseFloat(n.toFixed(2)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
// CALCULAR AMORTIZACIÓN
// ============================================================
function getTM(mes, tasaEfectiva, periodos) {
  if (varOn && periodos.length) {
    for (const p of periodos) {
      if (mes >= p.desde && mes <= p.hasta) return p.tasa / 12 / 100;
    }
  }
  return tasaEfectiva / 12 / 100;
}

function calcular() {
  const nombre    = document.getElementById('f-nombre').value.trim();
  const ap1       = document.getElementById('f-ap1').value.trim();
  const ap2       = document.getElementById('f-ap2').value.trim();
  const monto     = parseFloat(document.getElementById('f-monto').value) || 0;
  if (monto <= 0) { alert('Ingresa el monto del crédito.'); return; }

  const plazo = plazoActual;
  let tasa, comAp = 0, cat = 0;

  if (rolActual === 'asesor') {
    tasa  = parseFloat(document.getElementById('f-tasa').value)        || TASA_BASE;
    comAp = parseFloat(document.getElementById('f-comision-ap').value) || 0;
    cat   = parseFloat(document.getElementById('f-cat').value)         || 0;
  } else {
    tasa  = tasaParaPlazo(plazo);
    comAp = 1;
    cat   = tasa * 1.15;
  }

  const periodos = [];
  if (varOn && rolActual === 'asesor') {
    document.querySelectorAll('.periodo-row').forEach(r => {
      const desde = parseInt(r.querySelector('.p-from').value);
      const hasta = parseInt(r.querySelector('.p-to').value);
      const t     = parseFloat(r.querySelector('.p-tasa').value);
      if (desde && hasta && t && desde <= hasta) periodos.push({ desde, hasta, tasa: t });
    });
  }

  const comApMonto  = monto * comAp / 100;
  const comApIva    = comApMonto * IVA_FIJO;
  const comApTotal  = comApMonto + comApIva;
  const totalFinanciar = monto + comApTotal;
  const comAsesor   = monto * 0.015;

  const tipoAmort   = document.getElementById('f-tipo').value;
  let rows = [], totPagos = 0, totInt = 0, totIva = 0, totCap = 0;

  if (tipoAmort === 'lineal') {
    const capFijo = monto / plazo;
    let saldo     = monto;
    for (let i = 1; i <= plazo; i++) {
      const tm   = getTM(i, tasa, periodos);
      const int  = saldo * tm;
      const iva  = int * IVA_FIJO;
      const pago = capFijo + int + iva;
      const sf   = Math.max(0, saldo - capFijo);
      rows.push({ mes: i, si: saldo, cap: capFijo, int, iva, pago, sf, tm });
      totPagos += pago; totInt += int; totIva += iva; totCap += capFijo;
      saldo = sf;
    }
  } else if (tipoAmort === 'frances') {
    const tm0 = tasa / 12 / 100;
    const pmt = tm0 === 0 ? monto / plazo : monto * tm0 * Math.pow(1 + tm0, plazo) / (Math.pow(1 + tm0, plazo) - 1);
    let saldo = monto;
    for (let i = 1; i <= plazo; i++) {
      const tm  = getTM(i, tasa, periodos);
      const int = saldo * tm;
      const iva = int * IVA_FIJO;
      const cap = Math.min(pmt - int, saldo);
      const pago = cap + int + iva;
      const sf  = Math.max(0, saldo - cap);
      rows.push({ mes: i, si: saldo, cap, int, iva, pago, sf, tm });
      totPagos += pago; totInt += int; totIva += iva; totCap += cap;
      saldo = sf;
    }
  } else {
    let saldo = monto;
    for (let i = 1; i <= plazo; i++) {
      const tm  = getTM(i, tasa, periodos);
      const int = saldo * tm;
      const iva = int * IVA_FIJO;
      const cap = i === plazo ? saldo : 0;
      const pago = cap + int + iva;
      const sf  = Math.max(0, saldo - cap);
      rows.push({ mes: i, si: saldo, cap, int, iva, pago, sf, tm });
      totPagos += pago; totInt += int; totIva += iva; totCap += cap;
      saldo = sf;
    }
  }

  const tipoLabel  = { lineal: 'Capital constante (alemán)', frances: 'Cuota fija (francés)', bullet: 'Solo intereses (bullet)' };
  const nombreSol  = [nombre, ap1, ap2].filter(Boolean).join(' ') || nombreCompleto;
  const asesorNombre = document.getElementById('f-asesor').value || '—';

  // Guardar para email
  ultimaSimulacion = {
    nombre       : nombreSol,
    monto        : fmt(monto),
    plazo,
    tasa         : tasa.toFixed(2),
    sistema      : tipoLabel[tipoAmort],
    primerPago   : fmt(rows[0].pago),
    ultimoPago   : fmt(rows[rows.length - 1].pago),
    totalPagar   : fmt(totPagos + comApTotal),
    totalIntereses: fmt(totInt + totIva),
    cat          : cat.toFixed(1)
  };

  // Persistir último cálculo en localStorage
  try {
    localStorage.setItem('simulador_ultima_simulacion', JSON.stringify(ultimaSimulacion));
    localStorage.setItem('simulador_ultima_fecha', new Date().toLocaleString('es-MX'));
  } catch (e) { /* espacio lleno, ignorar */ }

  let html = `
    <div class="resumen-box">
      <div class="resumen-title">Crédito Personal — ${nombreSol}</div>
      <div class="resumen-grid">
        <div><div class="ri-label">Solicitante</div><div class="ri-val">${nombreSol}</div></div>
        <div><div class="ri-label">Monto autorizado</div><div class="ri-val dark">${fmt(monto)}</div></div>
        <div><div class="ri-label">Plazo</div><div class="ri-val">${plazo} meses</div></div>
        <div><div class="ri-label">Tasa anual</div><div class="ri-val">${tasa.toFixed(2)}%</div></div>
        <div><div class="ri-label">IVA sobre intereses</div><div class="ri-val">16% fijo</div></div>
        <div><div class="ri-label">Comisión apertura c/IVA</div><div class="ri-val">${fmt(comApTotal)}</div></div>
        <div><div class="ri-label">Total a financiar</div><div class="ri-val dark">${fmt(totalFinanciar)}</div></div>
        <div><div class="ri-label">CAT estimado</div><div class="ri-val">${cat.toFixed(1)}%</div></div>
        <div><div class="ri-label">Sistema amortización</div><div class="ri-val">${tipoLabel[tipoAmort]}</div></div>
      </div>
    </div>
    <div class="comision-modal">
      <div><div class="cm-label">Comisión al asesor (1.5% del monto)</div><div class="cm-sub">Asesor: ${asesorNombre}</div></div>
      <div class="cm-val">${fmt(comAsesor)}</div>
    </div>
    <div class="metrics-row">
      <div class="m-box accent">
        <div class="m-lbl">Total a pagar</div>
        <div class="m-val">${fmt(totPagos + comApTotal)}</div>
        <div class="m-sub">Capital + intereses + IVA + comisión</div>
      </div>
      <div class="m-box">
        <div class="m-lbl">Total intereses + IVA</div>
        <div class="m-val">${fmt(totInt + totIva)}</div>
        <div class="m-sub">Int: ${fmt(totInt)} | IVA: ${fmt(totIva)}</div>
      </div>
      <div class="m-box">
        <div class="m-lbl">Primer mensualidad</div>
        <div class="m-val">${fmt(rows[0].pago)}</div>
        <div class="m-sub">Mes 1 — mayor pago</div>
      </div>
      <div class="m-box">
        <div class="m-lbl">${tipoAmort === 'lineal' ? 'Última mensualidad' : 'Pago fijo mensual'}</div>
        <div class="m-val">${fmt(rows[rows.length - 1].pago)}</div>
        <div class="m-sub">Mes ${plazo}</div>
      </div>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr>
          <th>Mes</th><th>Saldo inicial</th><th>Pago a capital</th>
          <th>Interés ordinario</th><th>IVA s/interés (16%)</th>
          <th>Pago mensual</th><th>Saldo final</th><th>Tasa anual</th>
        </tr></thead>
        <tbody>
  `;

  rows.forEach((r, idx) => {
    const cambio = idx > 0 && Math.abs(r.tm - rows[idx - 1].tm) > 0.00001;
    html += `<tr class="${cambio ? 'tasa-change' : ''}">
      <td>${r.mes}</td>
      <td>${fmt(r.si)}</td>
      <td>${fmt(r.cap)}</td>
      <td>${fmt(r.int)}</td>
      <td>${fmt(r.iva)}</td>
      <td>${fmt(r.pago)}</td>
      <td>${fmt(r.sf)}</td>
      <td>${(r.tm * 12 * 100).toFixed(2)}%${cambio ? '<span class="tasa-tag">cambio</span>' : ''}</td>
    </tr>`;
  });

  html += `</tbody>
    <tfoot><tr>
      <td>TOTAL</td><td>—</td><td>${fmt(totCap)}</td>
      <td>${fmt(totInt)}</td><td>${fmt(totIva)}</td>
      <td>${fmt(totPagos)}</td><td>—</td><td>—</td>
    </tr></tfoot>
    </table></div>
  `;

  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-content').scrollTop = 0;
}

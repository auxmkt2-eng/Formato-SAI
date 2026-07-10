
const SEDES = ["", "Morelia", "Toluca", "Narvarte", "Tijuana"];
function calcularTotal(subtotal, iva) {
  const sub = Number(subtotal) || 0;
  const ivaNum = Number(iva) || 0;
  if (subtotal === "" && iva === "") return "";
  return Math.round((sub + ivaNum) * 100) / 100;
}

// ============================================================
// 2) HELPERS
// ============================================================
const $ = (id) => document.getElementById(id);

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(Number(valor || 0));
}
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function selectedValues(select) {
  return Array.from(select.options).filter(o => o.selected).map(o => o.value);
}
function setSelectOptions(select, options) {
  select.innerHTML = "";
  options.forEach(op => {
    const o = document.createElement("option");
    o.value = op; o.textContent = op;
    select.appendChild(o);
  });
}
function setSaveStatus(message, type = "info") {
  const el = $("saveStatus");
  el.textContent = message;
  el.style.color = type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "";
}
let toastTimer = null;
function showToast(message, type = "success") {
  const toast = $("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = "toast hidden", 2600);
}
// ============================================================
// 3) INIT DE FILTROS
// ============================================================
function initFilters() {
  $("filtroSede").innerHTML = SEDES.map(s => `<option value="${s}">${s || "Todas"}</option>`).join("");
}

// ============================================================
// 4) FILTRADO
// ============================================================
function applyFilters() {
  let rows = [...allRows];

  // Regla de negocio clave: un usuario de sede SOLO ve su propia sede,
  // sin importar lo que diga el selector de filtros.
  if (currentUser && currentUser.role === "sede") {
    rows = rows.filter(r => r.sede === currentUser.sede);
  }

  const marcas = Array.from(document.querySelectorAll(".filtro-marca")).filter(cb => cb.checked).map(cb => cb.value);
  if (marcas.length) rows = rows.filter(r => marcas.includes(r.marca));

  const desde = $("filtroFechaInicio").value;
  const hasta = $("filtroFechaFin").value;
  if (desde) rows = rows.filter(r => (r.fechaInfusion || "") >= desde);
  if (hasta) rows = rows.filter(r => (r.fechaInfusion || "") <= hasta);

  const text = $("filtroTexto").value.trim().toLowerCase();
  if (text) {
    rows = rows.filter(r => [r.folio, r.paciente, r.medicos, r.diagnostico].join(" ").toLowerCase().includes(text));
  }

  if ($("filtroSede").value) rows = rows.filter(r => (r.sede || "") === $("filtroSede").value);

  filteredRows = rows;
  renderKPIs(rows);
  renderTable(rows);
}

// ============================================================
// 5) KPIs
// ============================================================
function renderKPIs(rows) {
  const subtotal = rows.reduce((a, r) => a + (r.montoServicio || 0), 0);

  $("kpiSubtotal").textContent = rows.length;
  $("kpiSubtotalMonto").textContent = formatearMoneda(subtotal);
  $("contadorFilas").textContent = `${rows.length} registros`;
}

// ============================================================
// 6) TABLA UNIFICADA
// ============================================================
function renderTable(rows) {
  const tbody = $("tablaCotizacionesBody");
  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.fechaInfusion || "—")}</td>
      <td>${escapeHtml(row.semana ?? "—")}</td>
      <td>${escapeHtml(row.servicio || "—")}</td>
      <td>${escapeHtml(row.horaCita || "—")}</td>
      <td>${escapeHtml(row.ciclo || "—")}</td>
      <td>${escapeHtml(row.paciente)}</td>
      <td>${escapeHtml(row.estatusPaciente || "—")}</td>
      <td>${escapeHtml(row.medicos || "—")}</td>
      <td>${escapeHtml(row.tipoTratamiento || "—")}</td>
      <td>${escapeHtml(row.aseguradora || "—")}</td>
      <td class="money">${formatearMoneda(row.honorarioMedico)}</td>
      <td>${escapeHtml(row.primeraVez || "—")}</td>
      <td class="money">${formatearMoneda(row.subtotal)}</td>
      <td class="money">${formatearMoneda(row.iva)}</td>
      <td class="money">${formatearMoneda(row.montoServicio)}</td>
      <td>${escapeHtml(row.tratamiento || "—")}</td>
      <td>${escapeHtml(row.diagnostico || "—")}</td>
      <td>${escapeHtml(row.notas || "—")}</td>
      <td>
        <div class="row-actions">
          <button class="action-btn" data-open="${row.id}">Abrir</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => openDrawer(btn.dataset.open)));
}

function persist(row, msg) {
  // Aquí conectarías tu API real (fetch/Firestore/etc.) en vez de solo re-renderizar.
  applyFilters();
  setSaveStatus(`Último guardado: ${msg} · ${new Date().toLocaleString("es-MX")}`, "success");
  showToast("Cambios guardados", "success");
}

// ============================================================
// 7) DRAWER DE DETALLE
// ============================================================
function openDrawer(id) {
  selectedRow = allRows.find(r => r.id === id);
  if (!selectedRow) return;

  $("drawerMarca").textContent = selectedRow.marca;
  $("drawerPaciente").textContent = selectedRow.paciente || "Sin nombre";
  $("drawerMeta").textContent = `${selectedRow.folio || "Sin folio"} · ${selectedRow.medicos || "Sin médico"}`;

  $("edFechaInfusion").value = selectedRow.fechaInfusion || "";
  $("edSemana").value = selectedRow.semana ?? "";
  $("edServicio").value = selectedRow.servicio || "";
  $("edHoraCita").value = selectedRow.horaCita || "";
  $("edCiclo").value = selectedRow.ciclo || "";
  $("edPaciente").value = selectedRow.paciente || "";
  $("edEstatusPaciente").value = selectedRow.estatusPaciente || "";
  $("edMedicos").value = selectedRow.medicos || "";
  $("edTipoTratamiento").value = selectedRow.tipoTratamiento || "";
  $("edAseguradora").value = selectedRow.aseguradora || "";
  $("edHonorarioMedico").value = selectedRow.honorarioMedico ?? "";
  $("edPrimeraVez").value = selectedRow.primeraVez || "";
  $("edSubtotal").value = selectedRow.subtotal ?? "";
  $("edIva").value = selectedRow.iva ?? "";
  $("edMontoServicio").value = selectedRow.montoServicio ?? "";
  $("edTratamiento").value = selectedRow.tratamiento || "";
  $("edDiagnostico").value = selectedRow.diagnostico || "";
  $("edNotas").value = selectedRow.notas || "";
  $("edSede").value = selectedRow.sede || "";

  $("drawer").classList.remove("hidden");
  $("drawerBackdrop").classList.remove("hidden");
}

function closeDrawer() {
  $("drawer").classList.add("hidden");
  $("drawerBackdrop").classList.add("hidden");
  selectedRow = null;
}

async function saveDrawer() {
  if (!selectedRow) return;

  const paciente = $("edPaciente").value.trim();
  const fechaInfusion = $("edFechaInfusion").value;
  if (!paciente || !fechaInfusion) {
    showToast("Paciente y Fecha Infusión son obligatorios.", "error");
    return;
  }

  const cambios = {
    fecha_infusion: fechaInfusion,
    semana: leerNumeroEd($("edSemana").value),
    servicio: $("edServicio").value.trim() || null,
    hora_cita: $("edHoraCita").value.trim() || null,
    ciclo: $("edCiclo").value.trim() || null,
    paciente,
    estatus_paciente: $("edEstatusPaciente").value.trim() || null,
    medicos: $("edMedicos").value.trim() || null,
    tipo_tratamiento: $("edTipoTratamiento").value.trim() || null,
    aseguradora_pago_bolsillo: $("edAseguradora").value.trim() || null,
    honorario_medico: leerNumeroEd($("edHonorarioMedico").value),
    primera_vez: $("edPrimeraVez").value.trim() || null,
    subtotal: leerNumeroEd($("edSubtotal").value),
    iva: leerNumeroEd($("edIva").value),
    monto_del_servicio: leerNumeroEd($("edMontoServicio").value),
    tratamiento: $("edTratamiento").value.trim() || null,
    diagnostico: $("edDiagnostico").value.trim() || null,
    notas: $("edNotas").value.trim() || null,
    sede: $("edSede").value.trim() || null
  };

  const btn = $("btnGuardarDetalle");
  btn.disabled = true;
  try {
    const { error } = await supabaseClient.from("cotizaciones").update(cambios).eq("id", selectedRow.id);
    if (error) throw new Error(error.message);
    showToast(`Registro actualizado: ${selectedRow.folio}`, "success");
    closeDrawer();
    await cargarRegistros();
  } catch (err) {
    console.error(err);
    showToast(err.message || "No se pudo guardar el registro.", "error");
  } finally {
    btn.disabled = false;
  }
}

function leerNumeroEd(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = Number(valor);
  return isNaN(n) ? null : n;
}

// ============================================================
// 8) EVENTOS
// ============================================================
function initEvents() {
  ["filtroTexto", "filtroFechaInicio", "filtroFechaFin", "filtroSede"].forEach(id => {
    $(id).addEventListener("input", applyFilters);
    $(id).addEventListener("change", applyFilters);
  });
  document.querySelectorAll(".filtro-marca").forEach(cb => cb.addEventListener("change", applyFilters));

  $("btnLimpiarFiltros").addEventListener("click", () => {
    $("filtroTexto").value = "";
    $("filtroFechaInicio").value = "";
    $("filtroFechaFin").value = "";
    $("filtroSede").value = "";
    document.querySelectorAll(".filtro-marca").forEach(cb => cb.checked = true);
    applyFilters();
  });

  $("btnCerrarDrawer").addEventListener("click", closeDrawer);
  $("drawerBackdrop").addEventListener("click", closeDrawer);
  $("btnGuardarDetalle").addEventListener("click", saveDrawer);
  $("btnBorrarRegistro").addEventListener("click", borrarRegistroActual);

 function actualizarTotalEdicion() {
  $("edMontoServicio").value = calcularTotal($("edSubtotal").value, $("edIva").value);
}

$("edSubtotal").addEventListener("input", actualizarTotalEdicion);
$("edIva").addEventListener("input", actualizarTotalEdicion);
}

async function borrarRegistroActual() {
  if (!selectedRow) return;

  const confirmado = window.confirm(
    `Vas a borrar el registro de "${selectedRow.paciente || "este paciente"}" (${selectedRow.folio || "sin folio"}). Esta acción no se puede deshacer. ¿Continuar?`
  );
  if (!confirmado) return;

  const btn = $("btnBorrarRegistro");
  btn.disabled = true;
  try {
    const { error } = await supabaseClient.from("cotizaciones").delete().eq("id", selectedRow.id);
    if (error) throw new Error(error.message);
    showToast(`Registro borrado: ${selectedRow.folio || selectedRow.paciente}`, "success");
    closeDrawer();
    await cargarRegistros();
  } catch (err) {
    console.error(err);
    showToast(err.message || "No se pudo borrar el registro.", "error");
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
// 9) CARGA DE DATOS REALES DESDE SUPABASE
// ============================================================
function mapRegistroSupabase(r) {
  return {
    id: String(r.id),
    folio: r.folio || "",
    marca: r.marca || "",
    sede: r.sede || "",
    fechaInfusion: r.fecha_infusion || "",
    semana: r.semana,
    servicio: r.servicio || "",
    horaCita: r.hora_cita || "",
    ciclo: r.ciclo || "",
    paciente: r.paciente || "",
    estatusPaciente: r.estatus_paciente || "",
    medicos: r.medicos || "",
    tipoTratamiento: r.tipo_tratamiento || "",
    aseguradora: r.aseguradora_pago_bolsillo || "",
    honorarioMedico: r.honorario_medico,
    primeraVez: r.primera_vez || "",
    subtotal: r.subtotal,
    iva: r.iva,
    montoServicio: r.monto_del_servicio,
    tratamiento: r.tratamiento || "",
    diagnostico: r.diagnostico || "",
    notas: r.notas || ""
  };
}

async function cargarRegistros() {
  try {
    const { data, error } = await supabaseClient.from("cotizaciones").select("*");
    if (error) throw error;

    allRows = (data || [])
      .map(mapRegistroSupabase)
      .sort((a, b) => (b.fechaInfusion || "").localeCompare(a.fechaInfusion || ""));

    applyFilters();
    $("ultimaActualizacion").textContent = `Actualizado: ${new Date().toLocaleString("es-MX")}`;
  } catch (err) {
    console.error(err);
    showToast(err.message || "No se pudieron cargar los registros de Supabase.", "error");
  }
}
// Se expone globalmente para que Excelimport.js y nuevoRegistro.js
// puedan refrescar la tabla justo después de guardar.
window.cargarRegistros = cargarRegistros;

// ============================================================
// 10) INIT
// ============================================================
// auth.js llama a initDashboard() justo después de mostrar el
// panel (login exitoso o sesión ya guardada en localStorage).
let dashboardInited = false;
function initDashboard() {
  if (dashboardInited) { cargarRegistros(); return; } // ya estaba inicializado, solo refresca
  dashboardInited = true;
  initFilters();
  initEvents();
  cargarRegistros();
}

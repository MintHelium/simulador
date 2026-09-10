"use strict";

// Variables globales
let lotesData = {};
let modoCalculo = "enganche"; // "enganche" o "mensualidad"

// DOM
const desarrolloSelect = document.getElementById("desarrollo");
const etapaSelect = document.getElementById("etapa");
const tamanoSelect = document.getElementById("tamano");
const tipoSelect = document.getElementById("tipo");
const pagoSelect = document.getElementById("pago");
const plazoSelect = document.getElementById("plazo");

const engancheInput = document.getElementById("enganche");
const mensualidadInput = document.getElementById("mensualidadInput");

const resEngancheSpan = document.getElementById("resEnganche");
const mensualidadSpan = document.getElementById("mensualidad");
const valorTotalSpan = document.getElementById("valorTotal");
const ahorroSpan = document.getElementById("ahorro");
const anualidadesResumenSpan = document.getElementById("anualidadesResumen");

const infoEtapaDiv = document.getElementById("infoEtapa");

const zonaAnualidadesDiv = document.getElementById("zonaAnualidades");
const anualidadesSelect = document.getElementById("anualidades");
const anualidadMontoInput = document.getElementById("anualidadMonto");
const btnAnualidadMas = document.getElementById("btnAnualidadMas");
const btnAnualidadMenos = document.getElementById("btnAnualidadMenos");
const anualidadMontoGroup = document.getElementById("anualidadMontoGroup");

const usarAnualidadesSelect = document.getElementById("usarAnualidades");
const cantidadAnualidadesGroup = document.getElementById("cantidadAnualidadesGroup");
const mensajeCalculo = document.getElementById("mensajeCalculo");

function leerImporte(valor) {
  const texto = String(valor).trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(texto)) return 0;
  const numero = Number(texto.replace(/,/g, ""));
  return Number.isFinite(numero) ? numero : 0;
}

function limpiarResultados() {
  for (const id of ["resEnganche", "mensualidad", "valorTotal", "ahorro",
                    "comisionCobrar", "comisionAhorro", "comisionTotal"]) {
    document.getElementById(id).textContent = "$0.00";
  }
  anualidadesResumenSpan.textContent = "";
  anualidadesResumenSpan.parentElement.style.display = "none";
  mensajeCalculo.textContent = "";
}

function resetAnualidades() {
  usarAnualidadesSelect.value = "no";
  anualidadesSelect.innerHTML = '<option value="">Seleccione cantidad</option>';
  anualidadMontoInput.value = "0";
  cantidadAnualidadesGroup.style.display = "none";
  anualidadMontoGroup.style.display = "none";
  zonaAnualidadesDiv.style.display = "none";
}

// ==========================
// ANUALIDADES (NUEVA LÓGICA)
// ==========================
const POOL_ANUALIDADES_OBJETIVO = 160000; // objetivo total (ej. 45m = 4x40k = 160k)
const MULTIPLO_ANUALIDAD = 5000;          // redondeo a múltiplos de 5000

function redondearAlMultiploMasCercano(valor, multiplo) {
  if (!isFinite(valor) || multiplo <= 0) return 0;
  return Math.round(valor / multiplo) * multiplo;
}

function getMaxAnualidadesPorPlazo(plazoNum) {
  if (plazoNum >= 45) return 4;
  if (plazoNum >= 35) return 3;
  if (plazoNum >= 25) return 2;
  if (plazoNum >= 12) return 1;
  return 0;
}

function getMontoMaxPorAnualidad(plazoNum) {
  const maxAnualidades = getMaxAnualidadesPorPlazo(plazoNum);
  if (maxAnualidades <= 0) return 0;
  const base = POOL_ANUALIDADES_OBJETIVO / maxAnualidades;
  // múltiplo más cercano (ej. 160/3=53,333 => 55,000)
  const redondeado = redondearAlMultiploMasCercano(base, MULTIPLO_ANUALIDAD);
  return Math.max(0, redondeado);
}

/* ==========================
   1) CARGA DE DATOS JSON
========================== */
async function cargarDatos() {
  try {
    const resp = await fetch("./lotes.json");
    if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);
    lotesData = await resp.json();
    llenarDesarrollos();
  } catch (err) {
    console.error("Error al cargar JSON:", err);
    document.getElementById("errorCarga").textContent =
      "No se pudo cargar el catálogo de lotes. Revisa tu conexión y recarga la página para intentar de nuevo.";
    desarrolloSelect.disabled = true;
  }
}

function llenarDesarrollos() {
  desarrolloSelect.innerHTML = "<option value=''>Seleccione un desarrollo</option>";
  Object.keys(lotesData).forEach(d => {
    desarrolloSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

/* =======================================
   2) LLENADO DE SELECTS Y RESETEO
======================================= */
function resetCamposDesde(nivel) {
  const niveles = ["desarrollo", "etapa", "tamano", "tipo", "pago", "plazo"];
  const idx = niveles.indexOf(nivel);

  for (let i = idx + 1; i < niveles.length; i++) {
    const sel = document.getElementById(niveles[i]);
    sel.innerHTML = `<option value=''>Seleccione un ${niveles[i]}</option>`;
    sel.disabled = true;
  }
  engancheInput.value = "";
  mensualidadInput.value = "";
  limpiarResultados();
  resetAnualidades();
  engancheInput.disabled = true;
  mensualidadInput.disabled = true;

  if (nivel === "desarrollo" || nivel === "etapa") {
    infoEtapaDiv.textContent = "";
  }
}

function llenarEtapas() {
  resetCamposDesde("desarrollo");
  const desarrollo = desarrolloSelect.value;
  if (!desarrollo) return;

  const dataDev = lotesData[desarrollo];
  etapaSelect.innerHTML = "<option value=''>Seleccione una etapa</option>";
  Object.keys(dataDev).forEach(et => {
    etapaSelect.innerHTML += `<option value="${et}">${et}</option>`;
  });
  etapaSelect.disabled = false;
}

function manejarSeleccionEtapa() {
  resetCamposDesde("etapa");
  const desarrollo = desarrolloSelect.value;
  const etapa = etapaSelect.value;
  if (!etapa) return;

  const dataEtapa = lotesData[desarrollo][etapa];
  if (typeof dataEtapa === "string") {
    // Etapa en preventa
    infoEtapaDiv.textContent = `🔜 ${dataEtapa} - Separación: $5,000.00`;
    return;
  }
  // Caso normal
  tamanoSelect.innerHTML = "<option value=''>Seleccione un tamaño</option>";
  Object.keys(dataEtapa).forEach(tm => {
    tamanoSelect.innerHTML += `<option value="${tm}">${tm}</option>`;
  });
  tamanoSelect.disabled = false;
}

function llenarTipos() {
  resetCamposDesde("tamano");
  const desarrollo = desarrolloSelect.value;
  const etapa = etapaSelect.value;
  const tamano = tamanoSelect.value;
  if (!tamano) return;

  const dataTamano = lotesData[desarrollo][etapa][tamano];
  tipoSelect.innerHTML = "<option value=''>Seleccione un tipo</option>";
  Object.keys(dataTamano).forEach(tp => {
    tipoSelect.innerHTML += `<option value="${tp}">${tp}</option>`;
  });
  tipoSelect.disabled = false;
}

function llenarFormasDePago() {
  resetCamposDesde("tipo");
  const desarrollo = desarrolloSelect.value;
  const etapa = etapaSelect.value;
  const tamano = tamanoSelect.value;
  const tipo = tipoSelect.value;
  if (!tipo) return;

  const dataTipo = lotesData[desarrollo][etapa][tamano][tipo];
  pagoSelect.innerHTML = "<option value=''>Seleccione una forma de pago</option>";

  if ("Contado" in dataTipo) {
    pagoSelect.innerHTML += `<option value="Contado">Contado</option>`;
  }
  if ("Financiamiento" in dataTipo) {
    pagoSelect.innerHTML += `<option value="Financiamiento">Financiamiento</option>`;
  }
  pagoSelect.disabled = false;
}

function llenarPlazos() {
  resetCamposDesde("pago");
  const desarrollo = desarrolloSelect.value;
  const etapa = etapaSelect.value;
  const tamano = tamanoSelect.value;
  const tipo = tipoSelect.value;
  const formaPago = pagoSelect.value;
  if (!formaPago) return;

  const dataTipo = lotesData[desarrollo][etapa][tamano][tipo];
  if (formaPago === "Financiamiento") {
    const plazosObj = dataTipo.Financiamiento;
    plazoSelect.innerHTML = "<option value=''>Seleccione un plazo</option>";
    Object.keys(plazosObj).forEach(p => {
      plazoSelect.innerHTML += `<option value="${p}">${p} meses</option>`;
    });
    plazoSelect.disabled = false;
    // ✅ MOSTRAR anualidades en financiamiento
    zonaAnualidadesDiv.style.display = "block";
    usarAnualidadesSelect.disabled = true;
  } else {
    zonaAnualidadesDiv.style.display = "none";
 
    plazoSelect.innerHTML = "<option value=''>N/A</option>";
    plazoSelect.disabled = true;
    // Contado
    actualizarResultados();
  }
  habilitarInputs();

}

/* ==================================
   3) HABILITACIÓN DE INPUTS
================================== */
function habilitarInputs() {
  const formaPago = pagoSelect.value;
  engancheInput.disabled = true;
  mensualidadInput.disabled = true;

  if (formaPago === "Financiamiento" && plazoSelect.value) {
    if (modoCalculo === "enganche") {
      engancheInput.disabled = false;
    } else {
      mensualidadInput.disabled = false;
    }
  }
}

/* ===================================================
   4) CÁLCULO DE MENSUALIDADES (AL PERDER FOCO)
=================================================== */
function calcularPlanMensualidades(precio, enganche, plazo) {
  const saldo = Math.round((precio - enganche) * 100);
  if (!Number.isFinite(saldo) || !Number.isInteger(plazo) || plazo < 1 || saldo < 200000 * plazo) {
    return null;
  }
  // Mantener el redondeo comercial a $50, salvo división exacta en centavos.
  let base = saldo % plazo === 0 ? saldo / plazo : Math.ceil(saldo / plazo / 5000) * 5000;
  // Si redondear hacia arriba consume el último pago, usar el múltiplo inferior.
  if (saldo - base * (plazo - 1) <= 0) base = Math.floor(saldo / plazo / 5000) * 5000;
  const ultima = saldo - base * (plazo - 1);
  if (ultima <= 0) return null;
  return { mensualBase: base / 100, ultima: saldo % plazo === 0 ? 0 : ultima / 100,
    pagosNormales: saldo % plazo === 0 ? plazo : plazo - 1, total: precio };
}

function limitarFinanciamiento({ precio, precioContado, minimo, plazo, enganche, mensualidad, cantidad, monto, modo }) {
  const disponible = precio - 2000 * plazo;
  const maxEnganche = Math.min(precioContado, disponible);
  if (![precio, precioContado, minimo, plazo, disponible].every(Number.isFinite) ||
      plazo < 1 || minimo < 0 || maxEnganche < minimo) return null;
  enganche = Math.min(maxEnganche, Math.max(minimo, enganche));
  // En modo mensualidad se reserva primero el enganche mínimo; en modo enganche, el elegido.
  const reserva = modo === "mensualidad" ? minimo : enganche;
  const maxMonto = cantidad > 0 ? Math.max(0, Math.min(getMontoMaxPorAnualidad(plazo),
    Math.floor((disponible - reserva) / cantidad / 1000) * 1000)) : 0;
  monto = Math.min(maxMonto, Math.max(0, Math.round(monto / 1000) * 1000));
  const totalAnualidades = cantidad * monto;
  if (modo === "mensualidad") {
    enganche = Math.min(maxEnganche, Math.max(minimo,
      precio - totalAnualidades - Math.max(2000, mensualidad) * plazo));
  }
  enganche = Math.round(Math.min(enganche, disponible - totalAnualidades) * 100) / 100;
  const plan = calcularPlanMensualidades(precio, enganche + totalAnualidades, plazo);
  return plan ? { enganche, monto, maxMonto, plan } : null;
}

function actualizarResultados() {
  limpiarResultados();
  habilitarInputs();
  const desarrollo = desarrolloSelect.value;
  const etapa = etapaSelect.value;
  const tamano = tamanoSelect.value;
  const tipo = tipoSelect.value;
  const formaPago = pagoSelect.value;
  const plazoVal = plazoSelect.value;

  if (!desarrollo || !etapa || !tamano || !tipo) return;
  const dataLote = lotesData[desarrollo][etapa][tamano][tipo];
  if (!dataLote) return;

  let plazoNum = parseInt(plazoVal);
  if (isNaN(plazoNum)) plazoNum = 0;

  const precioContado = dataLote.Contado || 0;

  // Ahorro (definición A): contra el plan más largo disponible
  let precioPlanLargo = 0;
  if (dataLote.Financiamiento && typeof dataLote.Financiamiento === "object") {
    const plazos = Object.keys(dataLote.Financiamiento).map(n => parseInt(n)).filter(n => !isNaN(n));
    const plazoLargo = plazos.length ? Math.max(...plazos) : 0;
    const planLargo = dataLote.Financiamiento[plazoLargo];
    if (planLargo && typeof planLargo.precio === "number") {
      precioPlanLargo = planLargo.precio;
    }
  }

  if (formaPago === "Contado") {
    resetAnualidades();
    const enganche = precioContado;

    engancheInput.value = `${precioContado}`;
    mensualidadSpan.textContent = "$0.00";
    valorTotalSpan.textContent = `$${precioContado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    resEngancheSpan.textContent = `$${precioContado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

    const comision = calcularComision(precioContado, enganche, plazoNum);

    document.getElementById("comisionCobrar").textContent =
      `$${comision.cobrar.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

    document.getElementById("comisionAhorro").textContent =
      `$${comision.ahorro.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

    document.getElementById("comisionTotal").textContent =
      `$${comision.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    // Mostrar Ahorro en contado (vs plan más largo)
    let ahorro = precioPlanLargo - precioContado;
    if (ahorro < 0 || !isFinite(ahorro)) ahorro = 0;
    ahorroSpan.textContent = `$${ahorro.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    return;
  }

  const plan = formaPago === "Financiamiento" ? dataLote.Financiamiento?.[plazoNum] : null;
  if (!plan) return;
  const maxAnualidades = getMaxAnualidadesPorPlazo(plazoNum);
  zonaAnualidadesDiv.style.display = "block";
  usarAnualidadesSelect.disabled = maxAnualidades === 0;
  if (!maxAnualidades) usarAnualidadesSelect.value = "no";
  const usar = usarAnualidadesSelect.value === "si";
  const seleccion = anualidadesSelect.value;
  anualidadesSelect.innerHTML = '<option value="">Seleccione cantidad</option>';
  for (let i = 1; i <= maxAnualidades; i++) {
    anualidadesSelect.innerHTML += `<option value="${i}">${i}</option>`;
  }
  anualidadesSelect.value = usar && Number(seleccion) <= maxAnualidades ? seleccion : "";
  anualidadesSelect.disabled = !usar;
  cantidadAnualidadesGroup.style.display = usar ? "block" : "none";
  const numAnualidades = usar ? Number(anualidadesSelect.value) : 0;
  anualidadMontoGroup.style.display = numAnualidades > 0 ? "block" : "none";
  const precio = plan.precio;
  const resultado = limitarFinanciamiento({ precio, precioContado, minimo: plan.enganche,
    plazo: plazoNum, enganche: leerImporte(engancheInput.value),
    mensualidad: mensualidadInput.value ? leerImporte(mensualidadInput.value) : precio / plazoNum,
    cantidad: numAnualidades, monto: leerImporte(anualidadMontoInput.value), modo: modoCalculo });
  if (!resultado) {
    engancheInput.value = "";
    mensualidadInput.value = "";
    mensajeCalculo.textContent = "Este plan no permite conservar la mensualidad mínima de $2,000 con el enganche requerido. Selecciona otro plazo o Contado.";
    return;
  }
  const { enganche, monto: montoAnualidad, plan: planFinal } = resultado;
  anualidadMontoInput.value = `${montoAnualidad}`;
  if (usar && !numAnualidades) {
    mensajeCalculo.textContent = "Selecciona la cantidad de anualidades; la cotización aún no incluye anualidades.";
  } else if (numAnualidades && !montoAnualidad) {
    mensajeCalculo.textContent = resultado.maxMonto > 0
      ? "Indica el monto de las anualidades; la cotización aún no incluye anualidades."
      : "No hay saldo disponible para anualidades con este enganche y la mensualidad mínima de $2,000.";
  }
  ahorroSpan.textContent = `$${Math.max(0, precioPlanLargo - precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  engancheInput.value = `${enganche}`;
  mensualidadInput.value = `${planFinal.mensualBase}`;

  resEngancheSpan.textContent = `$${enganche.toLocaleString("es-MX",{minimumFractionDigits:2})}`;

  const base = planFinal.mensualBase;
  const leftover = planFinal.ultima;
  const pagosN = planFinal.pagosNormales;

  if (leftover === 0) {
    mensualidadSpan.innerHTML = `<span class="res-num">${pagosN}</span> pagos de <span class="res-num">$${base.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>`;
  } else {
    mensualidadSpan.innerHTML = `<span class="res-num">${pagosN}</span> pagos de <span class="res-num">$${base.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span> + 1 pago de <span class="res-num">$${leftover.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>`;
  }

  valorTotalSpan.textContent = `$${planFinal.total.toLocaleString("es-MX",{minimumFractionDigits:2})}`;

  const anualidadesResumenDiv = document.getElementById("anualidadesResumen").parentElement;

  if (numAnualidades > 0 && montoAnualidad > 0) {
    anualidadesResumenSpan.innerHTML = `<span class="res-num">${numAnualidades}</span><span class="text-verde"> de </span><span class="res-num">$${montoAnualidad.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>`;
    anualidadesResumenDiv.style.display = "block";
  } else {
    anualidadesResumenSpan.innerHTML = "";
    anualidadesResumenDiv.style.display = "none";
  }    

  const comision = calcularComision(precioContado, enganche, plazoNum);

  document.getElementById("comisionCobrar").textContent =
    `$${comision.cobrar.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  document.getElementById("comisionAhorro").textContent =
    `$${comision.ahorro.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  document.getElementById("comisionTotal").textContent =
    `$${comision.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}

/* ======================================
   5) Calculo de Comisión 
====================================== */
function getCommissionMultiplier() {
  const host = window.location.hostname.toLowerCase();
  return host.includes("cantera") ? 0.7 : 1.0;
}

function calcularComision(precioContado, enganche, plazoNum) {
  const ventaComision = precioContado * 0.05;

  const plazoMax = 45;
  const plazoBase = precioContado * 0.025;
  const plazoDescuento = (plazoBase / plazoMax) * plazoNum;
  const plazoComision = plazoBase - plazoDescuento;

  const engancheComision = enganche * 0.025;

  const comisionTotalReal = ventaComision + plazoComision + engancheComision;

  // ✅ Multiplicador (normal 1.0 / cantera 0.7)
  const multiplier = getCommissionMultiplier();
  const comisionEscalada = comisionTotalReal * multiplier;

  return ajustarComision(comisionEscalada);
}

function ajustarComision(comisionReal) {
  // ✅ Quita centavos (pesos enteros)
  comisionReal = Math.round(comisionReal);
  
  // Opción A: redondeo base a múltiplo de 500 (hacia abajo)
  const cobrar500 = Math.floor(comisionReal / 500) * 500;
  const ahorro500 = comisionReal - cobrar500;

  // Opción B: "último múltiplo de 1000 - otros 1000"
  // => cobrar en (floor(x/1000)*1000 - 1000), ahorro = (pico sobre último 1000) + 1000
  const ultimo1000 = Math.floor(comisionReal / 1000) * 1000;
  const cobrar1000MenosOtro1000 = Math.max(0, ultimo1000 - 1000);
  const ahorro1000MenosOtro1000 = comisionReal - cobrar1000MenosOtro1000; // pico + 1000

  // Regla práctica:
  // Si el ahorro "normal" queda demasiado bajo, usamos la opción del 1000-1000
  // para que el ahorro no sea "poquito" (y se sienta mejor a fin de año).
  // Ajusta este umbral si quieres (ej: 200, 300, 400).
  const UMBRAL_AHORRO_MINIMO = 300;

  let cobrarFinal = cobrar500;
  let ahorroFinal = ahorro500;

  if (ahorro500 < UMBRAL_AHORRO_MINIMO && cobrar1000MenosOtro1000 > 0) {
    cobrarFinal = cobrar1000MenosOtro1000;
    ahorroFinal = ahorro1000MenosOtro1000;
  }

  return aplicarAhorroAdicional({ cobrar: cobrarFinal, ahorro: ahorroFinal, total: comisionReal });
}

function aplicarAhorroAdicional({ cobrar, ahorro, total }) {
  if (ahorro > 0 && ahorro < 750 && cobrar >= 1000) {
    cobrar -= 1000;
    ahorro += 1000;
  }
  return {
    cobrar,
    ahorro,
    total,
  };
}

/* ======================================
   6) EVENTOS Y MANEJO DE FLECHAS
====================================== */
document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();

  // Llenado de selects
  desarrolloSelect.addEventListener("change", llenarEtapas);
  etapaSelect.addEventListener("change", manejarSeleccionEtapa);
  tamanoSelect.addEventListener("change", llenarTipos);
  tipoSelect.addEventListener("change", llenarFormasDePago);
  pagoSelect.addEventListener("change", llenarPlazos);
  plazoSelect.addEventListener("change", () => {
    resetCamposDesde("plazo");
    actualizarResultados();
  });
  usarAnualidadesSelect.addEventListener("change", () => {
    anualidadesSelect.value = "";
    anualidadMontoInput.value = "0";
    actualizarResultados();
  });

  // Modo de cálculo
  document.querySelectorAll('input[name="modoCalculo"]').forEach(radio => {
    radio.addEventListener("change", e => {
      modoCalculo = e.target.value;
      habilitarInputs();
      actualizarResultados();
    });
  });

  // Flechas manuales => Enganche => ±5000
  engancheInput.addEventListener("keydown", e => {
    if (modoCalculo !== "enganche" || engancheInput.disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let val = leerImporte(engancheInput.value) || 0;
      engancheInput.value = val + 5000;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let val = leerImporte(engancheInput.value) || 0;
      val -= 5000;
      if (val < 0) val = 0;
      engancheInput.value = val;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") actualizarResultados();
  });

  // Flechas manuales => Mensualidad => ±500
  mensualidadInput.addEventListener("keydown", e => {
    if (modoCalculo !== "mensualidad" || mensualidadInput.disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let val = leerImporte(mensualidadInput.value) || 0;
      mensualidadInput.value = val + 500;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let val = leerImporte(mensualidadInput.value) || 0;
      val -= 500;
      if (val < 0) val = 0;
      mensualidadInput.value = val;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") actualizarResultados();
  });

  // Blur => Recalcular
  engancheInput.addEventListener("blur", () => {
    if (modoCalculo === "enganche") {
      actualizarResultados();
    }
  });

  mensualidadInput.addEventListener("blur", () => {
    if (modoCalculo === "mensualidad") {
      actualizarResultados();
    }
  });

  document.getElementById("btnEngancheMas").addEventListener("click", () => {
    if (modoCalculo !== "enganche" || engancheInput.disabled) return;
    let val = leerImporte(engancheInput.value) || 0;
    engancheInput.value = val + 5000;
    actualizarResultados();
  });
  
  document.getElementById("btnEngancheMenos").addEventListener("click", () => {
    if (modoCalculo !== "enganche" || engancheInput.disabled) return;
    let val = leerImporte(engancheInput.value) || 0;
    val = Math.max(0, val - 5000);
    engancheInput.value = val;
    actualizarResultados();
  });
  
  document.getElementById("btnMensualidadMas").addEventListener("click", () => {
    if (modoCalculo !== "mensualidad" || mensualidadInput.disabled) return;
    let val = leerImporte(mensualidadInput.value) || 0;
    mensualidadInput.value = val + 500;
    actualizarResultados();
  });
  
  document.getElementById("btnMensualidadMenos").addEventListener("click", () => {
    if (modoCalculo !== "mensualidad" || mensualidadInput.disabled) return;
    let val = leerImporte(mensualidadInput.value) || 0;
    val = Math.max(0, val - 500);
    mensualidadInput.value = val;
    actualizarResultados();
  });

  anualidadesSelect.addEventListener("change", () => {
    const n = parseInt(anualidadesSelect.value);
    anualidadMontoGroup.style.display = n > 0 ? "block" : "none";
    actualizarResultados();
  });
  
  btnAnualidadMas.addEventListener("click", () => {
    const plazoNum = parseInt(plazoSelect.value) || 0;
    const montoMax = getMontoMaxPorAnualidad(plazoNum);

    let val = leerImporte(anualidadMontoInput.value) || 0;
    val = val + 1000;

    if (val > montoMax) val = montoMax;

    anualidadMontoInput.value = val;
    actualizarResultados();
  });

  
  btnAnualidadMenos.addEventListener("click", () => {
    let val = leerImporte(anualidadMontoInput.value) || 0;
    val = Math.max(0, val - 1000);
    anualidadMontoInput.value = val;
    actualizarResultados();
  });
  
  anualidadMontoInput.addEventListener("blur", actualizarResultados);  

  let tapCount = 0;
  let tapTimer;

  const logo = document.getElementById("logo");
  logo.addEventListener("click", () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => tapCount = 0, 500);

    if (tapCount === 3) {
      tapCount = 0;
      const comisionBox = document.getElementById("comisionContainer");
      comisionBox.style.display = comisionBox.style.display === "none" ? "block" : "none";
    }
  });

});


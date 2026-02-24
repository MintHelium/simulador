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

let anualidadMontoEditadoPorUsuario = false;
let plazoAnualidadPrevio = null;

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
  // Limpiar inputs y spans
  engancheInput.value = "";
  mensualidadInput.value = "";
  resEngancheSpan.textContent = "$0.00";
  mensualidadSpan.textContent = "$0.00";
  valorTotalSpan.textContent = "$0.00";
  ahorroSpan.textContent = "$0.00";

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
  resetCamposDesde("pago");
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
  resetCamposDesde("plazo");
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
  } else {
    plazoSelect.innerHTML = "<option value=''>N/A</option>";
    plazoSelect.disabled = true;
    // Contado
    actualizarResultados();
  }
  habilitarInputs();

  zonaAnualidadesDiv.style.display = formaPago === "Financiamiento" ? "block" : "none";
  anualidadesSelect.innerHTML = "<option value='0'>0</option>";
  anualidadesSelect.disabled = true;
  anualidadMontoGroup.style.display = "none";

  if (formaPago === "Financiamiento") {
    const plazoKeys = Object.keys(dataTipo.Financiamiento);
    plazoSelect.innerHTML = "<option value=''>Seleccione un plazo</option>";
    plazoKeys.forEach(p => {
      plazoSelect.innerHTML += `<option value="${p}">${p} meses</option>`;
    });
    plazoSelect.disabled = false;
  } 
}

/* ==================================
   3) HABILITACIÓN DE INPUTS
================================== */
function habilitarInputs() {
  const formaPago = pagoSelect.value;
  engancheInput.disabled = true;
  mensualidadInput.disabled = true;

  if (formaPago === "Financiamiento") {
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
  const financiado = precio - enganche;

  if (financiado <= 0 || plazo < 1) {
    return {
      mensualBase: 0,
      ultima: 0,
      pagosNormales: 0,
      total: precio
    };
  }

  // 💡 Si se divide exacto entre el plazo, no hay sobrante
  if (financiado % plazo === 0) {
    const mensualBase = financiado / plazo;
    return {
      mensualBase,
      ultima: 0,
      pagosNormales: plazo,
      total: precio
    };
  }

  // ✅ Nuevo redondeo hacia el siguiente múltiplo de $50
  let mensualBase = Math.ceil(financiado / plazo / 50) * 50;

  // 🔒 Protección mínima
  if (mensualBase < 50) mensualBase = 50;

  const pagosNormales = plazo - 1;
  let totalPagado = mensualBase * pagosNormales;
  let leftover = financiado - totalPagado;

  // ⚠️ Protección: si leftover > mensualidad, todos iguales
  if (leftover > mensualBase) {
    mensualBase = Math.round(financiado / plazo / 50) * 50;
    return {
      mensualBase,
      ultima: 0,
      pagosNormales: plazo,
      total: precio
    };
  }

  return {
    mensualBase,
    ultima: leftover,
    pagosNormales,
    total: precio
  };
}

function actualizarResultados() {
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

  // ✅ Financiamiento
  let maxAnualidades = getMaxAnualidadesPorPlazo(plazoNum);

  const selectedAnualidad = anualidadesSelect.value;

  anualidadesSelect.innerHTML = "";
  for (let i = 0; i <= maxAnualidades; i++) {
    anualidadesSelect.innerHTML += `<option value="${i}">${i}</option>`;
  }
  anualidadesSelect.disabled = false;

  // Si la opción seleccionada sigue siendo válida, la volvemos a aplicar
  if (parseInt(selectedAnualidad) <= maxAnualidades) {
    anualidadesSelect.value = selectedAnualidad;
  } else {
    anualidadesSelect.value = "0"; // Reiniciamos a 0 si ya no aplica
  }

  // Nuevo tope dinámico por anualidad según plazo (mantiene pool ~160k)
  const montoMaxPorAnualidad = getMontoMaxPorAnualidad(plazoNum);

  // Detectar cambio de plazo para decidir si auto-maximizamos o respetamos input
  const esPrimeraVezPlazo = (plazoAnualidadPrevio === null);
  const plazoCambio = (!esPrimeraVezPlazo && plazoAnualidadPrevio !== plazoNum);

  let montoActual = parseFloat(anualidadMontoInput.value);
  if (!isFinite(montoActual) || montoActual < 0) montoActual = 0;

  if (esPrimeraVezPlazo) {
    // Solo inicializamos el "previo" sin tocar el flag ni el monto del usuario
    plazoAnualidadPrevio = plazoNum;

    // Si no hay monto (0 / vacío), sugerimos el máximo del plazo actual
    if (!anualidadMontoEditadoPorUsuario && montoActual <= 0) {
      montoActual = montoMaxPorAnualidad;
    } else if (montoActual > montoMaxPorAnualidad) {
      montoActual = montoMaxPorAnualidad;
    }
  } else if (plazoCambio) {
    if (!anualidadMontoEditadoPorUsuario) {
      // Si el usuario no lo tocó, default al máximo del plazo
      montoActual = montoMaxPorAnualidad;

      // Como fue automático, seguimos considerando "no editado"
      anualidadMontoEditadoPorUsuario = false;
    } else {
      // Si el usuario sí lo tocó, respetar y solo clamping al máximo nuevo
      if (montoActual > montoMaxPorAnualidad) montoActual = montoMaxPorAnualidad;

      // IMPORTANTE: NO apagar el flag aquí para respetar cambios subsecuentes
    }

    // Registrar el plazo actual
    plazoAnualidadPrevio = plazoNum;
  } else {
    // Mismo plazo: solo clamp por seguridad
    if (montoActual > montoMaxPorAnualidad) montoActual = montoMaxPorAnualidad;
  }

  // Redondeo a múltiplos de 1000 para mantener tu UX de +1000/-1000
  montoActual = Math.round(montoActual / 1000) * 1000;

  anualidadMontoInput.value = `${montoActual}`;
   
  const plan = dataLote.Financiamiento[plazoNum];
  const numAnualidades = parseInt(anualidadesSelect.value) || 0;
  const montoAnualidad = parseFloat(anualidadMontoInput.value) || 0;
  const totalAnualidades = numAnualidades * montoAnualidad;
  if (!plan) return;

  const precio = plan.precio;
  // Mostrar Ahorro en financiamiento (vs plan más largo)
  let ahorro = precioPlanLargo - precio;
  if (ahorro < 0 || !isFinite(ahorro)) ahorro = 0;
  ahorroSpan.textContent = `$${ahorro.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const engancheMin = plan.enganche;

  let enganche = parseFloat(engancheInput.value) || 0;
  let mensualUser = parseFloat(mensualidadInput.value) || 0;

  // Clamp enganche
  if (enganche < engancheMin) enganche = engancheMin;
  if (enganche > precioContado) enganche = precioContado;

  if (modoCalculo === "mensualidad") {
    enganche = precio - totalAnualidades - (mensualUser * plazoNum);
    if (enganche < engancheMin) enganche = engancheMin;
    if (enganche > precioContado) enganche = precioContado;
  }
  
  const planFinal = calcularPlanMensualidades(precio, enganche + totalAnualidades, plazoNum);
  
  engancheInput.value = `${enganche}`;
  mensualidadInput.value = `${planFinal.mensualBase}`;

  resEngancheSpan.textContent = `$${enganche.toLocaleString("es-MX",{minimumFractionDigits:2})}`;

  const base = planFinal.mensualBase;
  const leftover = planFinal.ultima;
  const pagosN = planFinal.pagosNormales;

  if (pagosN < 1) {
    mensualidadSpan.innerHTML = `<span class="res-num">$${(precio - enganche).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>`;
  } else if (Math.round(leftover) === 0 || Math.round(leftover) === Math.round(base)) {
    mensualidadSpan.innerHTML =
      `<span class="res-num">${plazoNum}</span> <span class="text-verde">pagos de</span> <span class="res-num">$${base.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>`;
  } else if (leftover > base) {
    const uniforme = Math.round(precio / plazoNum);
    mensualidadSpan.innerHTML =
      `<span class="res-num">${plazoNum}</span> <span class="text-verde">pagos de</span> <span class="res-num">$${uniforme.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>`;
  } else {
    mensualidadSpan.innerHTML =
      `<span class="res-num">${pagosN}</span> <span class="text-verde">pagos de</span> <span class="res-num">$${base.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>` +
      `<span class="text-verde"> + </span><span class="res-num">1</span> <span class="text-verde">pago de</span> <span class="res-num">$${leftover.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>`;
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

  return {
    cobrar: cobrarFinal,
    ahorro: ahorroFinal,
    total: comisionReal,
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
  plazoSelect.addEventListener("change", actualizarResultados);

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
    if (modoCalculo !== "enganche") return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let val = parseFloat(engancheInput.value) || 0;
      engancheInput.value = val + 5000;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let val = parseFloat(engancheInput.value) || 0;
      val -= 5000;
      if (val < 0) val = 0;
      engancheInput.value = val;
    }
  });

  // Flechas manuales => Mensualidad => ±500
  mensualidadInput.addEventListener("keydown", e => {
    if (modoCalculo !== "mensualidad") return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let val = parseFloat(mensualidadInput.value) || 0;
      mensualidadInput.value = val + 500;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let val = parseFloat(mensualidadInput.value) || 0;
      val -= 500;
      if (val < 0) val = 0;
      mensualidadInput.value = val;
    }
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
    if (modoCalculo !== "enganche") return;
    let val = parseFloat(engancheInput.value) || 0;
    engancheInput.value = val + 5000;
    actualizarResultados();
  });
  
  document.getElementById("btnEngancheMenos").addEventListener("click", () => {
    if (modoCalculo !== "enganche") return;
    let val = parseFloat(engancheInput.value) || 0;
    val = Math.max(0, val - 5000);
    engancheInput.value = val;
    actualizarResultados();
  });
  
  document.getElementById("btnMensualidadMas").addEventListener("click", () => {
    if (modoCalculo !== "mensualidad") return;
    let val = parseFloat(mensualidadInput.value) || 0;
    mensualidadInput.value = val + 500;
    actualizarResultados();
  });
  
  document.getElementById("btnMensualidadMenos").addEventListener("click", () => {
    if (modoCalculo !== "mensualidad") return;
    let val = parseFloat(mensualidadInput.value) || 0;
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

    let val = parseFloat(anualidadMontoInput.value) || 0;
    val = val + 1000;

    if (val > montoMax) val = montoMax;

    anualidadMontoInput.value = val;
    anualidadMontoEditadoPorUsuario = true; 
    actualizarResultados();
  });

  anualidadMontoInput.addEventListener("input", () => {
    anualidadMontoEditadoPorUsuario = true;
  });
  
  btnAnualidadMenos.addEventListener("click", () => {
    let val = parseFloat(anualidadMontoInput.value) || 0;
    val = Math.max(0, val - 1000);
    anualidadMontoInput.value = val;
    anualidadMontoEditadoPorUsuario = true; 
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


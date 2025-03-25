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

const infoEtapaDiv = document.getElementById("infoEtapa");

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

  // ✅ Contado
  if (formaPago === "Contado") {
    const precioContado = dataLote.Contado;
    engancheInput.value = `${precioContado}`;
    resEngancheSpan.textContent = `$${precioContado.toLocaleString("es-MX")}`;
    mensualidadSpan.textContent = "$0.00";
    valorTotalSpan.textContent = `$${precioContado.toLocaleString("es-MX")}`;
    return;
  }

  // ✅ Financiamiento
  const plazoNum = parseInt(plazoVal);
  if (!plazoNum) return;

  const plan = dataLote.Financiamiento[plazoNum];
  if (!plan) return;

  const precio = plan.precio;
  const engancheMin = plan.enganche;
  const precioContado = dataLote.Contado || 0;

  let enganche = parseFloat(engancheInput.value) || 0;
  let mensualUser = parseFloat(mensualidadInput.value) || 0;

  // Clamp enganche
  if (enganche < engancheMin) enganche = engancheMin;
  if (enganche > precioContado) enganche = precioContado;

  if (modoCalculo === "mensualidad") {
    enganche = precio - (mensualUser * plazoNum);
    if (enganche < engancheMin) enganche = engancheMin;
    if (enganche > precioContado) enganche = precioContado;
  }

  const planFinal = calcularPlanMensualidades(precio, enganche, plazoNum);

  engancheInput.value = `${enganche}`;
  mensualidadInput.value = `${planFinal.mensualBase}`;

  resEngancheSpan.textContent = `$${enganche.toLocaleString("es-MX",{minimumFractionDigits:2})}`;

  const base = planFinal.mensualBase;
  const leftover = planFinal.ultima;
  const pagosN = planFinal.pagosNormales;

  if (pagosN < 1) {
    mensualidadSpan.textContent = `$${(precio - enganche).toLocaleString("es-MX",{minimumFractionDigits:2})}`;
  } else if (Math.round(leftover) === 0) {
    mensualidadSpan.textContent = `$${base.toLocaleString("es-MX",{minimumFractionDigits:2})}`;
  } else if (Math.round(leftover) === Math.round(base)) {
    mensualidadSpan.textContent = `${plazoNum} pagos de $${base.toLocaleString("es-MX",{minimumFractionDigits:2})}`;
  } else {
    if (leftover > base) {
      const uniforme = Math.round(precio / plazoNum);
      mensualidadSpan.textContent = `${plazoNum} pagos de $${uniforme.toLocaleString("es-MX",{minimumFractionDigits:2})}`;
    } else {
      mensualidadSpan.textContent =
        `${pagosN} pagos de $${base.toLocaleString("es-MX",{minimumFractionDigits:2})}` +
        ` + 1 pago de $${leftover.toLocaleString("es-MX",{minimumFractionDigits:2})}`;
    }
  }

  valorTotalSpan.textContent = `$${planFinal.total.toLocaleString("es-MX",{minimumFractionDigits:2})}`;
}

/* ======================================
   5) EVENTOS Y MANEJO DE FLECHAS
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
  
});

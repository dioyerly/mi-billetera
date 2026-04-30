// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC_06OOZ1yMoBG9VtrLJ4_ruTqO3FRBLtI",
  authDomain: "mibilletera-611ad.firebaseapp.com",
  projectId: "mibilletera-611ad",
  storageBucket: "mibilletera-611ad.appspot.com",
  messagingSenderId: "971416630264",
  appId: "1:971416630264:web:748715dcfae0195a615c0d"
};

// Inicializamos Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- VARIABLES DE LA APP ---
let datosMensuales = {}; 
let mesActual = ""; 

const categoriasBase = [
    { id: 'ALQUILER', nombre: 'Alquiler', icono: '🏠', tieneVencimiento: true },
    { id: 'EXPENSAS', nombre: 'Expensas', icono: '🏢', tieneVencimiento: true },
    { id: 'AYSA', nombre: 'AySA', icono: '💧', tieneVencimiento: true },
    { id: 'EDESUR', nombre: 'Edesur', icono: '⚡', tieneVencimiento: true },
    { id: 'METROGAS', nombre: 'Metrogas', icono: '🔥', tieneVencimiento: true }, // <--- LA NUEVA TARJETA
    { id: 'ABL', nombre: 'ABL', icono: '📜', tieneVencimiento: true },
    { id: 'TARJETA', nombre: 'Tarjeta', icono: '💳', tieneVencimiento: true },
    { id: 'GOCUOTAS', nombre: 'GoCuotas', icono: '🛍️' },
    { id: 'PRESTAMOS', nombre: 'Préstamos', icono: '💰' },
    { id: 'DEUDA', nombre: 'Deuda', icono: '👤' },
    { id: 'INTERNET', nombre: 'Internet', icono: '🌐' },
    { id: 'TELEFONO', nombre: 'Teléfono', icono: '📱' },
    { id: 'TRANSPORTE', nombre: 'Transporte', icono: '🚌' },
    { id: 'PREPAGA', nombre: 'Prepaga', icono: '🏥' },
    { id: 'COMIDA', nombre: 'Comida', icono: '🍕' },
    { id: 'EXTRAS', nombre: 'Extras', icono: '✨' }
];

window.onload = () => {
    const hoy = new Date();
    mesActual = hoy.toISOString().substring(0, 7); 
    document.getElementById('mes-activo').value = mesActual;

    db.collection("usuarios").doc("mi_unica_cuenta").onSnapshot((doc) => {
        if (doc.exists) {
            datosMensuales = doc.data();
        }
        inicializarMes(mesActual);
        actualizarUI();
    }, (error) => {
        console.log("Error cargando datos:", error);
    });
};

function inicializarMes(mes) {
    if (!datosMensuales[mes]) {
        datosMensuales[mes] = {
            ingreso: 0,
            gastos: categoriasBase.map(c => ({ ...c, monto: 0, fecha: '', pagado: false }))
        };
        guardarEnNube();
    }
}

async function guardarEnNube() {
    try {
        await db.collection("usuarios").doc("mi_unica_cuenta").set(datosMensuales);
    } catch (e) {
        console.error("Error al guardar:", e);
    }
}

function cambiarMes() {
    mesActual = document.getElementById('mes-activo').value;
    inicializarMes(mesActual);
    actualizarUI();
}

function obtenerDeudaAtrasada(idCategoria, mesFiltro) {
    let deudaTotal = 0;
    const mesesGuardados = Object.keys(datosMensuales).sort();
    mesesGuardados.forEach(mes => {
        if (mes < mesFiltro) {
            const gasto = datosMensuales[mes].gastos.find(g => g.id === idCategoria);
            if (gasto && gasto.pagado === false && gasto.monto > 0) {
                deudaTotal += gasto.monto;
            }
        }
    });
    return deudaTotal;
}

function actualizarUI() {
    const data = datosMensuales[mesActual];
    if (!data) return;

    let totalPendienteEsteMes = data.gastos.reduce((acc, g) => acc + (!g.pagado ? g.monto : 0), 0);
    let totalDeudaPasada = 0;
    categoriasBase.forEach(c => {
        totalDeudaPasada += obtenerDeudaAtrasada(c.id, mesActual);
    });

    let saldoDispo = data.ingreso - (totalPendienteEsteMes + totalDeudaPasada);

    document.getElementById('saldo-total').innerText = `$${saldoDispo.toLocaleString('es-AR')}`;
    const inicialTxt = document.getElementById('ingreso-inicial-texto');
    if(inicialTxt) inicialTxt.innerText = `Ingreso Inicial: $${data.ingreso.toLocaleString('es-AR')}`;
    
    renderizarCards();
}

function renderizarCards() {
    const contenedor = document.getElementById('contenedor-cards');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    
    datosMensuales[mesActual].gastos.forEach(cat => {
        const deudaVieja = obtenerDeudaAtrasada(cat.id, mesActual);
        const div = document.createElement('div');
        div.className = `card-gasto ${cat.pagado ? 'pagado' : ''}`;
        
        if (deudaVieja > 0 && !cat.pagado) {
            div.style.border = "2px solid #ff8fab";
        } else {
            div.style.border = "1px solid #eee";
        }

        div.onclick = () => abrirModalGasto(cat.id);
        const montoMostrar = cat.monto + deudaVieja;
        
        div.innerHTML = `
            <span class="icon">${cat.icono}</span>
            <span class="name">${cat.nombre}</span>
            <span class="amount">$${montoMostrar.toLocaleString('es-AR')}</span>
            ${cat.nota ? `<div style="font-size:0.7rem; color:#888; font-style:italic;">"${cat.nota}"</div>` : ''}
            <div class="date">
                ${cat.pagado ? '✅ PAGADO' : (cat.fecha ? 'Vence: ' + cat.fecha : '')}
                ${deudaVieja > 0 && !cat.pagado ? `<br><small style="color:#d63384; font-weight:bold;">Deuda anterior: $${deudaVieja.toLocaleString('es-AR')}</small>` : ''}
            </div>
        `;
        contenedor.appendChild(div);
    });
}

let catSeleccionadaId = null;

function abrirModalGasto(id) {
    catSeleccionadaId = id;
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === id);
    
    document.getElementById('titulo-gasto-fijo').innerText = cat.nombre;
    document.getElementById('monto-fijo').value = cat.monto || '';
    
    // Si es EXTRAS, mostramos un prompt o habilitamos un campo de texto (usaremos el campo nota)
    if (id === 'EXTRAS') {
        const notaActual = cat.nota || "";
        const nuevaNota = prompt("¿En qué gastaste este extra?", notaActual);
        if (nuevaNota !== null) cat.nota = nuevaNota;
    }

    const btnPagado = document.getElementById('btn-pagado');
    btnPagado.innerText = cat.pagado ? "DESMARCAR PAGO" : "MARCAR COMO PAGADO";

    const campoFecha = document.getElementById('campo-fecha');
    if (cat.tieneVencimiento) {
        campoFecha.classList.remove('hidden');
        document.getElementById('fecha-vencimiento').value = cat.fecha || '';
    } else {
        campoFecha.classList.add('hidden');
    }
    document.getElementById('modal-gasto-especifico').classList.remove('hidden');
}

function guardarGastoFijo() {
    const monto = parseFloat(document.getElementById('monto-fijo').value) || 0;
    const fecha = document.getElementById('fecha-vencimiento').value;
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === catSeleccionadaId);
    cat.monto = monto;
    cat.fecha = fecha;
    cerrarModalGasto();
    guardarEnNube();
}

function marcarComoPagado() {
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === catSeleccionadaId);
    cat.pagado = !cat.pagado;
    cerrarModalGasto();
    guardarEnNube();
}

function abrirModalSaldo() { 
    document.getElementById('modal-saldo').classList.remove('hidden'); 
    document.getElementById('nuevo-saldo-input').value = ""; 
    document.getElementById('nuevo-saldo-input').focus();
}

function guardarSaldoInicial() {
    const input = document.getElementById('nuevo-saldo-input');
    const valorIngresado = parseFloat(input.value) || 0;
    datosMensuales[mesActual].ingreso += valorIngresado;
    cerrarModalSaldo();
    guardarEnNube();
}

function cerrarModalGasto() { document.getElementById('modal-gasto-especifico').classList.add('hidden'); }
function cerrarModalSaldo() { document.getElementById('modal-saldo').classList.add('hidden'); }

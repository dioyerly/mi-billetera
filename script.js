// CONFIGURACIÓN DE FIREBASE (Copiada de tu imagen)
const firebaseConfig = {
  apiKey: "AIzaSyC_06OOZ1yMoBG9VtrLJ4_ruTqO3FRBLtI",
  authDomain: "mibilletera-611ad.firebaseapp.com",
  projectId: "mibilletera-611ad",
  storageBucket: "mibilletera-611ad.appspot.com",
  messagingSenderId: "971416630264",
  appId: "1:971416630264:web:748715dcfae0195a615c0d",
  measurementId: "G-40C2P5ZC0P"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let datosMensuales = {};
let mesActual = "";

const categoriasBase = [
    { id: 'ALQUILER', nombre: 'Alquiler', icono: '🏠', tieneVencimiento: true },
    { id: 'EXPENSAS', nombre: 'Expensas', icono: '🏢', tieneVencimiento: true },
    { id: 'AYSA', nombre: 'AySA', icono: '💧', tieneVencimiento: true },
    { id: 'EDESUR', nombre: 'Edesur', icono: '⚡', tieneVencimiento: true },
    { id: 'ABL', nombre: 'ABL', icono: '📜', tieneVencimiento: true },
    { id: 'TARJETA', nombre: 'Tarjeta', icono: '💳', tieneVencimiento: true },
    { id: 'GOCUOTAS', nombre: 'GoCuotas', icono: '🛍️' },
    { id: 'PRESTAMOS', nombre: 'Préstamos', icono: '💰' },
    { id: 'GRACIELA', nombre: 'Graciela', icono: '👤' },
    { id: 'INTERNET', nombre: 'Internet', icono: '🌐' },
    { id: 'TELEFONO', nombre: 'Teléfono', icono: '📱' },
    { id: 'TRANSPORTE', nombre: 'Transporte', icono: '🚌' },
    { id: 'PREPAGA', nombre: 'Prepaga', icono: '🏥' },
    { id: 'COMIDA', nombre: 'Comida', icono: '🍕' },
    { id: 'EXTRAS', nombre: 'Extras', icono: '✨' }
];

window.onload = async () => {
    const hoy = new Date();
    mesActual = hoy.toISOString().substring(0, 7);
    document.getElementById('mes-activo').value = mesActual;
    
    // Escuchar cambios en tiempo real desde Firebase
    db.collection("meses").onSnapshot((querySnapshot) => {
        datosMensuales = {};
        querySnapshot.forEach((doc) => {
            datosMensuales[doc.id] = doc.data();
        });
        inicializarMes(mesActual);
        actualizarUI();
    });
};

function inicializarMes(mes) {
    if (!datosMensuales[mes]) {
        datosMensuales[mes] = {
            ingreso: 0,
            gastos: categoriasBase.map(c => ({ ...c, monto: 0, fecha: '', pagado: false }))
        };
        guardarEnFirebase(mes);
    }
}

async function guardarEnFirebase(mes) {
    await db.collection("meses").doc(mes).set(datosMensuales[mes]);
}

function cambiarMes() {
    mesActual = document.getElementById('mes-activo').value;
    inicializarMes(mesActual);
    actualizarUI();
}

function obtenerDeudaAtrasada(idCategoria, mesFiltro) {
    let deudaTotal = 0;
    const meses = Object.keys(datosMensuales).sort();
    meses.forEach(mes => {
        if (mes < mesFiltro) {
            const gasto = datosMensuales[mes].gastos.find(g => g.id === idCategoria);
            if (gasto && !gasto.pagado && gasto.monto > 0) deudaTotal += gasto.monto;
        }
    });
    return deudaTotal;
}

function actualizarUI() {
    const data = datosMensuales[mesActual];
    if (!data) return;

    let totalPendiente = data.gastos.reduce((acc, g) => acc + (!g.pagado ? g.monto : 0), 0);
    let totalDeudaPasada = 0;
    categoriasBase.forEach(c => totalDeudaPasada += obtenerDeudaAtrasada(c.id, mesActual));

    let saldoDispo = data.ingreso - (totalPendiente + totalDeudaPasada);
    document.getElementById('saldo-total').innerText = `$${saldoDispo.toLocaleString('es-AR')}`;
    document.getElementById('ingreso-inicial-texto').innerText = `Ingreso Inicial: $${data.ingreso.toLocaleString('es-AR')}`;
    renderizarCards();
}

function renderizarCards() {
    const contenedor = document.getElementById('contenedor-cards');
    contenedor.innerHTML = '';
    datosMensuales[mesActual].gastos.forEach(cat => {
        const deudaVieja = obtenerDeudaAtrasada(cat.id, mesActual);
        const div = document.createElement('div');
        div.className = `card-gasto ${cat.pagado ? 'pagado' : ''}`;
        if (deudaVieja > 0 && !cat.pagado) div.style.border = "2px solid #ff8fab";
        
        div.onclick = () => abrirModalGasto(cat.id);
        div.innerHTML = `
            <span class="icon">${cat.icono}</span>
            <span class="name">${cat.nombre}</span>
            <span class="amount">$${(cat.monto + deudaVieja).toLocaleString('es-AR')}</span>
            <div class="date">
                ${cat.pagado ? '✅ PAGADO' : (cat.fecha ? 'Vence: ' + cat.fecha : '')}
                ${deudaVieja > 0 && !cat.pagado ? `<br><small style="color:#d63384">Deuda anterior: $${deudaVieja.toLocaleString()}</small>` : ''}
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
    document.getElementById('btn-pagado').innerText = cat.pagado ? "DESMARCAR PAGO" : "MARCAR COMO PAGADO";
    const campoFecha = document.getElementById('campo-fecha');
    if (cat.tieneVencimiento) {
        campoFecha.classList.remove('hidden');
        document.getElementById('fecha-vencimiento').value = cat.fecha || '';
    } else { campoFecha.classList.add('hidden'); }
    document.getElementById('modal-gasto-especifico').classList.remove('hidden');
}

function guardarGastoFijo() {
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === catSeleccionadaId);
    cat.monto = parseFloat(document.getElementById('monto-fijo').value) || 0;
    cat.fecha = document.getElementById('fecha-vencimiento').value;
    guardarEnFirebase(mesActual);
    cerrarModalGasto();
}

function marcarComoPagado() {
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === catSeleccionadaId);
    cat.pagado = !cat.pagado;
    guardarEnFirebase(mesActual);
    cerrarModalGasto();
}

function abrirModalSaldo() { document.getElementById('modal-saldo').classList.remove('hidden'); }
function guardarSaldoInicial() {
    const valor = parseFloat(document.getElementById('nuevo-saldo-input').value) || 0;
    datosMensuales[mesActual].ingreso += valor;
    guardarEnFirebase(mesActual);
    cerrarModalSaldo();
}
function cerrarModalGasto() { document.getElementById('modal-gasto-especifico').classList.add('hidden'); }
function cerrarModalSaldo() { document.getElementById('modal-saldo').classList.add('hidden'); }

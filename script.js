const firebaseConfig = {
  apiKey: "AIzaSyC_06OOZ1yMoBG9VtrLJ4_ruTqO3FRBLtI",
  authDomain: "mibilletera-611ad.firebaseapp.com",
  projectId: "mibilletera-611ad",
  storageBucket: "mibilletera-611ad.appspot.com",
  messagingSenderId: "971416630264",
  appId: "1:971416630264:web:748715dcfae0195a615c0d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let datosMensuales = {}; 
let mesActual = ""; 

const categoriasBase = [
    { id: 'ALQUILER', nombre: 'Alquiler', icono: '🏠', tieneVencimiento: true },
    { id: 'EXPENSAS', nombre: 'Expensas', icono: '🏢', tieneVencimiento: true },
    { id: 'AYSA', nombre: 'AySA', icono: '💧', tieneVencimiento: true },
    { id: 'EDESUR', nombre: 'Edesur', icono: '⚡', tieneVencimiento: true },
    { id: 'METROGAS', nombre: 'Metrogas', icono: '🔥', tieneVencimiento: true },
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
        if (doc.exists) { datosMensuales = doc.data(); }
        inicializarMes(mesActual);
        actualizarUI();
    });
};

function inicializarMes(mes) {
    if (!datosMensuales[mes]) {
        datosMensuales[mes] = {
            ingreso: 0,
            gastos: categoriasBase.map(c => ({ ...c, monto: 0, fecha: '', pagado: false, nota: '' }))
        };
        guardarEnNube();
    }
}

async function guardarEnNube() { await db.collection("usuarios").doc("mi_unica_cuenta").set(datosMensuales); }

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
    let pendiente = data.gastos.reduce((acc, g) => acc + (!g.pagado ? g.monto : 0), 0);
    let deudaPasada = 0;
    categoriasBase.forEach(c => deudaPasada += obtenerDeudaAtrasada(c.id, mesActual));
    let disponible = data.ingreso - (pendiente + deudaPasada);

    document.getElementById('saldo-total').innerText = `$${disponible.toLocaleString('es-AR')}`;
    document.getElementById('ingreso-inicial-texto').innerText = `Ingreso Inicial: $${data.ingreso.toLocaleString('es-AR')}`;
    renderizarCards();
}

function renderizarCards() {
    const contenedor = document.getElementById('contenedor-cards');
    contenedor.innerHTML = '';
    datosMensuales[mesActual].gastos.forEach(cat => {
        const deuda = obtenerDeudaAtrasada(cat.id, mesActual);
        const div = document.createElement('div');
        div.className = `card-gasto ${cat.pagado ? 'pagado' : ''}`;
        if (deuda > 0 && !cat.pagado) div.style.border = "2px solid #ff8fab";
        div.onclick = () => abrirModalGasto(cat.id);
        div.innerHTML = `
            <span class="icon">${cat.icono}</span>
            <span class="name">${cat.nombre}</span>
            <span class="amount">$${(cat.monto + deuda).toLocaleString('es-AR')}</span>
            ${cat.nota ? `<div style="font-size:0.7rem; color:#888;">"${cat.nota}"</div>` : ''}
            <div class="date">${cat.pagado ? '✅ PAGADO' : (cat.fecha ? 'Vence: ' + cat.fecha : '')}</div>
        `;
        contenedor.appendChild(div);
    });
}

let catSeleccionadaId = null;
function abrirModalGasto(id) {
    catSeleccionadaId = id;
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === id);
    if (id === 'EXTRAS') {
        const n = prompt("¿Qué gasto extra es?", cat.nota || "");
        if (n !== null) { cat.nota = n; actualizarUI(); }
    }
    document.getElementById('titulo-gasto-fijo').innerText = cat.nombre;
    document.getElementById('monto-fijo').value = cat.monto || '';
    document.getElementById('btn-pagado').innerText = cat.pagado ? "DESMARCAR PAGO" : "MARCAR COMO PAGADO";
    const f = document.getElementById('campo-fecha');
    if (cat.tieneVencimiento) { f.classList.remove('hidden'); document.getElementById('fecha-vencimiento').value = cat.fecha || ''; }
    else { f.classList.add('hidden'); }
    document.getElementById('modal-gasto-especifico').classList.remove('hidden');
}

function guardarGastoFijo() {
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === catSeleccionadaId);
    cat.monto = parseFloat(document.getElementById('monto-fijo').value) || 0;
    cat.fecha = document.getElementById('fecha-vencimiento').value;
    cerrarModalGasto();
    actualizarUI();
    guardarEnNube();
}

function marcarComoPagado() {
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === catSeleccionadaId);
    cat.pagado = !cat.pagado;
    cerrarModalGasto();
    actualizarUI();
    guardarEnNube();
}

function abrirModalSaldo() { document.getElementById('modal-saldo').classList.remove('hidden'); }
function guardarSaldoInicial() {
    datosMensuales[mesActual].ingreso += parseFloat(document.getElementById('nuevo-saldo-input').value) || 0;
    cerrarModalSaldo();
    actualizarUI();
    guardarEnNube();
}
function cerrarModalGasto() { document.getElementById('modal-gasto-especifico').classList.add('hidden'); }
function cerrarModalSaldo() { document.getElementById('modal-saldo').classList.add('hidden'); }

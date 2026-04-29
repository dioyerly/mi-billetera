// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC_06OOZ1yMoBG9VtrLJ4_ruTqO3FRBLtI",
  authDomain: "mibilletera-611ad.firebaseapp.com",
  projectId: "mibilletera-611ad",
  storageBucket: "mibilletera-611ad.appspot.com",
  messagingSenderId: "971416630264",
  appId: "1:971416630264:web:748715dcfae0195a615c0d"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let saldoTotal = 0;
let movimientos = [];

const categoriasBase = [
    { id: 'ALQUILER', nombre: 'Alquiler', icono: '🏠' },
    { id: 'EXPENSAS', nombre: 'Expensas', icono: '🏢' },
    { id: 'AYSA', nombre: 'AySA', icono: '💧' },
    { id: 'EDESUR', nombre: 'Edesur', icono: '⚡' },
    { id: 'ABL', nombre: 'ABL', icono: '📜' },
    { id: 'TARJETA', nombre: 'Tarjeta', icono: '💳' },
    { id: 'GOCUOTAS', nombre: 'GoCuotas', icono: '🛍️' },
    { id: 'PRESTAMOS', nombre: 'Préstamo', icono: '💰' },
    { id: 'GRACIELA', nombre: 'Deuda Graciela', icono: '👤' },
    { id: 'INTERNET', nombre: 'Internet', icono: '🌐' },
    { id: 'TELEFONO', nombre: 'Teléfono', icono: '📱' },
    { id: 'TRANSPORTE', nombre: 'Transporte', icono: '🚌' },
    { id: 'PREPAGA', nombre: 'Prepaga', icono: '🏥' },
    { id: 'COMIDA', nombre: 'Comida', icono: '🍕' },
    { id: 'EXTRAS', nombre: 'Extras', icono: '✨' }
];

// Cargar datos en tiempo real desde la nube
db.collection("billetera").doc("datos").onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        saldoTotal = data.saldo || 0;
        movimientos = data.movimientos || [];
        actualizarUI();
    } else {
        // Si es la primera vez, crea el documento en la nube
        db.collection("billetera").doc("datos").set({ saldo: 0, movimientos: [] });
    }
});

function actualizarUI() {
    // 1. Actualizar Saldo
    document.getElementById('saldo-total').innerText = `$${saldoTotal.toLocaleString('es-AR')}`;

    // 2. Dibujar Botones de Acceso Rápido (LO QUE FALTABA)
    const gridBotones = document.getElementById('grid-botones');
    if (gridBotones) {
        gridBotones.innerHTML = '';
        categoriasBase.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'btn-acceso';
            btn.innerHTML = `<span>${cat.icono}</span> ${cat.nombre}`;
            btn.onclick = () => mostrarModalGastoRapido(cat.nombre);
            gridBotones.appendChild(btn);
        });
    }

    // 3. Dibujar Lista de Movimientos
    const lista = document.getElementById('lista-movimientos');
    if (lista) {
        lista.innerHTML = '';
        movimientos.slice().reverse().forEach((mov, index) => {
            const realIndex = movimientos.length - 1 - index;
            const div = document.createElement('div');
            div.className = 'movimiento-item';
            div.innerHTML = `
                <div class="mov-info">
                    <strong>${mov.concepto}</strong><br>
                    <small>${mov.fecha}</small>
                </div>
                <div class="mov-monto">
                    -$${mov.monto.toLocaleString('es-AR')}
                    <button onclick="eliminarMovimiento(${realIndex})" class="btn-del">✕</button>
                </div>
            `;
            lista.appendChild(div);
        });
    }
}

// FUNCIONES DE ACCIÓN
async function mostrarModalGastoRapido(nombreGasto) {
    const monto = prompt(`¿Cuánto pagaste de ${nombreGasto}?`);
    const valor = parseFloat(monto);
    
    if (!isNaN(valor) && valor > 0) {
        const nuevoMov = {
            concepto: nombreGasto.toUpperCase(),
            monto: valor,
            fecha: new Date().toLocaleDateString('es-AR')
        };
        
        saldoTotal -= valor;
        movimientos.push(nuevoMov);
        
        await db.collection("billetera").doc("datos").update({
            saldo: saldoTotal,
            movimientos: movimientos
        });
    }
}

async function guardarSaldoInicial() {
    const input = document.getElementById('nuevo-saldo-input');
    const valor = parseFloat(input.value) || 0;
    
    saldoTotal += valor;
    await db.collection("billetera").doc("datos").update({ saldo: saldoTotal });
    
    cerrarModalSaldo();
    input.value = '';
}

async function eliminarMovimiento(index) {
    const borrado = movimientos.splice(index, 1)[0];
    saldoTotal += borrado.monto; // Devuelve el dinero al saldo
    
    await db.collection("billetera").doc("datos").update({
        saldo: saldoTotal,
        movimientos: movimientos
    });
}

// MODALES
function abrirModalSaldo() { document.getElementById('modal-saldo').classList.remove('hidden'); }
function cerrarModalSaldo() { document.getElementById('modal-saldo').classList.add('hidden'); }

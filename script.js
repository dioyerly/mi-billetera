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

let saldoTotal = 0;
let movimientos = [];

// Cargar datos en tiempo real
db.collection("billetera").doc("datos").onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        saldoTotal = data.saldo || 0;
        movimientos = data.movimientos || [];
        actualizarUI();
    } else {
        // Inicializar si la base de datos está vacía
        db.collection("billetera").doc("datos").set({ saldo: 0, movimientos: [] });
    }
});

function actualizarUI() {
    document.getElementById('saldo-total').innerText = `$${saldoTotal.toLocaleString('es-AR')}`;
    const lista = document.getElementById('lista-movimientos');
    lista.innerHTML = '';

    // Mostrar los últimos movimientos (como en tu foto)
    movimientos.slice().reverse().forEach((mov, index) => {
        const div = document.createElement('div');
        div.className = 'movimiento-item';
        div.innerHTML = `
            <div class="mov-info">
                <strong>${mov.concepto}</strong><br>
                <small>${mov.fecha}</small>
            </div>
            <div class="mov-monto">
                -$${mov.monto.toLocaleString('es-AR')} 
                <button onclick="eliminarMovimiento(${movimientos.length - 1 - index})" class="btn-del">✕</button>
            </div>
        `;
        lista.appendChild(div);
    });
}

function abrirModalSaldo() { document.getElementById('modal-saldo').classList.remove('hidden'); }
function cerrarModalSaldo() { document.getElementById('modal-saldo').classList.add('hidden'); }

async function guardarSaldoInicial() {
    const monto = parseFloat(document.getElementById('nuevo-saldo-input').value) || 0;
    saldoTotal += monto;
    await db.collection("billetera").doc("datos").update({ saldo: saldoTotal });
    cerrarModalSaldo();
}

async function eliminarMovimiento(index) {
    const movEliminado = movimientos.splice(index, 1)[0];
    saldoTotal += movEliminado.monto; // Devolvemos el dinero
    await db.collection("billetera").doc("datos").update({
        saldo: saldoTotal,
        movimientos: movimientos
    });
}

let datosMensuales = JSON.parse(localStorage.getItem('datosMensuales')) || {};
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

window.onload = () => {
    const hoy = new Date();
    mesActual = hoy.toISOString().substring(0, 7); 
    document.getElementById('mes-activo').value = mesActual;
    inicializarMes(mesActual);
    actualizarUI();
};

function inicializarMes(mes) {
    if (!datosMensuales[mes]) {
        datosMensuales[mes] = {
            ingreso: 0,
            gastos: categoriasBase.map(c => ({ ...c, monto: 0, fecha: '', pagado: false }))
        };
    }
}

function cambiarMes() {
    mesActual = document.getElementById('mes-activo').value;
    inicializarMes(mesActual);
    actualizarUI();
}

// --- ESTA ES LA FUNCIÓN QUE CORREGIMOS ---
function obtenerDeudaAtrasada(idCategoria, mesFiltro) {
    let deudaTotal = 0;
    
    // Obtenemos todos los meses y los ordenamos para comparar correctamente
    const mesesGuardados = Object.keys(datosMensuales).sort();

    mesesGuardados.forEach(mes => {
        // Solo sumamos deudas de meses CRONOLÓGICAMENTE anteriores al seleccionado
        if (mes < mesFiltro) {
            const gasto = datosMensuales[mes].gastos.find(g => g.id === idCategoria);
            // IMPORTANTE: Solo suma si NO está pagado y el monto es mayor a 0
            if (gasto && gasto.pagado === false && gasto.monto > 0) {
                deudaTotal += gasto.monto;
            }
        }
    });
    return deudaTotal;
}

function actualizarUI() {
    const data = datosMensuales[mesActual];
    
    // Sumamos gastos pendientes de este mes
    let totalPendienteEsteMes = data.gastos.reduce((acc, g) => acc + (!g.pagado ? g.monto : 0), 0);
    
    // Sumamos deudas reales de meses anteriores
    let totalDeudaPasada = 0;
    categoriasBase.forEach(c => {
        totalDeudaPasada += obtenerDeudaAtrasada(c.id, mesActual);
    });

    let saldoDispo = data.ingreso - (totalPendienteEsteMes + totalDeudaPasada);

    document.getElementById('saldo-total').innerText = `$${saldoDispo.toLocaleString('es-AR')}`;
    document.getElementById('ingreso-inicial-texto').innerText = `Ingreso Inicial: $${data.ingreso.toLocaleString('es-AR')}`;
    
    localStorage.setItem('datosMensuales', JSON.stringify(datosMensuales));
    renderizarCards();
}

function renderizarCards() {
    const contenedor = document.getElementById('contenedor-cards');
    contenedor.innerHTML = '';
    
    datosMensuales[mesActual].gastos.forEach(cat => {
        const deudaVieja = obtenerDeudaAtrasada(cat.id, mesActual);
        const div = document.createElement('div');
        
        // La tarjeta se ve pagada solo si el gasto de ESTE mes está pagado
        div.className = `card-gasto ${cat.pagado ? 'pagado' : ''}`;
        
        // Si hay deuda vieja, el borde se pone rojo, pero solo si no hemos pagado lo de este mes
        if (deudaVieja > 0 && !cat.pagado) {
            div.style.border = "2px solid #ff8fab";
        } else {
            div.style.border = "1px solid #eee";
        }

        div.onclick = () => abrirModalGasto(cat.id);
        
        // El monto mostrado es: Monto del mes + Deuda vieja
        const montoMostrar = cat.monto + deudaVieja;
        
        div.innerHTML = `
            <span class="icon">${cat.icono}</span>
            <span class="name">${cat.nombre}</span>
            <span class="amount">$${montoMostrar.toLocaleString('es-AR')}</span>
            <div class="date">
                ${cat.pagado ? '✅ PAGADO ESTE MES' : (cat.fecha ? 'Vence: ' + cat.fecha : '')}
                ${deudaVieja > 0 ? `<br><small style="color:#d63384; font-weight:bold;">Deuda anterior: $${deudaVieja.toLocaleString('es-AR')}</small>` : ''}
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// --- MODALES ---
let catSeleccionadaId = null;

function abrirModalGasto(id) {
    catSeleccionadaId = id;
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === id);
    const deudaVieja = obtenerDeudaAtrasada(id, mesActual);
    
    document.getElementById('titulo-gasto-fijo').innerText = cat.nombre;
    document.getElementById('monto-fijo').value = cat.monto || '';
    
    // Actualizar texto del botón "Pagado" para que sea claro
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
    actualizarUI();
}

function marcarComoPagado() {
    const cat = datosMensuales[mesActual].gastos.find(g => g.id === catSeleccionadaId);
    cat.pagado = !cat.pagado;
    cerrarModalGasto();
    actualizarUI();
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
    actualizarUI();
    cerrarModalSaldo();
}

function cerrarModalGasto() { document.getElementById('modal-gasto-especifico').classList.add('hidden'); }
function cerrarModalSaldo() { document.getElementById('modal-saldo').classList.add('hidden'); }
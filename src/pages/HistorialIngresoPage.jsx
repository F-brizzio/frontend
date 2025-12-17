import { useState, useEffect, useMemo } from 'react';
import { getHistorialIngresos, actualizarIngresoItem } from '../services/ingresoService';
import { useNavigate } from 'react-router-dom';

// Utilidad para formateo de moneda profesional (CLP)
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP',
        minimumFractionDigits: 0 
    }).format(amount);
};

export default function HistorialIngresoPage() {
    const navigate = useNavigate();
    const [historialAgrupado, setHistorialAgrupado] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Modal y Edición
    const [mostrarModal, setMostrarModal] = useState(false);
    
    // Objeto seleccionado (representa la factura completa)
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null); 
    
    // Edición de items
    const [idEditando, setIdEditando] = useState(null);
    const [datosEdit, setDatosEdit] = useState({});

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const data = await getHistorialIngresos();
            agruparDatos(data);
        } catch (error) { 
            console.error(error);
            alert("Error cargando historial.");
        } finally { 
            setLoading(false); 
        }
    };

    // Lógica de Agrupación: Convierte lista plana de items en "Facturas"
    const agruparDatos = (lista) => {
        const grupos = {};
        lista.forEach(item => {
            // Clave única compuesta: NumeroDoc + RutProveedor
            const key = `${item.numeroDocumento}-${item.supplierRut}`;
            
            if (!grupos[key]) {
                grupos[key] = {
                    key: key,
                    fecha: item.fecha, // Asumimos fecha del primer item
                    numeroDocumento: item.numeroDocumento,
                    supplierName: item.supplierName,
                    supplierRut: item.supplierRut,
                    responsable: item.responsable || 'Sistema',
                    detalles: [],
                    totalNetoGlobal: 0,
                    totalBrutoGlobal: 0
                };
            }
            
            // Acumuladores
            grupos[key].totalNetoGlobal += (item.totalNeto || 0);
            grupos[key].totalBrutoGlobal += (item.totalBruto || 0);
            grupos[key].detalles.push(item);
        });

        // Convertir objeto a array y ordenar por fecha descendente (más reciente primero)
        const arrayOrdenado = Object.values(grupos).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setHistorialAgrupado(arrayOrdenado);
    };

    // --- MANEJO DEL MODAL ---
    const abrirModalDetalle = (factura) => {
        setFacturaSeleccionada(factura);
        setMostrarModal(true);
        setIdEditando(null); // Resetear edición si había una pendiente
    };

    // --- EDICIÓN ---
    const iniciarEdicion = (item) => {
        setIdEditando(item.id);
        setDatosEdit({ ...item });
    };

    const guardarCambios = async () => {
        if(!idEditando) return;
        
        // Validación básica
        if(datosEdit.cantidad < 0 || datosEdit.costoUnitario < 0) {
            alert("Cantidades y costos no pueden ser negativos");
            return;
        }

        try {
            await actualizarIngresoItem(idEditando, datosEdit);
            alert("✅ Ítem actualizado correctamente.");
            
            setIdEditando(null);
            setMostrarModal(false); // Cerramos para forzar refresco limpio
            cargarDatos(); // Recargamos datos de la BD para recalcular totales reales
        } catch (error) {
            alert("❌ Error: " + (error.response?.data?.message || "No se pudo actualizar"));
        }
    };

    // --- CÁLCULOS EN TIEMPO REAL PARA EL MODAL ---
    // Si estamos editando, recalculamos los totales visualmente dentro del modal
    const infoModal = useMemo(() => {
        if (!facturaSeleccionada) return null;

        // Si se está editando, usamos los datos temporales, sino los originales
        const itemsCalculados = facturaSeleccionada.detalles.map(item => {
            if (item.id === idEditando) {
                const cant = parseFloat(datosEdit.cantidad) || 0;
                const costo = parseFloat(datosEdit.costoUnitario) || 0;
                const neto = Math.round(cant * costo);
                const bruto = Math.round(neto * 1.19); // Asumiendo IVA 19%
                return { ...item, cantidad: cant, costoUnitario: costo, totalNeto: neto, totalBruto: bruto };
            }
            return item;
        });

        const totalNeto = itemsCalculados.reduce((acc, it) => acc + it.totalNeto, 0);
        const totalBruto = itemsCalculados.reduce((acc, it) => acc + it.totalBruto, 0);
        const totalIva = totalBruto - totalNeto;

        return { items: itemsCalculados, totalNeto, totalIva, totalBruto };
    }, [facturaSeleccionada, idEditando, datosEdit]);


    // --- RENDER ---
    return (
        <div className="inventory-container" style={{padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh'}}>
            {/* Header Principal */}
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
                <div>
                    <h2 style={{margin: 0, color: '#2d3748'}}>📜 Historial de Ingresos</h2>
                    <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>Registro histórico agrupado por documento</p>
                </div>
                <button onClick={() => navigate('/menu')} className="back-btn" style={{padding: '10px 20px', cursor:'pointer'}}>⬅ Volver al Menú</button>
            </div>

            {/* Barra de Filtros */}
            <div className="filters-panel" style={{background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px'}}>
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por N° Documento, Proveedor o RUT..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    className="filter-input"
                    style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '1rem'}}
                />
            </div>

            {/* Tabla Principal */}
            <div className="table-container" style={{background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden'}}>
                {loading ? (
                    <div style={{padding: '40px', textAlign: 'center', color: '#718096'}}>Cargando historial...</div>
                ) : (
                    <table className="responsive-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead style={{backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0'}}>
                            <tr>
                                <th style={{padding: '15px', textAlign: 'left', color: '#4a5568'}}>Fecha</th>
                                <th style={{padding: '15px', textAlign: 'left', color: '#4a5568'}}>N° Doc</th>
                                <th style={{padding: '15px', textAlign: 'left', color: '#4a5568'}}>Proveedor</th>
                                <th style={{padding: '15px', textAlign: 'left', color: '#4a5568'}}>RUT</th>
                                <th style={{padding: '15px', textAlign: 'right', color: '#2d3748'}}>Total Bruto</th>
                                <th style={{padding: '15px', textAlign: 'center', color: '#4a5568'}}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historialAgrupado.filter(grupo => 
                                grupo.numeroDocumento.includes(busqueda) || 
                                grupo.supplierName.toLowerCase().includes(busqueda.toLowerCase()) ||
                                grupo.supplierRut.toLowerCase().includes(busqueda.toLowerCase())
                            ).map((grupo, i) => (
                                <tr key={grupo.key} style={{borderBottom: '1px solid #edf2f7', transition: 'background 0.2s'}}>
                                    <td style={{padding: '15px'}}>{grupo.fecha}</td>
                                    <td style={{padding: '15px', fontWeight: 'bold', color: '#3182ce'}}>{grupo.numeroDocumento}</td>
                                    <td style={{padding: '15px'}}>{grupo.supplierName}</td>
                                    <td style={{padding: '15px', fontSize: '0.9rem', color: '#718096'}}>{grupo.supplierRut}</td>
                                    <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#2f855a'}}>
                                        {formatCurrency(grupo.totalBrutoGlobal)}
                                    </td>
                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <button 
                                            onClick={() => abrirModalDetalle(grupo)} 
                                            className="btn-primary"
                                            style={{padding: '6px 12px', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', border: '1px solid #3182ce', background: 'white', color: '#3182ce'}}
                                        >
                                            📄 Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL DETALLE CON FORMATO FACTURA */}
            {mostrarModal && facturaSeleccionada && infoModal && (
                <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
                    <div className="modal-content" style={{backgroundColor: 'white', padding: '0', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
                        
                        {/* 1. Header del Modal (Estilo Factura) */}
                        <div style={{padding: '20px 30px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                            <div>
                                <h3 style={{margin: '0 0 5px 0', color: '#2d3748', textTransform: 'uppercase'}}>Factura de Compra</h3>
                                <div style={{fontSize: '0.9rem', color: '#718096'}}>
                                    <strong>Proveedor:</strong> {facturaSeleccionada.supplierName}<br/>
                                    <strong>RUT:</strong> {facturaSeleccionada.supplierRut}<br/>
                                    <strong>Responsable:</strong> {facturaSeleccionada.responsable}
                                </div>
                            </div>
                            <div style={{textAlign: 'right'}}>
                                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#e53e3e'}}>N° {facturaSeleccionada.numeroDocumento}</div>
                                <div style={{fontSize: '0.9rem', color: '#4a5568'}}>Fecha: {facturaSeleccionada.fecha}</div>
                            </div>
                        </div>

                        {/* 2. Cuerpo (Tabla de Items) */}
                        <div style={{padding: '20px 30px', flex: 1}}>
                            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem'}}>
                                <thead>
                                    <tr style={{borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                        <th style={{textAlign: 'left', padding: '10px'}}>Producto</th>
                                        <th style={{textAlign: 'center', padding: '10px'}}>Cant.</th>
                                        <th style={{textAlign: 'right', padding: '10px'}}>P. Unit (Neto)</th>
                                        <th style={{textAlign: 'right', padding: '10px'}}>Subtotal Neto</th>
                                        <th style={{textAlign: 'center', padding: '10px'}}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {infoModal.items.map((item, idx) => (
                                        <tr key={idx} style={{borderBottom: '1px solid #edf2f7', backgroundColor: idEditando === item.id ? '#fffaf0' : 'transparent'}}>
                                            <td style={{padding: '12px 10px'}}>{item.productName}</td>
                                            
                                            {/* Columna Cantidad */}
                                            <td style={{padding: '10px', textAlign: 'center'}}>
                                                {idEditando === item.id ? (
                                                    <input 
                                                        type="number" 
                                                        value={datosEdit.cantidad} 
                                                        onChange={e => setDatosEdit({...datosEdit, cantidad: e.target.value})} 
                                                        style={{width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #ecc94b', outline: 'none', borderRadius: '4px'}}
                                                    />
                                                ) : item.cantidad}
                                            </td>

                                            {/* Columna Precio Unitario */}
                                            <td style={{padding: '10px', textAlign: 'right'}}>
                                                {idEditando === item.id ? (
                                                    <input 
                                                        type="number" 
                                                        value={datosEdit.costoUnitario} 
                                                        onChange={e => setDatosEdit({...datosEdit, costoUnitario: e.target.value})} 
                                                        style={{width: '80px', padding: '4px', textAlign: 'right', border: '1px solid #ecc94b', outline: 'none', borderRadius: '4px'}}
                                                    />
                                                ) : formatCurrency(item.costoUnitario)}
                                            </td>

                                            {/* Columna Total Neto Línea */}
                                            <td style={{padding: '10px', textAlign: 'right', fontWeight: '500'}}>
                                                {formatCurrency(item.totalNeto)}
                                            </td>

                                            {/* Botones */}
                                            <td style={{padding: '10px', textAlign: 'center'}}>
                                                {idEditando === item.id ? (
                                                    <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                                                        <button onClick={guardarCambios} title="Guardar" style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem'}}>💾</button>
                                                        <button onClick={() => setIdEditando(null)} title="Cancelar" style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem'}}>❌</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => iniciarEdicion(item)} title="Editar Ítem" style={{background:'none', border:'none', cursor:'pointer', opacity: 0.6}}>✏️</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 3. Footer (Totales Financieros) */}
                        <div style={{backgroundColor: '#f8fafc', padding: '20px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end'}}>
                            <div style={{minWidth: '200px', textAlign: 'right'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#4a5568'}}>
                                    <span>Total Neto:</span>
                                    <span>{formatCurrency(infoModal.totalNeto)}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#4a5568'}}>
                                    <span>IVA (19%):</span>
                                    <span>{formatCurrency(infoModal.totalIva)}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: '#2f855a', borderTop: '1px solid #cbd5e0', paddingTop: '8px'}}>
                                    <span>TOTAL BRUTO:</span>
                                    <span>{formatCurrency(infoModal.totalBruto)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Botón Cerrar */}
                        <div style={{padding: '15px', textAlign: 'center', backgroundColor: 'white'}}>
                            <button 
                                onClick={() => { setMostrarModal(false); setIdEditando(null); }} 
                                style={{padding: '10px 30px', backgroundColor: '#718096', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                                Cerrar Documento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
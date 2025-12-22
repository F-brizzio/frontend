import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalidas, getDetalleSalida } from '../services/historialSalidaService'; 

export default function HistorialSalidaPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [historialResumen, setHistorialResumen] = useState([]); 
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);

    // Carga inicial del resumen agrupado por el backend
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const data = await getSalidas(); 
                setHistorialResumen(data);
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        cargarDatos();
    }, []);

    // Trae el detalle real (productos) por Folio
    const abrirDetalle = async (guia) => {
        try {
            const items = await getDetalleSalida(guia.folio); 
            setGuiaSeleccionada({ ...guia, items }); // Unimos resumen + items reales
            setMostrarModal(true);
        } catch (error) { alert("Error al cargar productos."); }
    };

    const filtrados = historialResumen.filter(g => !fechaFiltro || g.fecha === fechaFiltro);

    return (
        <div style={{padding: '30px'}}>
            {/* TABLA PRINCIPAL */}
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th><th>Responsable</th><th>Destino</th>
                        <th style={{textAlign:'right'}}>Total Neto</th><th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {filtrados.map((g, i) => (
                        <tr key={i}>
                            <td>{g.fecha}</td>
                            <td>{g.responsable}</td>
                            <td>{g.destino}</td>
                            <td style={{textAlign:'right'}}>${g.totalNeto?.toLocaleString('es-CL')}</td>
                            <td><button onClick={() => abrirDetalle(g)}>Ver Detalle</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* MODAL DE DETALLE */}
            {mostrarModal && guiaSeleccionada && (
                <div className="modal">
                    {/* Tabla de productos con d.productName y d.valorNeto */}
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Neto Item</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guiaSeleccionada.items.map((d, i) => (
                                <tr key={i}>
                                    <td>{d.productName}</td>
                                    <td>{d.tipoSalida}</td>
                                    <td>{d.cantidad}</td>
                                    <td>${d.valorNeto?.toLocaleString('es-CL')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{textAlign:'right', fontWeight:'bold'}}>
                        TOTAL GUÍA: ${guiaSeleccionada.totalNeto?.toLocaleString('es-CL')}
                    </div>
                </div>
            )}
        </div>
    );
}
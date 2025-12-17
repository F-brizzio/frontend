// 1. DICCIONARIO DE CLAVES (Para usar en el código: if(canAccess(MODULOS.INGRESO))...)
export const MODULOS = {
    INGRESO: 'INGRESO',
    GUIA_CONSUMO: 'GUIA_CONSUMO',
    NOTAS: 'NOTAS',
    INVENTARIO: 'INVENTARIO',
    PRODUCTOS: 'PRODUCTOS',
    AREAS: 'AREAS',
    REPORTES: 'REPORTES',
    ALERTAS: 'ALERTAS',
    HISTORIAL_INGRESO: 'HISTORIAL_INGRESO',
    HISTORIAL_SALIDA: 'HISTORIAL_SALIDA',
    USUARIOS: 'USUARIOS'
};

// 2. LISTA PARA CHECKBOXES (Para mostrar en la Gestión de Usuarios)
export const LISTA_MODULOS = [
    { key: MODULOS.INGRESO,           label: '📥 Ingreso Mercancía' },
    { key: MODULOS.GUIA_CONSUMO,      label: '📤 Guía Consumo' },
    { key: MODULOS.NOTAS,             label: '📝 Bitácora y Notas' },
    { key: MODULOS.INVENTARIO,        label: '📦 Inventario Actual' },
    { key: MODULOS.PRODUCTOS,         label: '🏷️ Catálogo Productos' },
    { key: MODULOS.AREAS,             label: '🏭 Área de Trabajo' },
    { key: MODULOS.REPORTES,          label: '📊 Reportes Avanzados' },
    { key: MODULOS.ALERTAS,           label: '🔔 Centro de Alertas' },
    { key: MODULOS.HISTORIAL_INGRESO, label: '📜 Historial Ingreso' },
    { key: MODULOS.HISTORIAL_SALIDA,  label: '📤 Historial Salida' },
    { key: MODULOS.USUARIOS,          label: '👥 Gestión Usuario' }
];
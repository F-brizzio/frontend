import { useState, useEffect } from 'react';

export default function MultiSelect({ options, label, onChange, selectedValues }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar opciones por el buscador
    const filteredOptions = options.filter(opt => 
        // Si label es null o undefined, usamos comillas vacías ''
        (opt.label || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (val) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(item => item !== val));
        } else {
            onChange([...selectedValues, val]);
        }
    };

    const handleSelectAll = () => {
        if (selectedValues.length === options.length) {
            onChange([]); // Borrar todo
        } else {
            onChange(options.map(o => o.value)); // Marcar todo
        }
    };

    return (
        <div style={{ position: 'relative', minWidth: '200px' }}>
            <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>{label}</label>
            
            {/* Caja Principal */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>
                    {selectedValues.length === 0 ? 'Seleccionar...' : 
                     selectedValues.length === options.length ? 'Todos seleccionados' :
                     `${selectedValues.length} seleccionados`}
                </span>
                <span>▼</span>
            </div>

            {/* Menú Desplegable */}
            {isOpen && (
                <div style={{ 
                    position: 'absolute', top: '100%', left: 0, width: '100%', 
                    border: '1px solid #ccc', background: 'white', zIndex: 1000, 
                    maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}>
                    {/* Buscador */}
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: 'none', borderBottom: '1px solid #eee', boxSizing:'border-box' }}
                        onClick={(e) => e.stopPropagation()} 
                    />

                    {/* Botón Seleccionar Todos */}
                    <div 
                        onClick={handleSelectAll}
                        style={{ padding: '8px', borderBottom: '1px solid #eee', cursor: 'pointer', fontWeight: 'bold', color: '#007bff', textAlign: 'center' }}
                    >
                        {selectedValues.length === options.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </div>

                    {/* Lista de Opciones */}
                    {filteredOptions.length === 0 ? (
                        <div style={{padding:'10px', color:'#999', textAlign:'center'}}>No hay resultados</div>
                    ) : (
                        filteredOptions.map(opt => (
                            <div 
                                key={opt.value} 
                                onClick={() => toggleOption(opt.value)}
                                style={{ padding: '8px', cursor: 'pointer', background: selectedValues.includes(opt.value) ? '#e9ecef' : 'white', borderBottom: '1px solid #f0f0f0' }}
                            >
                                <input type="checkbox" checked={selectedValues.includes(opt.value)} readOnly style={{ marginRight: '10px' }} />
                                {opt.label}
                            </div>
                        ))
                    )}
                </div>
            )}
            {/* Fondo transparente para cerrar al hacer click afuera */}
            {isOpen && (
                <div 
                    onClick={() => setIsOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999 }}
                />
            )}
        </div>
    );
}
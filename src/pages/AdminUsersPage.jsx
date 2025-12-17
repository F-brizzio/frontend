import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, verifySecurityPassword } from '../services/userService';
import { useNavigate } from 'react-router-dom';
import { LISTA_MODULOS } from '../constants/modules';

export default function AdminUsersPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    
    // Estado Vistas
    const [viewState, setViewState] = useState('LIST'); // LIST, CREATE, EDIT
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Seguridad
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityPassword, setSecurityPassword] = useState('');
    const [pendingAction, setPendingAction] = useState(null); 

    // Formulario
    const initialForm = { fullName: '', rut: '', username: '', password: '', role: 'USER', accesos: [] };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (e) { console.error(e); }
    };

    // --- SEGURIDAD ---
    const solicitarConfirmacion = (accion) => {
        setPendingAction(() => accion);
        setSecurityPassword('');
        setShowSecurityModal(true);
    };

    const confirmarSeguridad = async () => {
        try {
            const esCorrecta = await verifySecurityPassword(securityPassword);
            if (esCorrecta) {
                setShowSecurityModal(false);
                if (pendingAction) pendingAction();
            } else {
                alert("⛔ Contraseña incorrecta.");
            }
        } catch (error) {
            alert("Error de verificación");
        }
    };

    // --- PERMISOS ---
    const handlePermissionChange = (moduloKey) => {
        setForm(prev => {
            const nuevos = prev.accesos.includes(moduloKey)
                ? prev.accesos.filter(k => k !== moduloKey)
                : [...prev.accesos, moduloKey];
            return { ...prev, accesos: nuevos };
        });
    };

    // --- CRUD ---
    const handleCreate = async () => {
        try {
            await createUser(form);
            alert("Usuario creado exitosamente");
            setViewState('LIST');
            cargarUsuarios();
        } catch (e) { alert("Error al crear usuario"); }
    };

    const handleDelete = async (id) => {
        try {
            await deleteUser(id);
            cargarUsuarios();
        } catch (e) { alert("Error al eliminar"); }
    };

    const handleUpdateParcial = async (id, datos) => {
        try {
            await updateUser(id, datos);
            alert("Datos actualizados");
            setSelectedUser({ ...selectedUser, ...datos });
            cargarUsuarios();
        } catch (e) { alert("Error al actualizar"); }
    };

    // --- RENDERIZADO ---

    // 1. MODAL SEGURIDAD
    if (showSecurityModal) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔒</div>
                    <h3 style={{ margin: '0 0 10px 0' }}>Confirmación Requerida</h3>
                    <p style={{ color: '#718096', marginBottom: '20px' }}>Ingrese su contraseña de administrador</p>
                    
                    <input 
                        type="password" 
                        value={securityPassword} 
                        onChange={e => setSecurityPassword(e.target.value)}
                        placeholder="Contraseña Admin"
                        className="form-input"
                        autoFocus
                    />
                    
                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={() => setShowSecurityModal(false)} className="btn-secondary">Cancelar</button>
                        <button onClick={confirmarSeguridad} className="btn-primary">Confirmar</button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. CREAR USUARIO
    if (viewState === 'CREATE') {
        return (
            <div className="inventory-container">
                <div className="page-header">
                    <h2 className="page-title">➕ Nuevo Usuario</h2>
                    <button onClick={() => setViewState('LIST')} className="back-btn">Cancelar</button>
                </div>

                <div className="form-card">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Nombre Completo</label>
                            <input value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">RUT</label>
                            <input value={form.rut} onChange={e=>setForm({...form, rut:e.target.value})} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Usuario (Login)</label>
                            <input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contraseña</label>
                            <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rol del Sistema</label>
                            <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})} className="form-select">
                                <option value="USER">Usuario (Operario)</option>
                                <option value="ADMIN">Administrador (Total)</option>
                            </select>
                        </div>
                    </div>

                    {form.role !== 'ADMIN' && (
                        <div style={{ marginTop: '25px', padding: '20px', background: '#f7fafc', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                            <h4 style={{ margin: '0 0 15px 0', color: '#4a5568' }}>🔐 Permisos de Acceso</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                                {LISTA_MODULOS.map(mod => (
                                    <label key={mod.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={form.accesos.includes(mod.key)}
                                            onChange={() => handlePermissionChange(mod.key)}
                                            style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                        />
                                        <span style={{ fontSize: '0.9em', fontWeight: '500' }}>{mod.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button onClick={() => setViewState('LIST')} className="btn-secondary">Cancelar</button>
                        <button onClick={() => solicitarConfirmacion(handleCreate)} className="btn-primary">Guardar Usuario</button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. EDITAR USUARIO
    if (viewState === 'EDIT' && selectedUser) {
        return (
            <div className="inventory-container">
                <div className="page-header">
                    <h2 className="page-title">✏️ Editando: {selectedUser.fullName}</h2>
                    <button onClick={() => setViewState('LIST')} className="back-btn">⬅ Volver</button>
                </div>

                {/* Grid de 3 tarjetas para organizar la edición */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    
                    {/* TARJETA 1: DATOS */}
                    <div className="form-card" style={{ margin: 0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'15px' }}>
                            <h4 style={{ margin:0 }}>👤 Datos Personales</h4>
                            <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:'0.8em' }}
                                onClick={() => solicitarConfirmacion(() => {
                                    const newName = prompt("Nuevo Nombre:", selectedUser.fullName);
                                    const newRut = prompt("Nuevo RUT:", selectedUser.rut);
                                    if(newName && newRut) handleUpdateParcial(selectedUser.id, { fullName: newName, rut: newRut });
                                })}
                            >Editar</button>
                        </div>
                        <p style={{marginBottom:'5px'}}><small>Nombre:</small><br/><strong>{selectedUser.fullName}</strong></p>
                        <p><small>RUT:</small><br/><strong>{selectedUser.rut}</strong></p>
                    </div>

                    {/* TARJETA 2: CREDENCIALES */}
                    <div className="form-card" style={{ margin: 0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'15px' }}>
                            <h4 style={{ margin:0 }}>🔑 Credenciales</h4>
                            <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:'0.8em' }}
                                onClick={() => solicitarConfirmacion(() => {
                                    const newPass = prompt("Nueva contraseña:");
                                    if(newPass) handleUpdateParcial(selectedUser.id, { password: newPass });
                                })}
                            >Cambiar Clave</button>
                        </div>
                        <p style={{marginBottom:'5px'}}><small>Usuario:</small><br/><strong>{selectedUser.username}</strong></p>
                        <p><small>Contraseña:</small><br/>******</p>
                    </div>

                    {/* TARJETA 3: ROL */}
                    <div className="form-card" style={{ margin: 0 }}>
                        <h4 style={{ margin:'0 0 15px 0' }}>🛡️ Rol Actual</h4>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <span className="badge-category" style={{ 
                                background: selectedUser.role === 'ADMIN' ? '#fed7d7' : '#c6f6d5',
                                color: selectedUser.role === 'ADMIN' ? '#c53030' : '#2f855a',
                                fontSize: '1rem'
                            }}>
                                {selectedUser.role === 'ADMIN' ? 'ADMINISTRADOR' : 'USUARIO'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BLOQUE DE PERMISOS (Full Width) */}
                <div className="form-card" style={{ marginTop: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        🔐 Gestión de Accesos
                    </h4>
                    
                    {selectedUser.role === 'ADMIN' ? (
                        <p style={{ color: '#718096', fontStyle: 'italic' }}>Los administradores tienen acceso total por defecto.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                            {LISTA_MODULOS.map(mod => {
                                const isChecked = selectedUser.accesos ? selectedUser.accesos.includes(mod.key) : false;
                                return (
                                    <label key={mod.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', background: isChecked ? '#ebf8ff' : '#f7fafc', borderRadius: '6px', border: isChecked ? '1px solid #3182ce' : '1px solid #e2e8f0', transition: '0.2s' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked}
                                            onChange={() => {
                                                const nuevos = isChecked 
                                                    ? selectedUser.accesos.filter(k => k !== mod.key)
                                                    : [...(selectedUser.accesos || []), mod.key];
                                                setSelectedUser({ ...selectedUser, accesos: nuevos });
                                            }}
                                            style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                                        />
                                        <span style={{ fontWeight: isChecked ? '600' : '400', color: isChecked ? '#2b6cb0' : '#4a5568' }}>{mod.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                    
                    {selectedUser.role !== 'ADMIN' && (
                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button 
                                onClick={() => solicitarConfirmacion(() => handleUpdateParcial(selectedUser.id, { accesos: selectedUser.accesos }))} 
                                className="btn-primary"
                            >
                                Guardar Cambios de Acceso
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 4. LISTA DE USUARIOS (VISTA PRINCIPAL)
    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">👥 Gestión de Usuarios</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/menu')} className="back-btn">⬅ Menú</button>
                    <button onClick={() => { setForm(initialForm); setViewState('CREATE'); }} className="btn-primary">➕ Nuevo</button>
                </div>
            </div>

            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Permisos</th>
                            <th style={{textAlign:'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td data-label="Nombre">
                                    <strong>{u.fullName}</strong>
                                    <div style={{ fontSize: '0.8em', color: '#718096' }}>RUT: {u.rut}</div>
                                </td>
                                <td data-label="Usuario">{u.username}</td>
                                <td data-label="Rol">
                                    <span className="badge-category" style={{ 
                                        background: u.role==='ADMIN'?'#fed7d7':'#c6f6d5', 
                                        color: u.role==='ADMIN'?'#c53030':'#2f855a' 
                                    }}>
                                        {u.role}
                                    </span>
                                </td>
                                <td data-label="Permisos" style={{ fontSize:'0.9em', color:'#4a5568' }}>
                                    {u.role === 'ADMIN' ? '✨ Acceso Total' : (
                                        u.accesos?.length > 0 ? `✅ ${u.accesos.length} Módulos` : '❌ Sin acceso'
                                    )}
                                </td>
                                <td data-label="Acciones" style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button 
                                            onClick={() => { setSelectedUser(u); setViewState('EDIT'); }} 
                                            className="btn-secondary"
                                            style={{ padding: '6px 10px', fontSize: '1.2em' }}
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => solicitarConfirmacion(() => handleDelete(u.id))} 
                                            className="btn-secondary"
                                            style={{ padding: '6px 10px', fontSize: '1.2em', color: '#e53e3e', background: '#fff5f5' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
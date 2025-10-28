// src/pages/DashboardOperador.jsx (ACTUALIZADO)

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaClipboardList, FaUsers, FaTasks, FaExclamationTriangle, 
    FaWalking, FaChartLine, FaUserCircle, FaSignOutAlt, FaCog, 
    FaVideo, // 🎥 Nuevo icono para LiveOps/Monitor
} from 'react-icons/fa'; 

// --- Estilos Generales y Constantes ---
const PRIMARY_COLOR = '#1e3c72'; 
const ACCENT_COLOR = '#2563eb'; 

const dashboardStyles = {
    // [Se mantienen todos los estilos de Header, NavLateral, y Layout anterior]
    header: {
        backgroundColor: PRIMARY_COLOR,
        color: '#fff',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
    },
    logo: {
        fontSize: '24px',
        fontWeight: 'bold',
        textDecoration: 'none',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
    },
    userMenu: {
        position: 'relative',
    },
    userButton: {
        background: 'none',
        border: 'none',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '20px',
        padding: '5px 10px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
    },
    dropdown: {
        position: 'absolute',
        top: '45px',
        right: '0',
        backgroundColor: '#fff',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
        minWidth: '180px',
        zIndex: 100,
    },
    dropdownItem: {
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        color: PRIMARY_COLOR,
        textDecoration: 'none',
        borderBottom: '1px solid #eee',
    },
    dropdownItemHover: {
        backgroundColor: '#f5f5f5',
    },
    
    // --- NAV LATERAL (Sidemenu) ---
    sidebar: {
        width: '250px',
        backgroundColor: '#f8f9fa', 
        padding: '20px 0',
        boxShadow: '2px 0 5px rgba(0,0,0,0.05)',
        minHeight: 'calc(100vh - 70px)', 
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        textDecoration: 'none',
        color: PRIMARY_COLOR,
        fontWeight: '500',
        transition: 'background-color 0.2s',
    },
    navItemActive: {
        backgroundColor: ACCENT_COLOR,
        color: '#fff',
        borderRight: `5px solid ${PRIMARY_COLOR}`,
    },
    
    // --- CONTENIDO PRINCIPAL ---
    mainLayout: {
        display: 'flex',
        minHeight: '100vh',
    },
    contentArea: {
        flexGrow: 1,
        padding: '30px',
        backgroundColor: '#fff',
    },
    
    // --- ESTILOS DE MÓDULOS (Tarjetas) ---
    container: { 
        maxWidth: '1200px',
        margin: '0 auto',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        textAlign: 'center',
        textDecoration: 'none', 
        color: '#333',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '150px',
        borderLeft: `5px solid ${ACCENT_COLOR}`, 
    },
    cardHover: {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    },
    icon: {
        fontSize: '40px',
        color: ACCENT_COLOR,
        marginBottom: '10px',
    },
    subtitle: {
        fontSize: '18px',
        fontWeight: '600',
        margin: '5px 0 0 0',
    },
    description: {
        fontSize: '14px',
        color: '#666',
    },
    title: {
        color: PRIMARY_COLOR,
        borderBottom: '2px solid #ccc',
        paddingBottom: '10px',
        marginBottom: '30px',
    },
};

// --- COMPONENTE HEADER (sin cambios) ---
const Header = ({ operador = "Operador 1" }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleHover = (e, isEnter) => {
        if (isEnter) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        } else {
            e.currentTarget.style.backgroundColor = 'none';
        }
    };
    
    const handleItemHover = (e, isEnter) => {
        e.currentTarget.style.backgroundColor = isEnter ? dashboardStyles.dropdownItemHover.backgroundColor : 'transparent';
    };

    return (
        <header style={dashboardStyles.header}>
            <Link to="/" style={dashboardStyles.logo}>
                <FaExclamationTriangle style={{marginRight: '10px', color: ACCENT_COLOR}} />
                Monitoreo G3T
            </Link>

            <div style={dashboardStyles.userMenu}>
                <button 
                    style={dashboardStyles.userButton} 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                >
                    <FaUserCircle style={{marginRight: '8px'}} />
                    {operador}
                </button>
                
                {isDropdownOpen && (
                    <div style={dashboardStyles.dropdown}>
                        <Link 
                            to="/perfil" 
                            style={dashboardStyles.dropdownItem}
                            onMouseEnter={(e) => handleItemHover(e, true)}
                            onMouseLeave={(e) => handleItemHover(e, false)}
                        >
                            <FaUserCircle style={{marginRight: '10px'}} /> Mi Perfil
                        </Link>
                        <Link 
                            to="/configuracion" 
                            style={dashboardStyles.dropdownItem}
                            onMouseEnter={(e) => handleItemHover(e, true)}
                            onMouseLeave={(e) => handleItemHover(e, false)}
                        >
                            <FaCog style={{marginRight: '10px'}} /> Configuración
                        </Link>
                        <Link 
                            to="/logout" 
                            style={{...dashboardStyles.dropdownItem, color: '#dc2626'}}
                            onMouseEnter={(e) => handleItemHover(e, true)}
                            onMouseLeave={(e) => handleItemHover(e, false)}
                        >
                            <FaSignOutAlt style={{marginRight: '10px'}} /> Cerrar Sesión
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
};

// --- COMPONENTE NAV LATERAL (sin cambios funcionales) ---
const NavLateral = ({ modules }) => {
    const pathname = window.location.pathname; 
    
    const handleHover = (e, isEnter, color) => {
        if (e.currentTarget.href.endsWith(pathname)) return; 
        e.currentTarget.style.backgroundColor = isEnter ? '#e0e0e0' : 'transparent';
    };

    return (
        <nav style={dashboardStyles.sidebar}>
            {modules.map((module) => (
                <Link 
                    key={module.path}
                    to={module.path}
                    style={{
                        ...dashboardStyles.navItem, 
                        ...(pathname === module.path ? dashboardStyles.navItemActive : {})
                    }}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                >
                    {React.cloneElement(module.icon, { style: { marginRight: '10px', fontSize: '18px' } })}
                    {module.title}
                </Link>
            ))}
        </nav>
    );
};


// --- COMPONENTE DASHBOARD PRINCIPAL (ACTUALIZADO) ---
const DashboardOperador = () => {
    
    // Definición de los módulos (AHORA INCLUYE /monitor)
    const modules = [
        { 
            title: 'Inicio', 
            path: '/', 
            icon: <FaChartLine />,
            description: 'Panel de resumen operativo y alertas.',
            color: ACCENT_COLOR
        },
        { 
            title: 'Monitor en Vivo', 
            path: '/monitor', 
            icon: <FaVideo />, // 🎥 Nuevo módulo clave
            description: 'Acceso al dashboard de operaciones en tiempo real (CCTV, Alarmas).',
            color: '#10b981' // Verde claro
        },
        { 
            title: 'Crear Novedad/Reporte', 
            path: '/formulario', 
            icon: <FaClipboardList />,
            description: 'Inicio rápido para nuevos reportes de monitoreo.',
            color: '#2563eb'
        },
        { 
            title: 'Muro de Novedades', 
            path: '/novedades', 
            icon: <FaChartLine />,
            description: 'Ver listado y estado de todos los reportes recientes.',
            color: '#059669'
        },
        { 
            title: 'Reportes Pendientes', 
            path: '/pendientes', 
            icon: <FaTasks />,
            description: 'Retomar y finalizar reportes guardados en estado Pendiente.',
            color: '#f59e0b'
        },
        { 
            title: 'Formulario Rondín', 
            path: '/rondin2', 
            icon: <FaWalking />,
            description: 'Registrar la gestión de riesgo por rondín de seguridad.',
            color: '#dc2626'
        },
        { 
            title: 'Clientes Críticos', 
            path: '/clientes', 
            icon: <FaUsers />,
            description: 'Acceso a la lista y detalles de clientes de alta criticidad.',
            color: '#9333ea'
        },
    ];
    
    // Filtramos el módulo 'Inicio' para la vista de tarjetas
    const cardModules = modules.filter(m => m.path !== '/');
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

    return (
        <>
            <Header />
            <div style={dashboardStyles.mainLayout}>
                {/* Barra de Navegación Lateral (incluye /monitor) */}
                {isSidebarOpen && <NavLateral modules={modules} />}
                
                {/* Área de Contenido Principal */}
                <main style={dashboardStyles.contentArea}>
                    <div style={dashboardStyles.container}>
                        <h1 style={dashboardStyles.title}>
                            <FaChartLine style={{marginRight: '10px'}} /> Resumen Operativo y Módulos
                        </h1>
                        <p style={dashboardStyles.description}>
                            Seleccione un módulo para comenzar o retome sus tareas de monitoreo.
                        </p>

                        <div style={dashboardStyles.grid}>
                            {/* Tarjetas de Módulos (incluye /monitor) */}
                            {cardModules.map((module) => (
                                <Link 
                                    key={module.path} 
                                    to={module.path} 
                                    style={{...dashboardStyles.card, borderLeftColor: module.color}}
                                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = dashboardStyles.cardHover.boxShadow}
                                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = dashboardStyles.card.boxShadow}
                                >
                                    {React.cloneElement(module.icon, { style: {...dashboardStyles.icon, color: module.color} })}
                                    <h2 style={dashboardStyles.subtitle}>{module.title}</h2>
                                    <p style={dashboardStyles.description}>{module.description}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default DashboardOperador;
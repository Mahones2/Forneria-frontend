// src/components/Navbar/NavbarLanding.jsx
import { useState } from "react"; // Importamos useState
import { Link } from "react-router-dom";
// Asegúrate de que esta ruta a la imagen sea correcta
import logo from "../../assets/logo.png";
import "./navlanding.css";

export default function NavbarLanding() {
  // Estado para controlar si el menú móvil está abierto o cerrado
  const [isOpen, setIsOpen] = useState(false);

  // Función para alternar el estado del menú
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Función para cerrar el menú después de hacer clic en un enlace (en móvil)
  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <div className="logo">
            <Link to="/" onClick={closeMenu}>
              <img src={logo} alt="Fornería Logo" className="logo-img" />
            </Link>
          </div>

          {/* Botón de Hamburguesa - Visible solo en Móvil */}
          <button className="hamburger" onClick={toggleMenu} aria-label="Abrir menú">
            {/* Aquí puedes usar un ícono, por ahora usamos líneas de texto o un div */}
            <div className={`bar ${isOpen ? 'open' : ''}`}></div>
            <div className={`bar ${isOpen ? 'open' : ''}`}></div>
            <div className={`bar ${isOpen ? 'open' : ''}`}></div>
          </button>

          {/* Menú de Navegación - Se muestra/oculta en móvil */}
          <ul className={`nav-menu ${isOpen ? 'active' : ''}`}>
            {/* Estos son anclas dentro de la misma landing */}
            <li><a href="#inicio" onClick={closeMenu}>Inicio</a></li>
            <li><a href="#nosotros" onClick={closeMenu}>Nosotros</a></li>
            
            <li>
                <Link to="/pedir" className="fw-bold text-warning" onClick={closeMenu}>
                    Hacer Pedido
                </Link>
            </li>

            <li><a href="#contacto" onClick={closeMenu}>Contacto</a></li>
            
            {/* Botón de Login para empleados */}
            <li><Link to="/login" onClick={closeMenu}>Staff</Link></li>
          </ul>

        </nav>
      </div>
    </header>
  );
}
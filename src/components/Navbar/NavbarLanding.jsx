// src/components/Navbar/NavbarLanding.jsx
import { Link } from "react-router-dom";
// Asegúrate de que esta ruta a la imagen sea correcta
import logo from "../../assets/logo.png";

export default function NavbarLanding() {
  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <div className="logo">
            <Link to="/">
              <img src={logo} alt="Fornería Logo" className="logo-img" />
            </Link>
          </div>

          <ul className="nav-menu">
            {/* Estos son anclas dentro de la misma landing */}
            <li><a href="#inicio">Inicio</a></li>
            <li><a href="#nosotros">Nosotros</a></li>
            
            {/* --- CAMBIO AQUÍ --- */}
            <li>
                <Link to="/pedir" className="fw-bold text-warning">
                    Hacer Pedido
                </Link>
            </li>
            {/* ------------------- */}

            <li><a href="#contacto">Contacto</a></li>
            
            {/* Botón de Login para empleados */}
            <li><Link to="/login">Staff</Link></li>
          </ul>

        </nav>
      </div>
    </header>
  );
}
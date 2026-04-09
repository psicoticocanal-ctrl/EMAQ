import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center">
                            <img 
                                src="/imagenes/LOGO EMAQ.jpg.jpeg" 
                                alt="EMAQ Logo" 
                                className="h-14 w-auto object-contain"
                            />
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-semibold text-black hover:text-[#f3b012] transition-colors">Inicio</Link>
                        <Link to="/quienes-somos" className="text-sm font-semibold text-black hover:text-[#f3b012] transition-colors">¿Quiénes somos?</Link>
                        <Link to="/mision-vision" className="text-sm font-semibold text-black hover:text-[#f3b012] transition-colors">Misión y Visión</Link>
                        <Link to="/courses" className="text-sm font-semibold text-black hover:text-[#f3b012] transition-colors">Cursos</Link>
                        <Link to="/verification" className="text-sm font-semibold text-black hover:text-[#f3b012] transition-colors">Verificar Certificado</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-bold text-[#f3b012] px-4 py-2 hover:bg-[#f3b012]/5 rounded-lg transition-all">Iniciar Sesión</Link>
                        <Link to="/register" className="bg-[#f3b012] text-black px-6 py-2.5 rounded-xl text-sm font-bold shadow-xl shadow-[#f3b012]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Registrarse</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

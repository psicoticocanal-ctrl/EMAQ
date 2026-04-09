import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

const Home = () => {
    return (
        <PublicLayout>
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/imagenes/EVALUACION OPERACION EXCAVADORA.jpg.jpeg" 
                        alt="Operación de Maquinaria" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="max-w-2xl space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3b012]/20 border border-[#f3b012]/30 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-[#f3b012] animate-pulse"></span>
                            <span className="text-xs font-bold text-[#f3b012] uppercase tracking-widest">Líderes en Certificación Pesada</span>
                        </div>

                        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-[1.1]">
                            Domina el Terreno con <span className="text-[#f3b012]">EMAQ</span>
                        </h1>

                        <p className="text-xl text-gray-200 font-medium leading-relaxed">
                            Formación profesional y certificación oficial en operación de maquinaria pesada. Impulsa tu futuro laboral con los expertos de la industria.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
                            <a href="/register" className="w-full sm:w-auto px-10 py-5 bg-[#f3b012] text-black rounded-2xl text-lg font-bold shadow-2xl shadow-[#f3b012]/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                                Iniciar Capacitación
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </a>
                            <a href="/courses" className="w-full sm:w-auto px-10 py-5 bg-white/10 backdrop-blur-md text-white rounded-2xl text-lg font-bold border border-white/20 hover:bg-white/20 transition-all text-center">
                                Nuestros Cursos
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats/Features Section */}
            <section className="py-24 bg-white dark:bg-[#050505]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="group p-8 rounded-3xl bg-gray-50 dark:bg-white/5 space-y-4 border border-gray-100 dark:border-white/5 hover:border-[#f3b012]/30 transition-all">
                            <div className="w-16 h-16 bg-[#f3b012]/10 rounded-2xl flex items-center justify-center text-[#f3b012] group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl">verified_user</span>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white text-black">Certificación Oficial</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Validación avalada por EMAQ reconocida por las principales empresas del sector.</p>
                        </div>
                        <div className="group p-8 rounded-3xl bg-gray-50 dark:bg-white/5 space-y-4 border border-gray-100 dark:border-white/5 hover:border-[#f3b012]/30 transition-all">
                            <div className="w-16 h-16 bg-[#f3b012]/10 rounded-2xl flex items-center justify-center text-[#f3b012] group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl">construction</span>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white text-black">Capacitación Real</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Prácticas directas con excavadoras, cargadores y maquinaria de última generación.</p>
                        </div>
                        <div className="group p-8 rounded-3xl bg-gray-50 dark:bg-white/5 space-y-4 border border-gray-100 dark:border-white/5 hover:border-[#f3b012]/30 transition-all">
                            <div className="w-16 h-16 bg-[#f3b012]/10 rounded-2xl flex items-center justify-center text-[#f3b012] group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl">history_edu</span>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white text-black">Seguimiento de Progreso</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Plataforma digital para gestionar tus módulos, exámenes y certificados en tiempo real.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Machinery Gallery */}
            <section className="py-24 bg-gray-50 dark:bg-[#000000]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-black text-black dark:text-white mb-4">Entrenamiento de <span className="text-[#f3b012]">Alto Nivel</span></h2>
                            <p className="text-gray-600 dark:text-gray-400 font-medium">Contamos con la flota más moderna para asegurar que tu aprendizaje sea 100% aplicable al mundo laboral.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="group relative h-80 overflow-hidden rounded-3xl shadow-xl">
                            <img src="/imagenes/CABINA DE CARGADOR FRONTAL.jpg.jpeg" alt="Cargador Frontal" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                                <h4 className="text-white font-bold text-xl">Cargadores Frontales</h4>
                                <p className="text-gray-300 text-sm">Control de cabina y precisión técnica.</p>
                            </div>
                        </div>
                        <div className="group relative h-80 overflow-hidden rounded-3xl shadow-xl">
                            <img src="/imagenes/EXCAVACION Y PERFILACION DE TALUDES.jpg.jpeg" alt="Excavadoras" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                                <h4 className="text-white font-bold text-xl">Excavación Hidráulica</h4>
                                <p className="text-gray-300 text-sm">Perfilación de taludes y excavación profunda.</p>
                            </div>
                        </div>
                        <div className="group relative h-80 overflow-hidden rounded-3xl shadow-xl">
                            <img src="/imagenes/Instalacion de tuberias capacitacion.jpg.jpeg" alt="Motoniveladoras" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                                <h4 className="text-white font-bold text-xl">Ingeniería Aplicada</h4>
                                <p className="text-gray-300 text-sm">Instalación de tuberías y logística de obra.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 bg-[#f3b012]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl sm:text-5xl font-black text-black mb-8">¿Listo para operar tu futuro?</h2>
                    <p className="text-xl text-black/80 font-bold mb-12 max-w-2xl mx-auto">Únete a cientos de operadores ya certificados por EMAQ en toda la región.</p>
                    <a href="/register" className="inline-flex items-center gap-3 px-12 py-5 bg-black text-white rounded-2xl text-xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all">
                        Crear Cuenta Gratis
                        <span className="material-symbols-outlined">person_add</span>
                    </a>
                </div>
            </section>
        </PublicLayout>
    );
};

export default Home;

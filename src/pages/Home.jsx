import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

const Home = () => {
    return (
        <PublicLayout>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-24 sm:py-32">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(243,176,18,0.08)_0%,transparent_100%)]"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto space-y-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3b012]/10 border border-[#f3b012]/20 animate-fade-in-up">
                            <span className="w-2 h-2 rounded-full bg-[#f3b012] animate-pulse"></span>
                            <span className="text-xs font-bold text-[#f3b012] uppercase tracking-widest">Estándar Oro en Certificación Pesada</span>
                        </div>

                        <h1 className="text-5xl sm:text-7xl font-black text-[#000000] dark:text-white tracking-tight leading-[1.1]">
                            Lidera la Industria con <span className="text-[#f3b012]">Maquinaria Pro</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                            La plataforma definitiva para la formación técnica y certificación oficial EMAQ. Potenciamos tu carrera con tecnología de simulación avanzada y currículo especializado.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                            <a href="/register" className="w-full sm:w-auto px-10 py-5 bg-[#f3b012] text-black rounded-2xl text-lg font-bold shadow-2xl shadow-[#f3b012]/30 hover:scale-105 active:scale-95 transition-all">
                                Empezar Certificación
                            </a>
                            <a href="/courses" className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-white/5 text-[#000000] dark:text-white rounded-2xl text-lg font-bold border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-all">
                                Explorar Cursos
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features/Stats Section from design */}
            <section className="py-24 bg-white dark:bg-[#000000]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="p-8 rounded-3xl bg-[#ffffff] dark:bg-white/5 space-y-4 border border-gray-100">
                            <div className="w-16 h-16 bg-[#f3b012]/10 rounded-2xl flex items-center justify-center text-[#f3b012] mx-auto">
                                <span className="material-symbols-outlined text-3xl">verified_user</span>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white text-black">Certificación Oficial</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Validación avalada por EMAQ reconocida globalmente en el sector.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#ffffff] dark:bg-white/5 space-y-4 border border-gray-100">
                            <div className="w-16 h-16 bg-[#000000]/5 rounded-2xl flex items-center justify-center text-[#000000] mx-auto">
                                <span className="material-symbols-outlined text-3xl">construction</span>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white text-black">Capacitación Real</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Módulos prácticos diseñados por expertos en maquinaria pesada.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#ffffff] dark:bg-white/5 space-y-4 border border-gray-100">
                            <div className="w-16 h-16 bg-[#f3b012]/10 rounded-2xl flex items-center justify-center text-[#f3b012] mx-auto">
                                <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white text-black">Seguridad Anti-Fraude</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Sistema de verificación QR único para cada certificado.</p>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

export default Home;

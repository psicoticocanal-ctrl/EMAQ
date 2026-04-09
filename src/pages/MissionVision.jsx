import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

const MissionVision = () => {
    return (
        <PublicLayout>
            <section className="relative py-24 overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(243,176,18,0.05)_0%,transparent_100%)]"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20 space-y-4">
                        <h1 className="text-5xl font-black text-black">Nuestra <span className="text-[#f3b012]">Identidad</span></h1>
                        <p className="text-gray-600 max-w-2xl mx-auto font-medium">Comprometidos con la excelencia técnica y el desarrollo industrial de Colombia.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Misión */}
                        <div className="group p-12 rounded-[40px] bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 hover:border-[#f3b012]/30 transition-all flex flex-col h-full">
                            <div className="w-20 h-20 bg-[#f3b012]/10 rounded-3xl flex items-center justify-center text-[#f3b012] mb-8 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-4xl">engineering</span>
                            </div>
                            <h2 className="text-3xl font-black text-black mb-6">Nuestra Misión</h2>
                            <p className="text-gray-600 text-lg leading-relaxed font-medium">
                                Certificar operadores mediante procesos rigurosos de evaluación teórica y práctica, asegurando estándares de seguridad, eficiencia y responsabilidad, que fortalezcan la confianza de las empresas y la empleabilidad de los operadores.
                            </p>
                            <div className="mt-auto pt-8 flex items-center gap-2 text-[#f3b012] font-bold">
                                <span className="w-10 h-1 bg-[#f3b012] rounded-full"></span>
                                SEGURIDAD Y EMPLEABILIDAD
                            </div>
                        </div>

                        {/* Visión */}
                        <div className="group p-12 rounded-[40px] bg-black text-white shadow-2xl shadow-black/20 hover:scale-[1.02] transition-all flex flex-col h-full">
                            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-[#f3b012] mb-8 group-hover:rotate-12 transition-transform">
                                <span className="material-symbols-outlined text-4xl">auto_graph</span>
                            </div>
                            <h2 className="text-3xl font-black mb-6 italic">Nuestra Visión</h2>
                            <p className="text-gray-300 text-lg leading-relaxed font-medium">
                                Ser la empresa líder en certificación de operadores de maquinaria, reconocida por la excelencia, confiabilidad y aporte a la seguridad y productividad del sector industrial y de la construcción. Transformar la industria mediante la certificación de operadores altamente competentes, elevando los niveles de seguridad, eficiencia y desarrollo sostenible.
                            </p>
                            <div className="mt-auto pt-8 flex items-center gap-2 text-[#f3b012] font-bold">
                                <span className="w-10 h-1 bg-[#f3b012] rounded-full"></span>
                                LIDERAZGO Y TRANSFORMACIÓN
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Image Showcase */}
                    <div className="mt-20 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="h-80 rounded-[32px] overflow-hidden shadow-xl relative group col-span-1 md:col-span-2">
                                <img src="/imagenes/EVALUACION OPERACION EXCAVADORA.jpg.jpeg" alt="Evaluación Excavadora" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-black/30 flex items-end p-8">
                                    <span className="text-white font-bold text-lg">Excelencia en Operación</span>
                                </div>
                            </div>
                            <div className="h-80 rounded-[32px] overflow-hidden shadow-xl relative group">
                                <img src="/imagenes/CABINA DE CARGADOR FRONTAL.jpg.jpeg" alt="Cabina Cargador" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-black/30 flex items-end p-8">
                                    <span className="text-white font-bold text-lg">Tecnología de Punta</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="h-64 rounded-[24px] overflow-hidden shadow-lg group">
                                <img src="/imagenes/REALIZANDO PREOPERACIONAL.jpg.jpeg" alt="Seguridad" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="h-64 rounded-[24px] overflow-hidden shadow-lg group">
                                <img src="/imagenes/EXCAVACION Y PERFILACION DE TALUDES.jpg.jpeg" alt="Taludes" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="h-64 rounded-[24px] overflow-hidden shadow-lg group">
                                <img src="/imagenes/Instalacion de tuberias capacitacion.jpg.jpeg" alt="Obras" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="h-64 rounded-[24px] overflow-hidden shadow-lg group text-center bg-[#f3b012] flex flex-col items-center justify-center p-6">
                                <span className="material-symbols-outlined text-4xl text-black mb-2">verified</span>
                                <h4 className="text-black font-black text-sm">100% PRÁCTICO</h4>
                                <p className="text-black/60 text-xs mt-2 font-bold">Certificación que abre puertas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

export default MissionVision;

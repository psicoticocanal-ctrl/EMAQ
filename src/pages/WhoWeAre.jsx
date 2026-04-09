import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

const WhoWeAre = () => {
    return (
        <PublicLayout>
            <section className="relative py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Hero Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                        <div className="space-y-8">
                            <div className="inline-block px-4 py-1 rounded-full bg-[#f3b012]/10 text-[#f3b012] font-black text-xs tracking-widest uppercase">
                                Sobre Nosotros
                            </div>
                            <h1 className="text-5xl sm:text-6xl font-black text-black leading-tight">
                                Expertos en Certificación de <span className="text-[#f3b012]">Maquinaria</span>
                            </h1>
                            <p className="text-xl text-gray-600 leading-relaxed font-medium">
                                Somos una empresa especializada en la evaluación y certificación de operadores de maquinaria pesada, enfocada en verificar competencias, seguridad y eficiencia en la operación de equipos. Contamos con personal técnico calificado y aplicamos criterios normativos y operativos que garantizan evaluaciones confiables, contribuyendo a operaciones más seguras y productivas.
                            </p>
                            <div className="flex items-center gap-8 py-4">
                                <div>
                                    <div className="text-3xl font-black text-black">+500</div>
                                    <div className="text-gray-500 text-sm font-bold">Operadores Certificados</div>
                                </div>
                                <div className="w-px h-12 bg-gray-200"></div>
                                <div>
                                    <div className="text-3xl font-black text-black">100%</div>
                                    <div className="text-gray-500 text-sm font-bold">Prácticas Reales</div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#f3b012]/20 rounded-full blur-3xl -z-10"></div>
                            <div className="rounded-[40px] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
                                <img src="/imagenes/GALERIA9.jpg.jpeg" alt="Equipo EMAQ" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    {/* What we do */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                        <div className="p-10 rounded-[40px] bg-gray-50 border border-gray-100 space-y-4">
                            <h3 className="text-2xl font-black text-black">Nuestro ADN</h3>
                            <p className="text-gray-600 font-medium">No solo enseñamos a mover una palanca; formamos especialistas capaces de realizar pre-operacionales de seguridad, mantenimiento preventivo y optimización de carga.</p>
                        </div>
                        <div className="p-10 rounded-[40px] bg-[#f3b012] space-y-4">
                            <h3 className="text-2xl font-black text-black italic">Especialidad CAT</h3>
                            <p className="text-black/80 font-bold">Nuestros programas están diseñados bajo los más altos estándares de maquinaria Caterpillar, asegurando que nuestros alumnos operen las máquinas más utilizadas en el mundo.</p>
                        </div>
                        <div className="p-10 rounded-[40px] bg-black text-white space-y-4">
                            <h3 className="text-2xl font-black text-[#f3b012]">Alcance Nacional</h3>
                            <p className="text-gray-400 font-medium">Desde la excavación profunda hasta la perfilación de taludes, EMAQ es el aliado estratégico de las principales constructoras y mineras de Colombia.</p>
                        </div>
                    </div>

                    {/* Gallery Grid */}
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-black text-center mb-12">Nuestra labor en <span className="text-[#f3b012]">Imágenes</span></h2>
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                            <div className="rounded-3xl overflow-hidden shadow-lg">
                                <img src="/imagenes/20191104_064718.jpg.jpeg" alt="Entrenamiento" className="w-full object-cover" />
                            </div>
                            <div className="rounded-3xl overflow-hidden shadow-lg">
                                <img src="/imagenes/20191104_065105.jpg (1).jpeg" alt="Entrenamiento" className="w-full object-cover" />
                            </div>
                            <div className="rounded-3xl overflow-hidden shadow-lg">
                                <img src="/imagenes/pruebas de operacion y conocimiento.jpg.jpeg" alt="Examen" className="w-full object-cover" />
                            </div>
                            <div className="rounded-3xl overflow-hidden shadow-lg">
                                <img src="/imagenes/galeria (2).jpg.jpeg" alt="Campo" className="w-full object-cover" />
                            </div>
                            <div className="rounded-3xl overflow-hidden shadow-lg">
                                <img src="/imagenes/EVALUACION.jpg.jpeg" alt="Evaluación" className="w-full object-cover" />
                            </div>
                            <div className="rounded-3xl overflow-hidden shadow-lg">
                                <img src="/imagenes/20191108_131524.jpg.jpeg" alt="Práctica" className="w-full object-cover" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

export default WhoWeAre;

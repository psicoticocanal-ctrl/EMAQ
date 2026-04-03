import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-[#000000] border-t border-gray-200 dark:border-gray-800 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#f3b012] rounded-lg flex items-center justify-center text-black">
                                <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                            </div>
                            <span className="text-lg font-black tracking-tighter text-[#000000] dark:text-white">EMAQ</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            Líderes en certificación y capacitación de operadores de maquinaria pesada. Transformando la industria con estándares de excelencia.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-widest">Plataforma</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Cursos</a></li>
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Certificaciones</a></li>
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Empresas</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-widest">Soporte</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Documentación</a></li>
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Verificación</a></li>
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Contacto</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-widest">Legal</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Privacidad</a></li>
                            <li><a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#f3b012] transition-colors">Términos</a></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500">© 2024 EMAQ MachineryPro. Todos los derechos reservados.</p>
                    <div className="flex gap-6">
                        <span className="material-symbols-outlined text-gray-400 hover:text-gray-600 cursor-pointer text-xl">language</span>
                        <span className="material-symbols-outlined text-gray-400 hover:text-gray-600 cursor-pointer text-xl">shield_person</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

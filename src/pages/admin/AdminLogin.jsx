import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const AdminLogin = () => {
    const { signIn, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    if (!loading && user) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { error } = await signIn({ email: formData.email, password: formData.password });
            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            setError('Credenciales incorrectas o cuenta no autorizada como Administrador.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex">
            {/* Right form panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex items-center gap-3 mb-8">
                        <img src="/logo.png" alt="EMAQ Logo" className="h-12 w-auto object-contain bg-white rounded-lg p-1" />
                        <span className="text-white font-black text-xl uppercase">EMAQ Pro</span>
                    </div>

                    <div>
                        <p className="text-xs font-black text-[#f3b012] uppercase tracking-widest mb-2">Panel Empresa</p>
                        <h2 className="text-3xl font-black text-white">Acceso Administrador</h2>
                        <p className="text-gray-500 mt-1 font-medium">Gestiona tu empresa y empleados desde aquí</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-start">
                            <span className="material-symbols-outlined text-red-400 text-sm mt-0.5">error</span>
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Correo Empresarial</label>
                            <input
                                required type="email" placeholder="admin@tuempresa.com"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-700 bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-bold text-gray-300">Contraseña</label>
                                <a href="#" className="text-xs font-bold text-[#f3b012]">¿Olvidaste tu contraseña?</a>
                            </div>
                            <input
                                required type="password" placeholder="••••••••"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-700 bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <button
                            disabled={loading} type="submit"
                            className="w-full py-4 bg-[#f3b012] text-black rounded-2xl font-black text-lg shadow-lg shadow-[#f3b012]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <><span className="animate-spin material-symbols-outlined text-sm">refresh</span> Verificando...</> : 'Ingresar al Panel'}
                        </button>
                    </form>

                    <div className="text-center pt-4 border-t border-gray-800">
                        <p className="text-sm text-gray-500">
                            ¿Primera vez? <Link to="/admin/register" className="text-[#f3b012] font-bold hover:underline">Registra tu empresa</Link>
                        </p>
                        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-600">
                            <Link to="/login" className="hover:text-gray-400 transition-colors">← Portal Trabajador</Link>
                            <Link to="/superadmin/login" className="hover:text-gray-400 transition-colors">Super Admin →</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right brand panel */}
            <div className="hidden lg:flex w-1/2 bg-[#f3b012] flex-col justify-between p-16">
                <Link to="/" className="flex items-center gap-3 mb-8 group">
                    <img src="/logo.png" alt="EMAQ Logo" className="h-12 w-auto object-contain bg-white rounded-lg p-1 transition-transform group-hover:scale-105" />
                    <span className="text-white font-black text-xl uppercase tracking-tight">EMAQ Pro</span>
                </Link>
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/10 border border-black/20">
                        <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                        <span className="text-xs font-bold text-black uppercase tracking-widest">Panel de Empresa</span>
                    </div>
                    <h1 className="text-5xl font-black text-black leading-tight">
                        Gestiona<br />tu equipo<br />completo.
                    </h1>
                    <p className="text-black/60 text-lg">Controla el progreso, certificaciones y formación de todos los operadores de tu empresa.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/10 rounded-2xl">
                        <p className="text-black font-black text-xl">↑ 24%</p>
                        <p className="text-black/60 text-xs mt-1">Productividad Promedio</p>
                    </div>
                    <div className="p-4 bg-black/10 rounded-2xl">
                        <p className="text-black font-black text-xl">100%</p>
                        <p className="text-black/60 text-xs mt-1">Trazabilidad</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;

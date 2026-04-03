import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const WorkerLogin = () => {
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
            setError(err.message === 'Email not confirmed'
                ? 'Correo no confirmado. Contacta a tu administrador.'
                : 'Credenciales incorrectas. Verifica tu correo y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left brand panel */}
            <div className="hidden lg:flex w-1/2 bg-black flex-col justify-between p-16">
                <Link to="/" className="flex items-center gap-3 group">
                    <img src="/logo.png" alt="EMAQ Logo" className="h-12 w-auto object-contain bg-white rounded-lg p-1 transition-transform group-hover:scale-105" />
                    <span className="text-white font-black text-xl tracking-tight uppercase">EMAQ Pro</span>
                </Link>
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3b012]/10 border border-[#f3b012]/20">
                        <span className="w-2 h-2 rounded-full bg-[#f3b012] animate-pulse"></span>
                        <span className="text-xs font-bold text-[#f3b012] uppercase tracking-widest">Portal del Operador</span>
                    </div>
                    <h1 className="text-5xl font-black text-white leading-tight">
                        Certifícate.<br /><span className="text-[#f3b012]">Avanza.</span>
                    </h1>
                    <p className="text-gray-400 text-lg">Accede a tus cursos de maquinaria pesada y obtén tus certificaciones oficiales EMAQ.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#f3b012]/10 flex items-center justify-center text-[#f3b012]">
                        <span className="material-symbols-outlined">verified_user</span>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Certificaciones Reconocidas</p>
                        <p className="text-gray-500 text-xs">Avaladas por la industria internacional</p>
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex items-center gap-3 lg:hidden mb-8">
                        <img src="/logo.png" alt="EMAQ Logo" className="h-10 w-auto object-contain" />
                        <span className="text-black font-black text-xl uppercase">EMAQ Pro</span>
                    </div>

                    <div>
                        <p className="text-xs font-black text-[#f3b012] uppercase tracking-widest mb-2">Portal Trabajador</p>
                        <h2 className="text-3xl font-black text-black">Bienvenido de vuelta</h2>
                        <p className="text-gray-500 mt-1 font-medium">Ingresa tus credenciales para continuar</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start">
                            <span className="material-symbols-outlined text-red-500 text-sm mt-0.5">error</span>
                            <p className="text-red-600 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-black">Correo Electrónico</label>
                            <input
                                required type="email"
                                placeholder="tu@correo.com"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-bold text-black">Contraseña</label>
                                <a href="#" className="text-xs font-bold text-[#f3b012]">¿Olvidaste tu contraseña?</a>
                            </div>
                            <input
                                required type="password"
                                placeholder="••••••••"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <button
                            disabled={loading} type="submit"
                            className="w-full py-4 bg-[#f3b012] text-black rounded-2xl font-black text-lg shadow-lg shadow-[#f3b012]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <><span className="animate-spin material-symbols-outlined text-sm">refresh</span> Entrando...</> : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="text-center pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            ¿No tienes cuenta? <Link to="/register" className="text-[#f3b012] font-bold hover:underline">Regístrate aquí</Link>
                        </p>
                        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
                            <Link to="/admin/login" className="hover:text-black transition-colors">Admin Empresa →</Link>
                            <Link to="/superadmin/login" className="hover:text-black transition-colors">Super Admin →</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkerLogin;

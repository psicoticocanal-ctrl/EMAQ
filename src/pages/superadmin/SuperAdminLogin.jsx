import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const SuperAdminLogin = () => {
    const { signIn, user, profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', accessCode: '' });
    const [error, setError] = useState('');

    if (!loading && user && profile?.role === 'super_admin') return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validación del código de acceso interno
        if (formData.accessCode !== 'EMAQ-INTERNAL-2024') {
            setError('Código de acceso interno incorrecto. Contacta al equipo técnico.');
            setLoading(false);
            return;
        }

        try {
            const { data: signInData, error: signInErr } = await signIn({ email: formData.email, password: formData.password });
            if (signInErr) throw signInErr;

            // Fetch profile role directly to verify
            const { data: prof, error: profErr } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', signInData.user.id)
                .single();

            if (profErr || !prof) {
                await supabase.auth.signOut();
                throw new Error('No se pudo obtener el rol del usuario.');
            }

            if (prof.role !== 'super_admin') {
                await supabase.auth.signOut();
                throw new Error('Esta cuenta no está registrada como Super Administrador.');
            }

            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#f3b012] rounded-full opacity-[0.04] blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f3b012] rounded-full opacity-[0.06] blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

            <div className="w-full max-w-lg relative">
                <div className="text-center mb-10">
                    <img src="/logo.png" alt="EMAQ Logo" className="h-24 w-auto object-contain mx-auto mb-6 bg-white rounded-3xl p-3 shadow-2xl" />
                    <p className="text-xs font-black text-[#f3b012] uppercase tracking-widest mb-2">Sistema Maestro EMAQ</p>
                    <h1 className="text-4xl font-black text-white">Acceso Super Admin</h1>
                    <p className="text-gray-600 mt-2 font-medium">Área de acceso restringido. Solo personal autorizado.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-start">
                            <span className="material-symbols-outlined text-red-400 text-sm mt-0.5">error</span>
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="p-4 bg-[#f3b012]/5 border border-[#f3b012]/10 rounded-2xl flex gap-3 items-center">
                        <span className="material-symbols-outlined text-[#f3b012] text-xl">lock</span>
                        <p className="text-gray-400 text-xs font-medium">Esta área está protegida y limitada a administradores del sistema EMAQ.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Correo del Sistema</label>
                            <input
                                required type="email" placeholder="superadmin@emaq.com"
                                className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Contraseña Maestra</label>
                            <input
                                required type="password" placeholder="••••••••••••"
                                className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        {/* Nuevo campo: Código de Acceso Interno */}
                        <div className="space-y-2">
                            <label className="text-sm font-black text-[#f3b012] flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">vpn_key</span>
                                Código de Acceso Maestro
                            </label>
                            <input
                                required type="password" placeholder="Código de activación"
                                className="w-full px-5 py-4 rounded-2xl border border-[#f3b012]/30 bg-[#f3b012]/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.accessCode}
                                onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                            />
                        </div>

                        <button
                            disabled={loading} type="submit"
                            className="w-full py-4 bg-[#f3b012] text-black rounded-2xl font-black text-lg shadow-xl shadow-[#f3b012]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <><span className="animate-spin material-symbols-outlined text-sm">refresh</span> Autenticando...</> : 'Entrar al Sistema Maestro'}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6 flex justify-center gap-6 text-xs text-gray-700">
                    <Link to="/login" className="hover:text-gray-400 transition-colors">← Portal Trabajador</Link>
                    <Link to="/admin/login" className="hover:text-gray-400 transition-colors">← Portal Empresa</Link>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminLogin;

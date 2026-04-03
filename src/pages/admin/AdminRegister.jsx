import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const AdminRegister = () => {
    const { register, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', companyName: '', companyCode: '' });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    if (!loading && user) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden. Por favor verifícalas.');
            return;
        }
        if (formData.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await register({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                companyCode: formData.companyCode,
                companyName: formData.companyName,
                role: 'admin'
            });
            if (error) throw error;
            navigate('/admin/login');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex">
            {/* Left form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-md space-y-6 py-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f3b012] rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-black text-xl">corporate_fare</span>
                        </div>
                        <span className="text-white font-black text-xl">EMAQ Pro</span>
                    </div>

                    <div>
                        <p className="text-xs font-black text-[#f3b012] uppercase tracking-widest mb-2">Panel Empresa</p>
                        <h2 className="text-3xl font-black text-white">Registra tu Empresa</h2>
                        <p className="text-gray-500 mt-1 font-medium">Crea la cuenta de administrador para tu organización</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-start">
                            <span className="material-symbols-outlined text-red-400 text-sm mt-0.5">error</span>
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Nombre del Responsable</label>
                            <input required type="text" placeholder="Ej. María García"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-700 bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>

                        {/* Company Name + Code */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300">Nombre Empresa</label>
                                <input required type="text" placeholder="Mi Empresa S.A."
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-700 bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300">Código Empresa</label>
                                <input required type="text" placeholder="EMP-001"
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-700 bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                    value={formData.companyCode}
                                    onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Correo Empresarial</label>
                            <input required type="email" placeholder="admin@tuempresa.com"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-700 bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Contraseña</label>
                            <div className="relative">
                                <input required type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                                    className="w-full px-5 py-4 pr-14 rounded-2xl border border-gray-700 bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#f3b012] transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Confirmar Contraseña</label>
                            <div className="relative">
                                <input required type={showConfirm ? 'text' : 'password'} placeholder="Repite tu contraseña"
                                    className={`w-full px-5 py-4 pr-14 rounded-2xl border bg-white/5 text-white placeholder:text-gray-600 focus:ring-2 outline-none transition-all ${formData.confirmPassword && formData.password !== formData.confirmPassword
                                        ? 'border-red-500/50 focus:ring-red-500/20'
                                        : formData.confirmPassword && formData.password === formData.confirmPassword
                                            ? 'border-emerald-500/50 focus:ring-emerald-500/20'
                                            : 'border-gray-700 focus:ring-[#f3b012]/30 focus:border-[#f3b012]'
                                        }`}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                                <button type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#f3b012] transition-colors"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                >
                                    <span className="material-symbols-outlined text-xl">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                                </button>
                                {formData.confirmPassword && (
                                    <div className={`absolute right-12 top-1/2 -translate-y-1/2 ${formData.password === formData.confirmPassword ? 'text-emerald-500' : 'text-red-400'}`}>
                                        <span className="material-symbols-outlined text-xl">
                                            {formData.password === formData.confirmPassword ? 'check_circle' : 'cancel'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-xs text-red-400 font-medium ml-1">Las contraseñas no coinciden</p>
                            )}
                        </div>

                        <button disabled={loading} type="submit"
                            className="w-full py-4 bg-[#f3b012] text-black rounded-2xl font-black text-lg shadow-lg shadow-[#f3b012]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading
                                ? <><span className="animate-spin material-symbols-outlined text-sm">refresh</span> Registrando...</>
                                : 'Registrar Empresa'}
                        </button>
                    </form>

                    <div className="text-center pt-4 border-t border-gray-800">
                        <p className="text-sm text-gray-500">
                            ¿Ya tienes cuenta? <Link to="/admin/login" className="text-[#f3b012] font-bold hover:underline">Inicia Sesión</Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right brand panel */}
            <div className="hidden lg:flex w-1/2 bg-[#f3b012] flex-col justify-between p-16">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#f3b012] text-xl">corporate_fare</span>
                    </div>
                    <span className="text-black font-black text-xl tracking-tight">Empresa</span>
                </div>
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/10 border border-black/20">
                        <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                        <span className="text-xs font-bold text-black uppercase tracking-widest">Registro Empresarial</span>
                    </div>
                    <h1 className="text-5xl font-black text-black leading-tight">
                        Digitaliza<br />tu empresa<br />hoy.
                    </h1>
                    <ul className="space-y-3">
                        {['Gestión centralizada de operadores', 'Certificaciones en tiempo real', 'Panel de analítica avanzada', 'Soporte EMAQ dedicado'].map(f => (
                            <li key={f} className="flex items-center gap-3 text-black/70 font-semibold">
                                <span className="material-symbols-outlined text-black text-sm">check_circle</span>
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>
                <div></div>
            </div>
        </div>
    );
};

export default AdminRegister;

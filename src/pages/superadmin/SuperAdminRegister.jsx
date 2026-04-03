import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const SuperAdminRegister = () => {
    const { register, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', accessCode: '' });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showAccessCode, setShowAccessCode] = useState(false);

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

        // Security gate: require internal access code
        if (formData.accessCode !== 'EMAQ-INTERNAL-2024') {
            setError('Código de acceso interno incorrecto. Contacta al equipo EMAQ.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await register({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                employeeId: 'SA-' + Date.now(),
                companyCode: 'EMAQ-HQ',
                role: 'super_admin'
            });
            if (error) throw error;
            navigate('/superadmin/login');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#f3b012] rounded-full opacity-[0.04] blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-lg relative">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-[#f3b012] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#f3b012]/40">
                        <span className="material-symbols-outlined text-black text-4xl">admin_panel_settings</span>
                    </div>
                    <p className="text-xs font-black text-[#f3b012] uppercase tracking-widest mb-2">Sistema Maestro EMAQ</p>
                    <h1 className="text-4xl font-black text-white">Crear Super Admin</h1>
                    <p className="text-gray-600 mt-2 font-medium">Registro de nivel maestro. Requiere código de acceso interno.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm space-y-5">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-start">
                            <span className="material-symbols-outlined text-red-400 text-sm mt-0.5">error</span>
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Nombre Completo</label>
                            <input required type="text" placeholder="Administrador EMAQ"
                                className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Correo del Sistema</label>
                            <input required type="email" placeholder="superadmin@emaq.com"
                                className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Contraseña Maestra</label>
                            <div className="relative">
                                <input required type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                                    className="w-full px-5 py-4 pr-14 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
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
                                    className={`w-full px-5 py-4 pr-14 rounded-2xl border bg-white/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 outline-none transition-all ${formData.confirmPassword && formData.password !== formData.confirmPassword
                                        ? 'border-red-500/50 focus:border-red-500'
                                        : formData.confirmPassword && formData.password === formData.confirmPassword
                                            ? 'border-emerald-500/50 focus:border-emerald-500'
                                            : 'border-white/10 focus:border-[#f3b012]'
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
                                {/* Match indicator */}
                                {formData.confirmPassword && (
                                    <div className={`absolute right-12 top-1/2 -translate-y-1/2 text-sm ${formData.password === formData.confirmPassword ? 'text-emerald-500' : 'text-red-400'}`}>
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

                        {/* Access Code */}
                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-black text-[#f3b012] flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">key</span>
                                Código de Acceso Interno EMAQ
                            </label>
                            <div className="relative">
                                <input required type={showAccessCode ? 'text' : 'password'} placeholder="Código secreto de activación"
                                    className="w-full px-5 py-4 pr-14 rounded-2xl border border-[#f3b012]/30 bg-[#f3b012]/5 text-white placeholder:text-gray-700 focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all"
                                    value={formData.accessCode}
                                    onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                                />
                                <button type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#f3b012] transition-colors"
                                    onClick={() => setShowAccessCode(!showAccessCode)}
                                >
                                    <span className="material-symbols-outlined text-xl">{showAccessCode ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <button disabled={loading} type="submit"
                            className="w-full py-4 bg-[#f3b012] text-black rounded-2xl font-black text-lg shadow-xl shadow-[#f3b012]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading
                                ? <><span className="animate-spin material-symbols-outlined text-sm">refresh</span> Procesando...</>
                                : 'Registrar Super Admin'}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6 text-xs text-gray-700">
                    <Link to="/superadmin/login" className="hover:text-gray-400 transition-colors">← Volver al Login de Super Admin</Link>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminRegister;

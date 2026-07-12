import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const WorkerRegister = () => {
    const { register, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', employeeId: '', companyCode: '' });
    const [error, setError] = useState('');

    if (!loading && user) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden. Por favor verifica.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { error } = await register({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                employeeId: formData.employeeId,
                companyCode: formData.companyCode,
                role: 'worker'
            });
            if (error) throw error;
            navigate('/login');
        } catch (err) {
            let msg = err.message || 'Error al registrarse. Inténtalo de nuevo.';
            if (msg.includes('profiles_employee_id_key') || (msg.toLowerCase().includes('duplicate key') && msg.toLowerCase().includes('employee_id'))) {
                msg = 'El documento ingresado ya está registrado para otro usuario. Por favor verifica el número o inicia sesión.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <div className="hidden lg:flex w-1/2 bg-black flex-col justify-between p-16">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f3b012] rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-black text-xl">construction</span>
                    </div>
                    <span className="text-white font-black text-xl tracking-tight">EMAQ Pro</span>
                </div>
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3b012]/10 border border-[#f3b012]/20">
                        <span className="w-2 h-2 rounded-full bg-[#f3b012] animate-pulse"></span>
                        <span className="text-xs font-bold text-[#f3b012] uppercase tracking-widest">Registro de Operador</span>
                    </div>
                    <h1 className="text-5xl font-black text-white leading-tight">
                        Tu carrera,<br /><span className="text-[#f3b012]">certificada.</span>
                    </h1>
                    <p className="text-gray-400 text-lg">Únete a miles de operadores que ya obtuvieron su certificación oficial con EMAQ.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl">
                        <p className="text-[#f3b012] font-black text-xl">+8,500</p>
                        <p className="text-gray-400 text-xs mt-1">Operadores Certificados</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl">
                        <p className="text-[#f3b012] font-black text-xl">45+</p>
                        <p className="text-gray-400 text-xs mt-1">Cursos especializados</p>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex items-center gap-3 lg:hidden mb-8">
                        <div className="w-10 h-10 bg-[#f3b012] rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-black text-xl">construction</span>
                        </div>
                        <span className="text-black font-black text-xl">EMAQ Pro</span>
                    </div>

                    <div>
                        <p className="text-xs font-black text-[#f3b012] uppercase tracking-widest mb-2">Portal Trabajador</p>
                        <h2 className="text-3xl font-black text-black">Crea tu cuenta</h2>
                        <p className="text-gray-500 mt-1 font-medium">Regístrate para empezar tu certificación</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start">
                            <span className="material-symbols-outlined text-red-500 text-sm mt-0.5">error</span>
                            <p className="text-red-600 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-black">Nombre Completo</label>
                            <input required type="text" placeholder="Ej. Juan Pérez"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-black">documento_empleado</label>
                                <input required type="text" placeholder="Ej. 1012442033"
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-black">Cód. Empresa</label>
                                <input type="text" placeholder="Opcional"
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                    value={formData.companyCode}
                                    onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-black">Correo Electrónico</label>
                            <input required type="email" placeholder="tu@correo.com"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-black">Contraseña</label>
                            <div className="relative">
                                <input required type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                                    className="w-full px-5 py-4 pr-12 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-black">Confirmar Contraseña</label>
                            <div className="relative">
                                <input required type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirma tu contraseña"
                                    className="w-full px-5 py-4 pr-12 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#f3b012]/30 focus:border-[#f3b012] outline-none transition-all text-black"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <button disabled={loading} type="submit"
                            className="w-full py-4 bg-[#f3b012] text-black rounded-2xl font-black text-lg shadow-lg shadow-[#f3b012]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <><span className="animate-spin material-symbols-outlined text-sm">refresh</span> Registrando...</> : 'Crear Cuenta'}
                        </button>
                    </form>

                    <div className="text-center pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            ¿Ya tienes cuenta? <Link to="/login" className="text-[#f3b012] font-bold hover:underline">Inicia Sesión</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkerRegister;

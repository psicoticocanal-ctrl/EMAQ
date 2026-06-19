import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Register = () => {
    const { register, user } = useAuth();
    const navigate = useNavigate();

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        employeeId: '',
        companyCode: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            alert('Las contraseñas no coinciden. Por favor verifica.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await register({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                employeeId: formData.employeeId,
                companyCode: formData.companyCode,
                role: 'worker' // Por defecto registramos como trabajador
            });
            if (error) throw error;
            alert('¡Registro exitoso! Ya puedes iniciar sesión con tu nueva cuenta.');
            navigate('/login');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 space-y-6 border border-gray-100">
                <div className="text-center">
                    <img src="/logo.png" alt="EMAQ Logo" className="h-20 w-auto object-contain mx-auto mb-4 bg-white rounded-2xl p-2 shadow-sm border border-gray-100" />
                    <h2 className="text-3xl font-black text-[#000000]">Crea tu cuenta</h2>
                    <p className="text-gray-500 font-medium">Únete a la nueva era de certificación pesada</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#000000] ml-1 text-gray-700">Nombre Completo</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej. Juan Pérez"
                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#f3b012]/10 focus:border-[#f3b012] outline-none transition-all"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[#000000] ml-1 text-gray-700">Documento Empleado</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. 1012442033"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#f3b012]/10 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[#000000] ml-1 text-gray-700">Cód. Empresa</label>
                            <input
                                type="text"
                                placeholder="Opcional"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#f3b012]/10 focus:border-[#f3b012] outline-none transition-all"
                                value={formData.companyCode}
                                onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#000000] ml-1 text-gray-700">Correo Electrónico</label>
                        <input
                            required
                            type="email"
                            placeholder="tu@correo.com"
                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#f3b012]/10 focus:border-[#f3b012] outline-none transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#000000] ml-1 text-gray-700">Contraseña</label>
                        <div className="relative">
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="w-full px-5 py-4 pr-12 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#f3b012]/10 focus:border-[#f3b012] outline-none transition-all"
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
                        <label className="text-sm font-bold text-[#000000] ml-1 text-gray-700">Confirmar Contraseña</label>
                        <div className="relative">
                            <input
                                required
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="w-full px-5 py-4 pr-12 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#f3b012]/10 focus:border-[#f3b012] outline-none transition-all"
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

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full py-5 bg-[#f3b012] text-black rounded-2xl text-lg font-bold shadow-xl shadow-[#f3b012]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Registrando...' : 'Registrarme'}
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">
                        ¿Ya tienes cuenta? <Link to="/login" className="text-[#f3b012] font-bold">Inicia Sesión</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;

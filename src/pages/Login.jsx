import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';

const Login = () => {
    const { signIn, user } = useAuth();
    const navigate = useNavigate();

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await signIn({
                email: formData.email,
                password: formData.password
            });
            if (error) throw error;
            navigate('/');
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 space-y-6 border border-gray-100">
                <div className="text-center">
                    <img src="/logo.png" alt="EMAQ Logo" className="h-20 w-auto object-contain mx-auto mb-4 bg-white rounded-2xl p-2 shadow-sm border border-gray-100" />
                    <h2 className="text-3xl font-black text-[#000000]">Bienvenido</h2>
                    <p className="text-gray-500 font-medium">Accede a tu panel de certificación</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-sm font-bold text-[#000000] text-gray-700">Contraseña</label>
                            <a href="#" className="text-xs font-bold text-[#f3b012]">¿Olvidaste tu contraseña?</a>
                        </div>
                        <input
                            required
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#f3b012]/10 focus:border-[#f3b012] outline-none transition-all"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full py-5 bg-[#f3b012] text-black rounded-2xl text-lg font-bold shadow-xl shadow-[#f3b012]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">
                        ¿No tienes cuenta? <Link to="/register" className="text-[#f3b012] font-bold">Crea tu cuenta gratis</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

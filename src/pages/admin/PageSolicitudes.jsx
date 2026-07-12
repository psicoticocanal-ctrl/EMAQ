import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const PageSolicitudes = () => {
    const { profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState(null);

    useEffect(() => {
        if (profile) {
            if (profile.company_id) {
                loadRequests();
            } else {
                setLoading(false);
            }
        }
    }, [profile]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            // Fetch notifications of request types for this company
            const { data, error } = await supabase
                .from('notifications')
                .select('*, profiles:sender_id(id, full_name, employee_id, email)')
                .eq('company_id', profile?.company_id)
                .in('type', ['quiz_attempt_request', 'exam_attempt_request', 'certificate_request'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (e) {
            console.error('Error loading requests:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    // Release Certificate Download Limit
    const handleApproveCertificate = async (req) => {
        setActioningId(req.id);
        try {
            // Find certificate of this worker in this company
            const { data: certs } = await supabase
                .from('certificates')
                .select('id, course_id, courses(title)')
                .eq('user_id', req.sender_id);

            if (!certs || certs.length === 0) {
                alert('No se encontraron certificados activos para este usuario.');
                return;
            }

            const matchingCert = certs.find(c => req.message.includes(c.courses?.title)) || certs[0];

            const { error } = await supabase
                .from('certificates')
                .update({ 
                    download_count: 0,
                    requested_manually: false 
                })
                .eq('id', matchingCert.id);

            if (error) throw error;

            // Send notification to worker
            await supabase.from('notifications').insert({
                user_id: req.sender_id,
                company_id: profile?.company_id,
                title: 'Certificado Habilitado',
                message: `El administrador ha restablecido tus límites de descarga para el certificado del curso: ${matchingCert.courses?.title || 'Curso'}. Ya puedes descargarlo.`,
                type: 'info'
            });

            await handleMarkAsRead(req.id);
            alert('Límite de descargas de certificado restablecido con éxito.');
        } catch (e) {
            console.error(e);
            alert('Error al aprobar la solicitud.');
        } finally {
            setActioningId(null);
        }
    };

    // Authorize complete Course/Module Reset
    const handleAuthorizeReset = async (req) => {
        setActioningId(req.id);
        try {
            // Find courses for this company
            const { data: courses } = await supabase
                .from('courses')
                .select('id, title')
                .eq('company_id', profile?.company_id);

            const matchingCourse = courses?.find(c => req.message.includes(c.title)) || { id: null, title: 'Curso' };

            const { error } = await supabase
                .from('course_assignments')
                .update({ reset_permitted: true })
                .eq('worker_id', req.sender_id)
                .eq('course_id', matchingCourse.id);

            if (error) throw error;

            // Send notification to worker
            await supabase.from('notifications').insert({
                user_id: req.sender_id,
                company_id: profile?.company_id,
                title: 'Reinicio Autorizado',
                message: `El administrador ha autorizado el reinicio del curso: "${matchingCourse.title}". Ya puedes restablecer todo tu progreso desde tu panel de estudio.`,
                type: 'info'
            });

            await handleMarkAsRead(req.id);
            alert('Reinicio de curso autorizado con éxito.');
        } catch (e) {
            console.error(e);
            alert('Error al autorizar el reinicio.');
        } finally {
            setActioningId(null);
        }
    };

    if (!profile?.company_id) {
        return (
            <div className="p-4 lg:p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                    <span className="material-symbols-outlined text-6xl text-gray-200 mb-4 font-light">apartment</span>
                    <h3 className="text-gray-900 font-bold mb-1">Empresa no vinculada</h3>
                    <p className="text-gray-400 text-sm">Tu cuenta de administrador no tiene asociada una empresa. Por favor, asocia o crea una empresa primero.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-gray-900 text-xl font-black">Solicitudes de Trabajadores</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-0.5">Gestión de soporte e intentos</p>
                </div>
                <span className="bg-[#f3b012] text-black text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
                    {requests.length} PENDIENTES
                </span>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400">Cargando solicitudes...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-200">
                        <span className="material-symbols-outlined text-4xl font-light">notifications_active</span>
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">No hay solicitudes pendientes</h3>
                    <p className="text-gray-400 text-sm">Los trabajadores de tu empresa no tienen solicitudes de soporte pendientes.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(r => (
                        <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-blue-200 transition-all">
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    r.type === 'certificate_request' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                    <span className="material-symbols-outlined text-xl">
                                        {r.type === 'certificate_request' ? 'workspace_premium' : 'sync'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wide">
                                        {r.type === 'certificate_request' ? 'Solicitud de Certificado' : 'Intentos Agotados / Solicitud de Reinicio'}
                                    </p>
                                    <h4 className="text-sm font-black text-black">
                                        {r.profiles?.full_name || 'Trabajador'} <span className="text-gray-400 font-medium text-xs font-mono">({r.profiles?.employee_id || 'Sin ID'})</span>
                                    </h4>
                                    <p className="text-gray-600 text-xs leading-relaxed max-w-xl">{r.message}</p>
                                    <span className="text-[10px] text-gray-400 block pt-1">
                                        Recibida: {new Date(r.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                <button
                                    onClick={() => handleMarkAsRead(r.id)}
                                    className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold rounded-xl transition-colors"
                                >
                                    Rechazar / Archivar
                                </button>
                                {r.type === 'certificate_request' ? (
                                    <button
                                        onClick={() => handleApproveCertificate(r)}
                                        disabled={actioningId === r.id}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        Habilitar Descarga
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAuthorizeReset(r)}
                                        disabled={actioningId === r.id}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        Autorizar Reinicio de Curso
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PageSolicitudes;

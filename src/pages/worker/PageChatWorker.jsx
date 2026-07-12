import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const PageChatWorker = () => {
    const { profile } = useAuth();
    const [workerCompanyId, setWorkerCompanyId] = useState(null);
    const [admin, setAdmin] = useState(null);
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (profile?.id) {
            loadChatMeta();
        }
    }, [profile?.id]);

    useEffect(() => {
        if (admin) {
            loadMessages();
            const interval = setInterval(loadMessages, 4000);
            return () => clearInterval(interval);
        }
    }, [admin?.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChatMeta = async () => {
        setLoading(true);
        try {
            // Find company_id from worker_companies
            const { data: wComps, error: wCompsErr } = await supabase
                .from('worker_companies')
                .select('company_id')
                .eq('worker_id', profile.id)
                .limit(1);

            if (wCompsErr) throw wCompsErr;
            if (!wComps || wComps.length === 0) {
                setWorkerCompanyId(null);
                setLoading(false);
                return;
            }

            const companyId = wComps[0].company_id;
            setWorkerCompanyId(companyId);

            // Find company admin
            const { data: admins, error: adminErr } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('company_id', companyId)
                .eq('role', 'admin')
                .limit(1);

            if (adminErr) throw adminErr;
            if (admins && admins.length > 0) {
                setAdmin(admins[0]);
            }

            // Find courses assigned to worker (via course_assignments)
            const { data: assignments, error: courseErr } = await supabase
                .from('course_assignments')
                .select('course_id, courses(id, title, course_code)')
                .eq('worker_id', profile?.id);

            if (courseErr) throw courseErr;
            
            const coursesList = assignments?.map(a => a.courses).filter(Boolean) || [];
            setCourses(coursesList);
        } catch (e) {
            console.error('Error loading worker chat meta:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async () => {
        if (!admin) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${admin.id}),and(sender_id.eq.${admin.id},receiver_id.eq.${profile?.id})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);

            // Mark received messages as read
            const unreadIds = (data || [])
                .filter(m => m.sender_id === admin.id && !m.is_read)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadIds);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Determine if the conversation is active (not closed)
    const lastMessage = messages[messages.length - 1];
    const isChatClosed = lastMessage?.is_closed || lastMessage?.message === '[CONVERSATION_CLOSED]' || lastMessage?.message?.includes('ha cerrado esta conversación');
    const hasActiveChat = messages.length > 0 && !isChatClosed;

    // Get current course associated with active chat
    const activeCourseId = messages.find(m => m.course_id)?.course_id;
    const activeCourse = courses.find(c => c.id === activeCourseId);

    const handleStartConversation = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedCourseId || !admin || sending) return;
        setSending(true);
        try {
            const selectedCourse = courses.find(c => c.id === selectedCourseId);
            const initialMsg = `[CONSULTA INICIAL] Curso: ${selectedCourse?.title} (${selectedCourse?.course_code})\n\n${newMessage.trim()}`;

            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: profile?.id,
                    receiver_id: admin.id,
                    message: initialMsg,
                    course_id: selectedCourseId,
                    is_closed: false,
                    is_read: false
                });

            if (error) throw error;
            setNewMessage('');
            setSelectedCourseId('');
            await loadMessages();
        } catch (e) {
            console.error(e);
            alert('Error al iniciar la conversación.');
        } finally {
            setSending(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !admin || sending || isChatClosed) return;
        setSending(true);
        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: profile?.id,
                    receiver_id: admin.id,
                    message: newMessage.trim(),
                    course_id: activeCourseId || null,
                    is_closed: false,
                    is_read: false
                });

            if (error) throw error;
            setNewMessage('');
            await loadMessages();
        } catch (e) {
            console.error(e);
            alert('Error al enviar el mensaje.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 opacity-50 bg-white">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-gray-400">Iniciando chat de soporte...</p>
            </div>
        );
    }

    if (!workerCompanyId) {
        return (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span className="material-symbols-outlined text-6xl text-gray-200 mb-4 font-light">apartment</span>
                <h3 className="text-gray-900 font-black">Empresa no vinculada</h3>
                <p className="text-gray-400 text-xs max-w-xs mt-1 leading-relaxed">Por favor, únete a una empresa en la pestaña "Empresas" para poder chatear con tu administrador.</p>
            </div>
        );
    }

    if (!admin) {
        return (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-white">
                <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">forum</span>
                <h3 className="text-gray-900 font-black">Chat no disponible</h3>
                <p className="text-gray-400 text-xs max-w-xs mt-1">No se ha encontrado un administrador registrado para tu empresa todavía.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-80px)] bg-slate-50" style={{ fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${hasActiveChat ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'} inline-block`} />
                        Soporte Administrativo
                    </h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Contacto: {admin.full_name}</p>
                </div>
                {hasActiveChat && activeCourse && (
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black px-2.5 py-1 rounded-xl">
                        Curso: {activeCourse.title} ({activeCourse.course_code})
                    </span>
                )}
            </div>

            {/* If no active chat, render start conversation form */}
            {!hasActiveChat ? (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                    <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 p-6 shadow-xl space-y-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <span className="material-symbols-outlined text-2xl">chat</span>
                            </div>
                            <h4 className="text-gray-950 font-black text-base">Iniciar Consulta de Soporte</h4>
                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                                {isChatClosed 
                                    ? 'La conversación anterior fue cerrada. Vincula un curso para iniciar una nueva consulta.'
                                    : 'Para comunicarte con el administrador, selecciona un curso de tu plan de estudios.'}
                            </p>
                        </div>

                        <form onSubmit={handleStartConversation} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Selecciona el Curso</label>
                                <select
                                    required
                                    value={selectedCourseId}
                                    onChange={e => setSelectedCourseId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">-- Elige el curso vinculado --</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} ({c.course_code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Detalla tu Consulta</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Describe tu duda o problema con el curso aquí..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-400"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedCourseId || !newMessage.trim() || sending}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-base">send</span>
                                {sending ? 'Iniciando...' : 'Iniciar Conversación'}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <>
                    {/* Active Chat History */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map(m => {
                            const isMe = m.sender_id === profile?.id;
                            const date = new Date(m.created_at);
                            const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm ${
                                        isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                                    }`}>
                                        <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{m.message}</p>
                                        <p className={`text-[8px] text-right mt-1.5 ${isMe ? 'text-blue-100/80' : 'text-gray-400'}`}>
                                            {timeStr}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Active Chat Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2 shadow-sm">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-xl">send</span>
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};

export default PageChatWorker;

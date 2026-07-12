import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const PageChat = () => {
    const { profile } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [messages, setMessages] = useState([]);
    const [courses, setCourses] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingWorkers, setLoadingWorkers] = useState(true);
    const [sending, setSending] = useState(false);
    const [closing, setClosing] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (profile) {
            if (profile.company_id) {
                loadWorkersAndCourses();
            } else {
                setLoadingWorkers(false);
            }
        }
    }, [profile]);

    useEffect(() => {
        if (selectedWorker) {
            loadMessages();
            const interval = setInterval(loadMessages, 4000);
            return () => clearInterval(interval);
        }
    }, [selectedWorker?.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadWorkersAndCourses = async () => {
        setLoadingWorkers(true);
        console.log('loadWorkersAndCourses starting. Profile:', profile);
        try {
            // Find worker IDs linked to this company
            console.log('Fetching worker_companies for company_id:', profile?.company_id);
            const { data: wComps, error: wCompsErr } = await supabase
                .from('worker_companies')
                .select('worker_id')
                .eq('company_id', profile?.company_id);

            if (wCompsErr) throw wCompsErr;
            console.log('wComps result:', wComps);

            const workerIds = wComps?.map(wc => wc.worker_id) || [];
            console.log('Worker IDs mapped:', workerIds);
            
            let workersData = [];
            if (workerIds.length > 0) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, employee_id')
                    .in('id', workerIds)
                    .order('full_name', { ascending: true });
                if (error) throw error;
                workersData = data || [];
            }
            console.log('Workers data loaded:', workersData);

            const { data: coursesData, error: coursesErr } = await supabase
                .from('courses')
                .select('id, title, course_code')
                .eq('company_id', profile?.company_id);

            if (coursesErr) throw coursesErr;
            console.log('Courses loaded:', coursesData);

            setWorkers(workersData);
            setCourses(coursesData || []);
        } catch (e) {
            console.error('Error loading chat meta:', e);
        } finally {
            setLoadingWorkers(false);
        }
    };

    const loadMessages = async () => {
        if (!selectedWorker) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${selectedWorker.id}),and(sender_id.eq.${selectedWorker.id},receiver_id.eq.${profile?.id})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);

            // Mark received messages as read
            const unreadIds = (data || [])
                .filter(m => m.sender_id === selectedWorker.id && !m.is_read)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadIds);
            }
        } catch (e) {
            console.error('Error loading messages:', e);
        }
    };

    // Determine if the active chat is closed
    const lastMessage = messages[messages.length - 1];
    const isChatClosed = lastMessage?.is_closed || lastMessage?.message === '[CONVERSATION_CLOSED]' || lastMessage?.message?.includes('ha cerrado esta conversación');
    const hasAdminReplied = messages.some(m => m.sender_id === profile?.id);
    const isPendingAcceptance = messages.length > 0 && !hasAdminReplied && !isChatClosed;

    const handleAcceptConversation = async () => {
        if (!selectedWorker || sending) return;
        setSending(true);
        try {
            const activeCourseId = messages.find(m => m.course_id)?.course_id || null;
            const systemAcceptMsg = `[SISTEMA]: El administrador ha aceptado tu consulta y está revisando tu caso.`;

            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: profile?.id,
                    receiver_id: selectedWorker.id,
                    message: systemAcceptMsg,
                    course_id: activeCourseId,
                    is_closed: false,
                    is_read: false
                });

            if (error) throw error;
            await loadMessages();
        } catch (e) {
            console.error(e);
            alert('Error al aceptar la conversación.');
        } finally {
            setSending(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedWorker || sending) return;
        setSending(true);
        try {
            // Find active course id linked in current conversation if exists
            const activeCourseId = messages.find(m => m.course_id)?.course_id || null;

            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: profile?.id,
                    receiver_id: selectedWorker.id,
                    message: newMessage.trim(),
                    course_id: activeCourseId,
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

    const handleCloseConversation = async () => {
        if (!selectedWorker || closing) return;
        if (!window.confirm('¿Estás seguro de que deseas cerrar esta conversación? El trabajador no podrá escribir más mensajes hasta iniciar una nueva consulta.')) return;
        setClosing(true);
        try {
            const activeCourseId = messages.find(m => m.course_id)?.course_id || null;
            const closeText = 'El administrador ha cerrado esta conversación. Si tienes más consultas, inicia un nuevo chat vinculando un curso.';

            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: profile?.id,
                    receiver_id: selectedWorker.id,
                    message: closeText,
                    course_id: activeCourseId,
                    is_closed: true,
                    is_read: false
                });

            if (error) throw error;
            await loadMessages();
        } catch (e) {
            console.error(e);
            alert('Error al cerrar la conversación.');
        } finally {
            setClosing(false);
        }
    };

    if (!profile?.company_id) {
        return (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span className="material-symbols-outlined text-6xl text-gray-200 mb-4 font-light">apartment</span>
                <h3 className="text-gray-900 font-black">Empresa no vinculada</h3>
                <p className="text-gray-400 text-xs max-w-xs mt-1 leading-relaxed">Tu cuenta de administrador no tiene asociada una empresa. Por favor, asocia o crea una empresa primero.</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-80px)] bg-gray-50 rounded-3xl overflow-hidden border border-gray-200 shadow-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            
            {/* Workers Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <h3 className="text-gray-900 font-black text-base">Conversaciones</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Chat de Soporte Técnico</p>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {loadingWorkers ? (
                        <div className="p-10 text-center text-gray-400 text-xs font-bold">Cargando contactos...</div>
                    ) : workers.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-xs font-medium">No hay trabajadores en tu empresa.</div>
                    ) : (
                        workers.map(w => {
                            const isSel = selectedWorker?.id === w.id;
                            return (
                                <button
                                    key={w.id}
                                    onClick={() => setSelectedWorker(w)}
                                    className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${isSel ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${isSel ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {w.full_name?.charAt(0).toUpperCase() || 'W'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-gray-900 truncate">{w.full_name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{w.job_title || 'Operador'}</p>
                                        <p className="text-[9px] font-mono text-gray-400 truncate">{w.employee_id || 'Sin ID'}</p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-50">
                {selectedWorker ? (
                    <>
                        {/* Selected Header */}
                        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                                    {selectedWorker.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">{selectedWorker.full_name}</h4>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {isChatClosed ? 'Conversación Cerrada' : 'Conversación Activa'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Close Conversation Button */}
                            {!isChatClosed && messages.length > 0 && (
                                <button
                                    onClick={handleCloseConversation}
                                    disabled={closing}
                                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm font-black">lock_open</span>
                                    Cerrar Chat
                                </button>
                            )}
                        </div>

                        {/* Message History */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <span className="material-symbols-outlined text-5xl text-gray-300 mb-2">chat_bubble_outline</span>
                                    <p className="text-xs font-bold text-gray-400">Sin conversación activa con {selectedWorker.full_name}</p>
                                    <p className="text-[10px] text-gray-400 max-w-xs mt-1">El chat se iniciará una vez que el trabajador mande una consulta vinculada a un curso.</p>
                                </div>
                            ) : (
                                messages.map(m => {
                                    const isMe = m.sender_id === profile?.id;
                                    const date = new Date(m.created_at);
                                    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                    const matchingCourse = m.course_id ? courses.find(c => c.id === m.course_id) : null;
                                    const isSystemClosedMsg = m.is_closed || m.message.includes('ha cerrado esta conversación');

                                    return (
                                        <div key={m.id} className={`flex ${isSystemClosedMsg ? 'justify-center my-3' : isMe ? 'justify-end' : 'justify-start'}`}>
                                            {isSystemClosedMsg ? (
                                                <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-black px-4 py-2 rounded-2xl max-w-xs text-center shadow-inner">
                                                    🔒 Conversación Finalizada por el Admin
                                                </div>
                                            ) : (
                                                <div className={`max-w-[70%] rounded-2xl p-3.5 shadow-sm ${
                                                    isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                                                }`}>
                                                    {matchingCourse && m.message.includes('[CONSULTA INICIAL]') && (
                                                        <div className={`text-[9px] font-black uppercase tracking-wider mb-1.5 px-2 py-0.5 rounded-md inline-block ${
                                                            isMe ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                        }`}>
                                                            Curso: {matchingCourse.title} ({matchingCourse.course_code})
                                                        </div>
                                                    )}
                                                    <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{m.message}</p>
                                                    <p className={`text-[8px] text-right mt-1.5 ${isMe ? 'text-blue-100/80' : 'text-gray-400'}`}>
                                                        {timeStr}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input form or Accept banner */}
                        {isPendingAcceptance ? (
                            <div className="p-4 bg-amber-50 border-t border-amber-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-inner">
                                <div className="text-left">
                                    <p className="text-xs font-black text-amber-800 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm animate-bounce">warning</span>
                                        Nueva Consulta Pendiente
                                    </p>
                                    <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">Debes aceptar esta conversación antes de poder responderle al trabajador.</p>
                                </div>
                                <button
                                    onClick={handleAcceptConversation}
                                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-sm font-black">forum</span>
                                    Aceptar Consulta
                                </button>
                            </div>
                        ) : !isChatClosed && messages.length > 0 ? (
                            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2 shadow-sm">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje de respuesta..."
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
                        ) : (
                            <div className="p-4 bg-gray-100 border-t border-gray-200 text-center text-xs font-bold text-gray-500 shadow-inner">
                                {messages.length === 0 ? 'Esperando inicio de consulta por parte del trabajador' : 'Conversación cerrada por el administrador'}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-6">
                        <span className="material-symbols-outlined text-7xl text-gray-200 mb-4 font-light">chat</span>
                        <h3 className="text-gray-950 font-black">Bandeja de Entrada</h3>
                        <p className="text-xs font-semibold text-gray-400 max-w-xs mt-1">Selecciona a un operador de la lista lateral para chatear y asistirle en sus evaluaciones.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageChat;

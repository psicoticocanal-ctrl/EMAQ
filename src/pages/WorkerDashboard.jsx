import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import CourseViewer from './worker/CourseViewer';
import PageChatWorker from './worker/PageChatWorker';
import { getWorkerAssignments } from '../lib/assignmentService';
import { getWorkerCertificates } from '../lib/certificateService';
import { calcCourseProgress } from '../lib/progressService';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getNotifications, markAsRead, notifyCompanyOnEntry, notifyCompanyOnCertificateRequest } from '../lib/notificationService';

const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // Beautiful synthesized chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.error('AudioContext play failed:', e);
    }
};

/* ─── Helpers ─── */
const CATEGORY_ICONS = {
    'Maquinaria Pesada': { icon: 'construction', cls: 'bg-blue-50 text-blue-600' },
    'Seguridad': { icon: 'security', cls: 'bg-red-50 text-red-500' },
    'Mantenimiento': { icon: 'settings_input_component', cls: 'bg-green-50 text-green-600' },
    'Liderazgo': { icon: 'groups', cls: 'bg-purple-50 text-purple-600' },
};
const getCourseIcon = (cat) => CATEGORY_ICONS[cat] || { icon: 'school', cls: 'bg-gray-100 text-gray-500' };

const StatusBadge = ({ label, variant = 'blue' }) => {
    const V = { blue: 'bg-blue-50 text-blue-600', gray: 'bg-gray-100 text-gray-500', green: 'bg-green-50 text-green-600', orange: 'bg-orange-50 text-orange-500', red: 'bg-red-50 text-red-500' };
    return <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${V[variant]}`}>{label}</span>;
};

/* ─── Live Certificate Preview ─── */
const CertPreview = React.forwardRef(({ fields, workerName = null, certCodeWorker = null, pdfMode = false }, ref) => {
    const s = pdfMode ? {
        wrap: { width: '1920px', height: '1080px', padding: '56px 120px', borderRadius: 0 },
        company: { fontSize: '36px', letterSpacing: '12px' },
        subtitle: { fontSize: '22px', letterSpacing: '6px' },
        name: { fontSize: '96px' },
        body: { fontSize: '24px', letterSpacing: '4px' },
        course: { fontSize: '62px' },
        footerLabel: { fontSize: '22px' },
        footerValue: { fontSize: '18px' },
        codeLabel: { fontSize: '16px' },
        codeValue: { fontSize: '22px' },
        cornerSize: '80px', cornerBorder: '4px solid #c9a227',
        divider: { width: '120px', height: '3px' },
        nameDivider: { width: '500px', height: '2px' },
        footerLine: { width: '280px', height: '2px' },
        sigImg: { height: '100px', maxWidth: '260px' },
    } : {
        wrap: { width: '100%', aspectRatio: '16/9', padding: '5%', borderRadius: '20px' },
        company: { fontSize: 'clamp(8px,1vw,13px)', letterSpacing: '6px' },
        subtitle: { fontSize: 'clamp(6px,0.8vw,10px)', letterSpacing: '3px' },
        name: { fontSize: 'clamp(20px,3.5vw,42px)' },
        body: { fontSize: 'clamp(6px,0.85vw,11px)', letterSpacing: '2px' },
        course: { fontSize: 'clamp(11px,1.8vw,20px)' },
        footerLabel: { fontSize: 'clamp(6px,0.8vw,10px)' },
        footerValue: { fontSize: 'clamp(6px,0.75vw,9px)' },
        codeLabel: { fontSize: 'clamp(4px,0.65vw,8px)' },
        codeValue: { fontSize: 'clamp(6px,0.8vw,10px)' },
        cornerSize: '36px', cornerBorder: '2px solid #c9a227',
        divider: { width: '44px', height: '2px' },
    };

    return (
        <div ref={ref} style={{
            ...s.wrap,
            background: 'linear-gradient(180deg, #ffffff 0%, #fffdec 60%, #fef9d9 100%)',
            border: pdfMode ? 'none' : '1.5px solid #e5e0d0',
            boxShadow: pdfMode ? 'none' : '0 4px 32px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{ position: 'absolute', inset: pdfMode ? '14px' : '10px', border: `${pdfMode ? '2px' : '1.5px'} solid #c9a227`, borderRadius: pdfMode ? '6px' : '10px', pointerEvents: 'none' }} />
            {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
                <div key={v + h} style={{
                    position: 'absolute', [v]: pdfMode ? '6px' : '4px', [h]: pdfMode ? '6px' : '4px',
                    width: s.cornerSize, height: s.cornerSize,
                    [`border${v[0].toUpperCase() + v.slice(1)}`]: s.cornerBorder,
                    [`border${h[0].toUpperCase() + h.slice(1)}`]: s.cornerBorder,
                    borderRadius: v === 'top' && h === 'left' ? '8px 0 0 0' : v === 'top' ? '0 8px 0 0' : h === 'left' ? '0 0 0 8px' : '0 0 8px 0',
                }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,#c9a22706 0px,#c9a22706 1px,transparent 1px,transparent 36px)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: pdfMode ? '20px' : '3%', position: 'relative', zIndex: 1 }}>
                <img 
                    src="/imagenes/LOGO_EMAQ_TRANSPARENT.png" 
                    alt="EMAQ Logo" 
                    crossOrigin="anonymous"
                    style={{ 
                        height: pdfMode ? '160px' : 'clamp(50px, 7.5vw, 105px)', 
                        objectFit: 'contain', 
                        marginBottom: pdfMode ? '12px' : '3px' 
                    }} 
                />
                <div style={{ ...s.divider, background: 'linear-gradient(90deg,transparent,#c9a227,transparent)', margin: pdfMode ? '0 auto 10px' : '0 auto 3px' }} />
                <p style={{ color: '#888', ...s.subtitle, textTransform: 'uppercase', fontWeight: '800' }}>
                    {(fields.customTitle || '').split('|||max_downloads:')[0] || 'CERTIFICA QUE'}
                </p>
            </div>

            {/* Worker name */}
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: pdfMode ? '18px' : '2%', position: 'relative', zIndex: 1 }}>
                <div>
                    <h1 style={{ color: '#1a1a2e', ...s.name, fontWeight: '700', fontStyle: 'italic', lineHeight: 1.1, marginBottom: pdfMode ? '24px' : '1.5%' }}>
                        {workerName || 'Nombre del Trabajador'}
                    </h1>
                    <div style={{ width: pdfMode ? '500px' : '100px', height: '1px', background: 'linear-gradient(90deg,transparent,#c9a227,transparent)', margin: '0 auto' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: pdfMode ? '12px' : '4px', maxWidth: '85%', margin: '0 auto' }}>
                    <p style={{ color: '#555', ...s.body, textTransform: 'uppercase', fontWeight: '700', lineHeight: 1.4 }}>
                        ASISTIÓ Y DEMOSTRÓ SUS COMPETENCIAS CON UNA INTENSIDAD HORARIA DE 60 HORAS TEÓRICO - PRÁCTICAS EN LA OPERACIÓN DE LOS SIGUIENTES EQUIPOS Y TERMINANDO SATISFACTORIAMENTE EL CURSO REALIZADO:
                    </p>
                    <h2 style={{ color: '#c9a227', ...s.course, fontWeight: '900', textTransform: 'uppercase', lineHeight: 1.2 }}>
                        {fields.courseName || 'TITULO DEL CURSO'}
                    </h2>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', marginBottom: pdfMode ? '25px' : '3.5%', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'left' }}>
                    <p style={{ color: '#999', ...s.codeLabel, textTransform: 'uppercase', fontWeight: '900', marginBottom: '4px' }}>Código de Verificación</p>
                    <code style={{ color: '#1a1a2e', ...s.codeValue, fontWeight: '900', background: '#f5f5f5', padding: '4px 12px', borderRadius: '4px' }}>{certCodeWorker || 'VERIF-CODE-000'}</code>
                </div>
                <div style={{ textAlign: 'center' }}>
                    {fields.signatureUrl && <img src={fields.signatureUrl} crossOrigin="anonymous" alt="Firma" style={s.sigImg} />}
                    <div style={{ width: pdfMode ? '300px' : '140px', height: '1.5px', background: '#e0e0e0', margin: '8px auto' }} />
                    <p style={{ color: '#1a1a2e', ...s.footerLabel, fontWeight: '900' }}>{fields.signatoryName || 'Responsable'}</p>
                    <p style={{ color: '#999', ...s.footerValue }}>{fields.signatoryTitle || 'Gerencia'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#1a1a2e', ...s.footerLabel, fontWeight: '700' }}>{fields.issueDate || '—'}</p>
                    <p style={{ color: '#999', ...s.footerValue }}>Fecha de emisión</p>
                </div>
            </div>

            {/* Resolution Text */}
            <div style={{ 
                position: 'absolute', 
                bottom: pdfMode ? '35px' : '3.5%', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                textAlign: 'center', 
                width: '100%',
                zIndex: 2 
            }}>
                <p style={{ 
                    color: '#777', 
                    fontSize: pdfMode ? '14px' : 'clamp(5px, 0.75vw, 10px)', 
                    fontWeight: '800', 
                    letterSpacing: '1.5px', 
                    textTransform: 'uppercase',
                    margin: 0
                }}>
                    RESOLUCIÓN 2888 DE 2007 DECRETO 4904 DE 2009 DEL MEN
                </p>
            </div>
        </div>
    );
});

/* ─── Course card ─── */
const CourseCard = ({ course, progress, onClick }) => {
    if (!course) return null;
    const { icon, cls } = getCourseIcon(course.category);
    const isComplete = progress === 100;
    const isNew = progress === 0;
    return (
        <div onClick={onClick} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer active:scale-95">
            <div className="flex justify-between items-start">
                <div className={`${cls} p-2.5 rounded-xl`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
                <StatusBadge
                    label={isComplete ? 'COMPLETADO' : isNew ? 'PENDIENTE' : 'EN CURSO'}
                    variant={isComplete ? 'green' : isNew ? 'gray' : 'blue'}
                />
            </div>
            <div>
                <h3 className="text-gray-900 font-bold text-sm leading-tight">{course.title}</h3>
                <p className="text-gray-400 text-xs mt-1">
                    {course.category || 'Curso'}{course.job_role ? ` · ${course.job_role}` : ''}{course.duration ? ` · ${course.duration}` : ''}
                </p>
            </div>
            {!isNew && !isComplete && (
                <div className="rounded-full bg-gray-100 h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
            )}
        </div>
    );
};

/* ─── MODAL: Completar Perfil ─── */
const UpdateProfileModal = ({ profile, isOpen, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        id_type: profile?.id_type || '',
        employee_id: profile?.employee_id || '',
        contact_number: profile?.contact_number || '',
        birth_date: profile?.birth_date || '',
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onUpdate(formData);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="bg-[#f3b012] p-6 text-black flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black">Completar Datos</h2>
                        <p className="text-sm font-bold opacity-80">Información esencial para tus certificados</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                        <input required type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#f3b012] focus:bg-white transition-all font-medium" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tipo de ID</label>
                            <select required value={formData.id_type} onChange={e => setFormData({ ...formData, id_type: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#f3b012] focus:bg-white transition-all font-medium">
                                <option value="">Seleccionar...</option>
                                <option value="Cédula de Ciudadanía">Cédula de Ciudadanía</option>
                                <option value="Pasaporte Extranjero">Pasaporte Extranjero</option>
                                <option value="PEP">PEP</option>
                                <option value="NIT">NIT</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Número (Cédula)</label>
                            <input required type="text" value={formData.employee_id} onChange={e => setFormData({ ...formData, employee_id: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#f3b012] focus:bg-white transition-all font-medium font-mono" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Contacto</label>
                            <input required type="tel" value={formData.contact_number} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#f3b012] focus:bg-white transition-all font-medium" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nacimiento</label>
                            <input required type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#f3b012] focus:bg-white transition-all font-medium" />
                        </div>
                    </div>
                    <button disabled={loading} type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-2">
                        {loading ? 'Guardando...' : 'Guardar Información'}
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ─── PAGE: Inicio ─── */
const PageInicio = ({ profile, assignments = [], certs = [], loadingCourses, onCourseClick, onCompleteData }) => {
    const safeAssignments = Array.isArray(assignments) ? assignments : [];
    const totalModules = safeAssignments.reduce((s, a) => s + (a.courses?.modules?.length || 0), 0);
    const doneModules = safeAssignments.reduce((s, a) => s + (a.courses?.modules?.filter(m => m.progress?.[0]?.status === 'completed').length || 0), 0);
    const overallPct = totalModules ? Math.round((doneModules / totalModules) * 100) : 0;
    const activeCourses = safeAssignments.slice(0, 3);
    const latestCerts = certs.slice(0, 2);

    const isProfileComplete = profile?.full_name && profile?.id_type && profile?.employee_id && profile?.contact_number && profile?.birth_date;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-5">
                {/* Worker Identity Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden group transition-all hover:shadow-2xl hover:border-blue-100">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white">
                                <span className="material-symbols-outlined text-4xl font-light">account_circle</span>
                            </div>
                            <div>
                                <h2 className="text-white text-xl font-black tracking-tight">{profile?.full_name || 'Trabajador'}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">{profile?.role}</span>
                                    <span className="text-white/60 text-xs font-bold">{profile?.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                            {[
                                { label: 'Identificación', val: profile?.employee_id || 'Sin definir', icon: 'badge' },
                                { label: 'Tipo de ID', val: profile?.id_type || 'Sin definir', icon: 'list_alt' },
                                { label: 'Cód. Vinculación', val: profile?.company_code || 'EMAQ-IND', icon: 'apartment', clr: 'text-[#f3b012]' },
                                { label: 'Contacto', val: profile?.contact_number || 'Sin definir', icon: 'call' },
                                { label: 'Nacimiento', val: profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString() : 'Sin definir', icon: 'cake' }
                            ].map(f => (
                                <div key={f.label} className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-gray-400 text-sm">{f.icon}</span>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{f.label}</p>
                                    </div>
                                    <p className={`text-sm font-bold ${f.clr || 'text-gray-900'}`}>{f.val}</p>
                                </div>
                            ))}
                        </div>

                        {!isProfileComplete && (
                            <button
                                onClick={onCompleteData}
                                className="w-full flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-2xl group/btn hover:bg-orange-100 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-sm">priority_high</span>
                                    </div>
                                    <p className="text-xs font-bold text-orange-900">Tu perfil está incompleto</p>
                                </div>
                                <span className="material-symbols-outlined text-orange-500 font-black group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Card */}
                {totalModules > 0 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[#f3b012] text-[10px] font-black tracking-[0.2em] uppercase mb-1">Tu Ruta de Aprendizaje</p>
                                    <h2 className="text-gray-900 text-2xl font-black">Progreso General</h2>
                                </div>
                                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                                    <span className="material-symbols-outlined">trending_up</span>
                                </div>
                            </div>
                            <div className="flex items-end gap-3 mb-4">
                                <span className="text-5xl font-black text-blue-600 tracking-tighter">{overallPct}%</span>
                                <div className="pb-1.5">
                                    <p className="text-gray-900 font-bold text-sm leading-none">{doneModules} / {totalModules}</p>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Módulos Logrados</p>
                                </div>
                            </div>
                            <div className="h-4 bg-gray-100 rounded-2xl overflow-hidden shadow-inner p-1">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl transition-all duration-1000 ease-out" style={{ width: `${overallPct}%` }} />
                            </div>
                        </div>
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -z-0" />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-6">
                {/* Courses Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 text-lg font-black">Cursos por Completar</h2>
                        <Link to="/dashboard/cursos" className="text-blue-600 text-[10px] font-black uppercase tracking-wider hover:underline">Ver todos</Link>
                    </div>
                    {loadingCourses ? (
                        <div className="flex items-center justify-center py-10 opacity-30">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : activeCourses.length === 0 ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
                            <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">auto_stories</span>
                            <p className="text-gray-400 text-sm font-bold">No tienes inscripciones activas</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {activeCourses.map(a => {
                                const modules = a.courses?.modules || [];
                                const pct = calcCourseProgress(modules.map(m => m.progress?.[0]).filter(Boolean), modules.length);
                                return (
                                    <div key={a.id} className="relative group">
                                        <CourseCard course={a.courses} progress={pct} onClick={() => onCourseClick(a.courses)} />
                                        <div className="absolute left-4 -bottom-1 flex gap-2">
                                            <span className="bg-[#f3b012] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ring-2 ring-white">Cód: {a.courses?.course_code}</span>
                                            <span className="bg-gray-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ring-2 ring-white uppercase truncate max-w-[100px]">{a.courses?.companies?.name || 'EMAQ'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Certificates Shortcut */}
                <div>
                    <h2 className="text-gray-900 text-lg font-black mb-4">Certificados Logrados</h2>
                    {latestCerts.length > 0 ? (
                        <div className="space-y-3">
                            {latestCerts.map(c => (
                                <Link to="/dashboard/certificados" key={c.id} className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-4 flex items-center justify-between group hover:scale-[1.01] transition-all shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#f3b012] text-black rounded-xl flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined">workspace_premium</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm truncate max-w-[150px]">{c.courses?.title}</p>
                                            <p className="text-gray-400 text-[10px] font-black uppercase">Click para descargar</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-white/30 group-hover:text-[#f3b012] transition-colors">download</span>
                                </Link>
                            ))}
                            <Link to="/dashboard/certificados" className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">
                                <span className="material-symbols-outlined text-base">visibility</span>
                                Ver y descargar todos
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm">
                            <p className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest opacity-60">Logros Vacíos</p>
                            <Link to="/dashboard/cursos" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                                Comenzar ahora
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


/* ─── PAGE: Cursos ─── */
const PageCursos = ({ assignments, loadingCourses, onCourseClick, onJoinCourse, joiningCourse }) => {
    const [courseCode, setCourseCode] = useState('');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-gray-900 text-xl font-black">Mis Cursos</h2>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded-full">{assignments.length} CURSOS ACTIVOS</span>
            </div>

            {/* Course Activation Card */}
            <div className="bg-gradient-to-br from-[#f3b012] to-orange-500 rounded-3xl p-6 text-black shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[100px]">add_task</span>
                </div>
                <div className="relative z-10">
                    <h3 className="text-xl font-black mb-1">Activar Nuevo Curso</h3>
                    <p className="text-sm font-bold opacity-80 mb-4">Ingresa el código proporcionado por tu empresa para desbloquear el contenido.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={courseCode}
                            onChange={e => setCourseCode(e.target.value)}
                            placeholder="CÓDIGO-CURSO-EMAQ"
                            className="flex-1 bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-black/50 font-black focus:bg-white transition-all shadow-inner"
                        />
                        <button
                            onClick={() => { onJoinCourse(courseCode); setCourseCode(''); }}
                            disabled={joiningCourse || !courseCode}
                            className="bg-black text-white px-6 py-3 rounded-2xl text-sm font-black disabled:opacity-50 hover:bg-gray-900 active:scale-95 transition-all shadow-lg"
                        >
                            {joiningCourse ? '...' : 'Activar'}
                        </button>
                    </div>
                </div>
            </div>

            {loadingCourses ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-30">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-bold animate-pulse">CARGANDO TUS CAPACITACIONES...</p>
                </div>
            ) : assignments.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                    <span className="material-symbols-outlined text-gray-200 text-6xl mb-4">school</span>
                    <p className="text-gray-400 font-bold">Activa tu primer curso con el código que te dio tu empresa.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {assignments.map(a => {
                        const modules = a.courses?.modules || [];
                        const pct = calcCourseProgress(modules.map(m => m.progress?.[0]).filter(Boolean), modules.length);
                        return (
                            <div key={a.id} className="relative group flex flex-col">
                                <CourseCard course={a.courses} progress={pct} onClick={() => onCourseClick(a.courses)} />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-blue-100 shadow-sm flex items-center gap-1.5 z-10 transition-all group-hover:scale-105">
                                    <div className={`w-1.5 h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></div>
                                    <span className={`text-[10px] font-black ${pct === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{pct}% completado</span>
                                </div>
                                <div className="absolute left-4 -bottom-1 flex gap-2 z-10">
                                    <span className="bg-[#f3b012] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ring-2 ring-white transition-transform group-hover:scale-110">Cód: {a.courses?.course_code}</span>
                                    <span className="bg-gray-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ring-2 ring-white uppercase truncate max-w-[100px] transition-transform group-hover:scale-110">{a.courses?.companies?.name || 'EMAQ'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ─── PAGE: Empresas ─── */
const PageEmpresas = ({ companies, onJoin, onJoinCourse, joining, joiningCourse }) => {
    const [compCode, setCompCode] = useState('');
    const [courseCode, setCourseCode] = useState('');

    return (
        <div className="max-w-md">
            <h2 className="text-gray-900 text-xl font-bold mb-4">Vinculación y Acceso</h2>

            {/* Join Company */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-blue-600 text-sm">apartment</span>
                    <p className="text-sm font-bold text-gray-900">Vincular a una Empresa</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={compCode}
                        onChange={e => setCompCode(e.target.value)}
                        placeholder="Código de empresa"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-bold"
                    />
                    <button
                        onClick={() => { onJoin(compCode); setCompCode(''); }}
                        disabled={joining || !compCode}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                    >
                        {joining ? '...' : 'Vincular'}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Ingresa el código proporcionado por tu empresa.</p>
            </div>

            {/* Join Course */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#f3b012] text-sm">school</span>
                    <p className="text-sm font-bold text-gray-900">Canjear Código de Curso</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={courseCode}
                        onChange={e => setCourseCode(e.target.value)}
                        placeholder="CURSOEMAQ-XXXX"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-bold"
                    />
                    <button
                        onClick={() => { onJoinCourse(courseCode); setCourseCode(''); }}
                        disabled={joiningCourse || !courseCode}
                        className="bg-[#f3b012] text-black px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#e0a010] transition-colors"
                    >
                        {joiningCourse ? '...' : 'Activar'}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Usa el código único asignado al curso.</p>
            </div>

            <h3 className="text-gray-900 font-bold text-base mb-3">Empresas vinculadas</h3>
            <div className="space-y-3">
                {companies.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                        <p className="text-gray-400 text-sm font-medium">Aún no estás vinculado a ninguna empresa.</p>
                    </div>
                ) : (
                    companies.map(wc => {
                        const c = wc.companies;
                        return (
                            <div key={wc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-blue-600">apartment</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-900 font-bold text-sm truncate">{c?.name || 'Empresa Desconocida'}</p>
                                    <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                        <p className="text-[#f3b012] font-black">{c?.company_code}</p>
                                        <span className="text-gray-300">•</span>
                                        <p className="text-gray-400 font-medium">Vinculado: {new Date(wc.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

/* ─── PAGE: Certificados ─── */
const PageCertificados = ({ certs = [], loadingCerts, onDownload, downloadingId, onRequestManual, requestingId }) => (
    <div>
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-gray-900 text-xl font-bold">Mis Certificados</h2>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mt-0.5">Logros obtenidos</p>
            </div>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">{certs.length} TOTAL</span>
        </div>
        {loadingCerts ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-gray-400">Buscando certificados...</p>
            </div>
        ) : certs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-200">
                    <span className="material-symbols-outlined text-4xl font-light">workspace_premium</span>
                </div>
                <h3 className="text-gray-900 font-bold mb-1">Aún no tienes certificados</h3>
                <p className="text-gray-400 text-sm">Completa un curso y aprueba el examen final para recibir tu certificado digital.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certs.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 group hover:border-blue-200 transition-all shadow-sm">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-gray-900 font-bold text-sm tracking-tight mb-1 truncate">{c.courses?.title || 'Curso Certificado'}</h3>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-blue-600 font-black text-[10px] uppercase">
                                    {new Date(c.issue_date || c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-gray-200">|</span>
                                <code className="text-[9px] font-black text-gray-400">{c.cert_code || c.verification_code}</code>
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold">
                                Descargas: <span className="text-gray-700 font-bold">{c.download_count || 0}/{c.max_downloads || 3}</span>
                            </p>
                        </div>
                        {c.download_count >= (c.max_downloads || 3) ? (
                            c.requested_manually ? (
                                <span className="text-[10px] text-amber-600 font-black bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 shrink-0">
                                    Solicitud Enviada
                                </span>
                            ) : (
                                <button
                                    onClick={() => onRequestManual(c)}
                                    disabled={requestingId === c.id}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-lg transition-all active:scale-95 disabled:opacity-50 shrink-0"
                                >
                                    {requestingId === c.id ? 'Solicitando...' : 'Solicitar PDF'}
                                </button>
                            )
                        ) : (
                            <button
                                onClick={() => onDownload(c)}
                                disabled={downloadingId === c.id}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white transition-all shrink-0 ${downloadingId === c.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Descargar Certificado"
                            >
                                {downloadingId === c.id ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined">download</span>
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
);

/* ─── PAGE: Perfil ─── */
const PagePerfil = ({ profile, signOut }) => (
    <div className="max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-blue-600 text-4xl">person</span>
                </div>
                <div>
                    <p className="text-gray-900 text-xl font-black">{profile?.full_name || 'Trabajador'}</p>
                    <p className="text-blue-600 font-semibold text-sm">Operador</p>
                </div>
            </div>
            {[
                { icon: 'mail', label: 'Correo', val: profile?.email },
                { icon: 'badge', label: 'ID', val: profile?.employee_id || '---' },
            ].map(f => (
                <div key={f.label} className="py-3 border-b border-gray-50 last:border-0">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{f.label}</p>
                    <p className="text-gray-900 font-medium text-sm">{f.val}</p>
                </div>
            ))}
        </div>
        <button onClick={signOut} className="w-full py-3.5 bg-red-50 text-red-500 font-black rounded-2xl hover:bg-red-100 transition-colors">
            Cerrar Sesión
        </button>
    </div>
);

const WorkerDashboard = () => {
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [certs, setCerts] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingCerts, setLoadingCerts] = useState(true);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const prevChatCount = useRef(0);
    const isFirstChatLoad = useRef(true);
    const [workerCompanies, setWorkerCompanies] = useState([]);
    const [joining, setJoining] = useState(false);
    const [joiningCourse, setJoiningCourse] = useState(false);
    const [isUpdateProfileOpen, setIsUpdateProfileOpen] = useState(false);

    // PDF Generation State
    const pdfRenderRef = useRef();
    const [pdfFields, setPdfFields] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [requestingId, setRequestingId] = useState(null);

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);

    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/cursos')) return 'cursos';
        if (path.includes('/empresas')) return 'empresas';
        if (path.includes('/certificados')) return 'certificados';
        if (path.includes('/chat')) return 'chat';
        if (path.includes('/perfil')) return 'perfil';
        return 'inicio';
    };
    const activeTab = getActiveTab();

    const tabs = [
        { id: 'inicio', icon: 'dashboard', label: 'Inicio', path: '/dashboard' },
        { id: 'cursos', icon: 'menu_book', label: 'Cursos', path: '/dashboard/cursos' },
        { id: 'empresas', icon: 'apartment', label: 'Empresas', path: '/dashboard/empresas' },
        { id: 'certificados', icon: 'workspace_premium', label: 'Certificados', path: '/dashboard/certificados' },
        { id: 'chat', icon: 'chat', label: 'Chat', path: '/dashboard/chat' },
        { id: 'perfil', icon: 'person', label: 'Perfil', path: '/dashboard/perfil' },
    ];

    const loadData = async () => {
        if (!profile?.id) return;
        setLoadingCourses(true);
        setLoadingCerts(true);
        try {
            const aData = await getWorkerAssignments(profile.id);
            setAssignments(aData || []);
            const cData = await getWorkerCertificates(profile.id);
            setCerts(cData || []);

            // Load notifications
            const nData = await getNotifications(profile.id);
            setNotifications(nData || []);

            const { data: wcData } = await supabase.from('worker_companies').select('*, companies(*)').eq('worker_id', profile.id);
            setWorkerCompanies(wcData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingCourses(false);
            setLoadingCerts(false);
        }
    };

    const loadUnreadChatCount = async () => {
        if (!profile?.id) return;
        try {
            const { count, error } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('receiver_id', profile.id)
                .eq('is_read', false);
            
            if (error) throw error;
            const currentCount = count || 0;
            setUnreadChatCount(currentCount);

            if (!isFirstChatLoad.current && currentCount > prevChatCount.current) {
                playNotificationSound();
            }
            prevChatCount.current = currentCount;
            isFirstChatLoad.current = false;
        } catch (e) {
            console.error('Error loading unread chat count:', e);
        }
    };

    useEffect(() => {
        if (profile?.id) {
            loadUnreadChatCount();
            const interval = setInterval(loadUnreadChatCount, 4000);
            return () => clearInterval(interval);
        }
    }, [profile?.id]);

    useEffect(() => { loadData(); }, [profile?.id, location.pathname]);

    const handleUpdateProfile = async (newData) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(newData)
                .eq('id', profile.id);
            if (error) throw error;
            window.location.reload();
        } catch (e) {
            console.error(e);
            let msg = 'Error al actualizar el perfil. Inténtalo de nuevo.';
            if (e.message && (e.message.includes('profiles_employee_id_key') || (e.message.toLowerCase().includes('duplicate key') && e.message.toLowerCase().includes('employee_id')))) {
                msg = 'El documento ingresado ya está siendo usado por otro usuario.';
            }
            alert(msg);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const handleJoinCompany = async (code) => {
        const cleanCode = (code || '').trim();
        if (!cleanCode) return;
        setJoining(true);
        try {
            const { data: comp } = await supabase.from('companies').select('*').eq('company_code', cleanCode).single();
            if (!comp) {
                // Try case-insensitive fallback if exact match fails
                const { data: comp2 } = await supabase.from('companies').select('*').ilike('company_code', cleanCode).single();
                if (!comp2) { alert('Código de empresa inválido'); return; }
                const { error } = await supabase.from('worker_companies').insert({ worker_id: profile.id, company_id: comp2.id });
                if (error) { alert(error.code === '23505' ? 'Ya estás vinculado a esta empresa' : 'Error al vincular'); }
                else { alert('¡Vinculación exitosa!'); loadData(); }
            } else {
                const { error } = await supabase.from('worker_companies').insert({ worker_id: profile.id, company_id: comp.id });
                if (error) { alert(error.code === '23505' ? 'Ya estás vinculado a esta empresa' : 'Error al vincular'); }
                else { alert('¡Vinculación exitosa!'); loadData(); }
            }
        } catch (e) { console.error(e); }
        finally { setJoining(false); }
    };

    const handleJoinCourse = async (code) => {
        const cleanCode = (code || '').trim();
        if (!cleanCode) return;
        setJoiningCourse(true);
        try {
            let { data: course } = await supabase.from('courses').select('id, company_id').eq('course_code', cleanCode).single();

            if (!course) {
                // Try case-insensitive fallback
                const { data: course2 } = await supabase.from('courses').select('id, company_id').ilike('course_code', cleanCode).single();
                course = course2;
            }

            if (!course) { alert('Código de curso inválido'); return; }

            const { error } = await supabase.from('course_assignments').insert({
                worker_id: profile.id,
                course_id: course.id,
                assigned_by: profile.id
            });

            if (error) {
                console.error('Assignment error:', error);
                alert(error.code === '23505' ? 'Ya tienes este curso asignado' : 'Error al asignar curso');
            } else {
                alert('¡Curso activado exitosamente!');
                loadData();
                navigate('/dashboard/cursos');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setJoiningCourse(false);
        }
    };

    const handleDownloadCert = async (cert) => {
        if (isExporting) return;
        setIsExporting(true);
        setDownloadingId(cert.id);
        try {
            // 1. Get the template for this course
            const { data: template } = await supabase.from('certificate_templates')
                .select('*')
                .eq('course_id', cert.course_id)
                .single();

            if (!template) {
                alert('No se encontró una plantilla de certificado para este curso. Por favor contacta a soporte.');
                return;
            }

            // 2. Prepare fields for PDF render
            const fields = {
                issuedBy: template.issued_by,
                customTitle: template.custom_title,
                courseName: cert.courses?.title || '',
                courseCode: cert.courses?.course_code || '',
                signatoryName: template.signatory_name,
                signatoryTitle: template.signatory_title,
                signatureUrl: template.signature_url,
                issueDate: new Date(cert.issue_date || cert.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'long', year: 'numeric'
                }),
                previewName: profile?.full_name || '',
                previewCertCode: cert.cert_code || cert.verification_code || ''
            };

            setPdfFields(fields);

            // 3. Wait for React to render the hidden div
            await new Promise(r => setTimeout(r, 400));

            // 4. Capture and Save
            const el = pdfRenderRef.current;
            if (!el) throw new Error('Elemento de renderizado no encontrado');

            const canvas = await html2canvas(el, {
                scale: 1,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 1920,
                height: 1080,
            });

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);

            // 5. Update download count in background
            await supabase.from('certificates').update({
                download_count: (cert.download_count || 0) + 1
            }).eq('id', cert.id);

            pdf.save(`certificado-${(cert.courses?.title || 'emaq').replace(/\s+/g, '_').toLowerCase()}.pdf`);
            loadData();
        } catch (e) {
            console.error('Error downloading certificate:', e);
            alert('Error al descargar el certificado. Inténtalo de nuevo.');
        } finally {
            setIsExporting(false);
            setDownloadingId(null);
        }
    };

    const handleRequestManual = async (cert) => {
        if (requestingId) return;
        setRequestingId(cert.id);
        try {
            const { error } = await supabase
                .from('certificates')
                .update({ requested_manually: true })
                .eq('id', cert.id);

            if (error) throw error;

            await notifyCompanyOnCertificateRequest(profile.id, cert.course_id);

            alert('Solicitud enviada exitosamente al administrador.');
            loadData();
        } catch (e) {
            console.error('Error requesting manual certificate:', e);
            alert('Error al enviar la solicitud. Inténtalo de nuevo.');
        } finally {
            setRequestingId(null);
        }
    };

    // Determine if we are on a course page or nested course path
    const courseMatch = location.pathname.match(/\/dashboard\/curso\/([a-zA-Z0-9-]+)(\/.*)?/);
    const urlCourseId = courseMatch ? courseMatch[1] : null;
    const courseSubPath = courseMatch ? (courseMatch[2] || '') : '';

    if (urlCourseId) {
        // Find matching course object if already loaded, for faster initial render (optional)
        const courseObj = assignments.find(a => a.course_id === urlCourseId)?.courses;

        // Notify company on entry
        notifyCompanyOnEntry(profile?.id, urlCourseId);

        return (
            <CourseViewer
                courseId={urlCourseId}
                subPath={courseSubPath}
                course={courseObj}
                onBack={() => navigate('/dashboard/cursos')}
                onNavigate={(tab) => navigate(`/dashboard/${tab === 'inicio' ? '' : tab}`)}
                onUpdatePath={(newSubPath) => navigate(`/dashboard/curso/${urlCourseId}${newSubPath}`, { replace: true })}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: 'Inter, sans-serif' }}>
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed left-0 top-0 h-screen z-40">
                <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-white text-lg">precision_manufacturing</span></div>
                    <p className="font-black text-gray-900 text-sm">EMAQ Worker</p>
                </div>
                <nav className="flex-1 p-3">
                    <ul className="space-y-1">
                        {tabs.map(t => (
                            <li key={t.id}>
                                <Link to={t.path} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>
                                    <span className="material-symbols-outlined text-xl">{t.icon}</span>
                                    {t.label}
                                    {t.id === 'chat' && unreadChatCount > 0 && (
                                        <span className={`ml-auto px-2 py-0.5 text-[9px] font-black rounded-full shrink-0 ${activeTab === 'chat' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                                            {unreadChatCount}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            <div className="flex-1 lg:ml-64 flex flex-col">
                <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 flex justify-between items-center h-16">
                    <h1 className="text-xl font-black text-gray-900 capitalize">{activeTab}</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-gray-50 border border-gray-100 relative group`}>
                                <span className={`material-symbols-outlined text-gray-600 group-hover:text-blue-600 ${notifications.some(n => !n.is_read) ? 'animate-bounce' : ''}`}>notifications</span>
                                {notifications.some(n => !n.is_read) && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                                )}
                            </button>
                            {isNotificationMenuOpen && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl border border-gray-100 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-blue-50/50">
                                        <h3 className="text-sm font-black text-gray-900">Notificaciones</h3>
                                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">{notifications.filter(n => !n.is_read).length} NUEVAS</span>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center opacity-40">
                                                <p className="text-xs font-bold">Sin notificaciones aún</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                                                    className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-xl shrink-0 ${n.type === 'alert' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                                                            <span className="material-symbols-outlined text-lg">{n.type === 'alert' ? 'emergency_home' : 'info'}</span>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className={`text-xs font-black truncate ${!n.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</p>
                                                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                                            <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-wider">{new Date(n.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        {!n.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0" />}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-900 leading-none">{profile?.full_name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Trabajador</p>
                            </div>
                            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                {profile?.full_name?.[0]}
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-6 pb-28">
                    {/* Hidden PDF Render Area */}
                    <div style={{ position: 'fixed', top: '-9999px', left: 0, width: '1920px', height: '1080px', pointerEvents: 'none', zIndex: -999 }}>
                        {pdfFields && (
                            <CertPreview
                                ref={pdfRenderRef}
                                fields={pdfFields}
                                workerName={pdfFields.previewName}
                                certCodeWorker={pdfFields.previewCertCode}
                                pdfMode
                            />
                        )}
                    </div>

                    <Routes>
                        <Route index element={<PageInicio profile={profile} assignments={assignments} certs={certs} loadingCourses={loadingCourses} onCourseClick={(c) => navigate(`/dashboard/curso/${c.id}`)} onCompleteData={() => setIsUpdateProfileOpen(true)} />} />
                        <Route path="inicio" element={<PageInicio profile={profile} assignments={assignments} certs={certs} loadingCourses={loadingCourses} onCourseClick={(c) => navigate(`/dashboard/curso/${c.id}`)} onCompleteData={() => setIsUpdateProfileOpen(true)} />} />
                        <Route path="cursos" element={<PageCursos assignments={assignments} loadingCourses={loadingCourses} onCourseClick={(c) => navigate(`/dashboard/curso/${c.id}`)} onJoinCourse={handleJoinCourse} joiningCourse={joiningCourse} />} />
                        <Route path="certificados" element={<PageCertificados certs={certs} loadingCerts={loadingCerts} onDownload={handleDownloadCert} downloadingId={downloadingId} onRequestManual={handleRequestManual} requestingId={requestingId} />} />
                        <Route path="empresas" element={<PageEmpresas
                            companies={workerCompanies}
                            onJoin={handleJoinCompany}
                            onJoinCourse={handleJoinCourse}
                            joining={joining}
                            joiningCourse={joiningCourse}
                        />} />
                        <Route path="perfil" element={<PagePerfil profile={profile} signOut={signOut} />} />
                        <Route path="chat" element={<PageChatWorker />} />
                        {/* Fallback to index if path not found */}
                        <Route path="*" element={<PageInicio profile={profile} assignments={assignments} certs={certs} loadingCourses={loadingCourses} onCourseClick={(c) => navigate(`/dashboard/curso/${c.id}`)} onCompleteData={() => setIsUpdateProfileOpen(true)} />} />
                    </Routes>

                    <UpdateProfileModal
                        isOpen={isUpdateProfileOpen}
                        onClose={() => setIsUpdateProfileOpen(false)}
                        profile={profile}
                        onUpdate={handleUpdateProfile}
                    />

                </main>
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 py-2">
                    <ul className="flex justify-around">
                        {tabs.map(t => (
                            <li key={t.id}>
                                <Link to={t.path} className={`flex flex-col items-center p-2 relative ${activeTab === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className="relative">
                                        <span className="material-symbols-outlined">{t.icon}</span>
                                        {t.id === 'chat' && unreadChatCount > 0 && (
                                            <span className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-red-500 text-white text-[7px] font-black rounded-full leading-none">
                                                {unreadChatCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold">{t.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
};

export default WorkerDashboard;

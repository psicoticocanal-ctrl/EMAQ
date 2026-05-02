import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { notifyWorker } from '../../lib/notificationService';

/* ─── helpers ─── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const pct = (done, total) => total > 0 ? Math.round((done / total) * 100) : 0;
const certCode = () => 'CERT-' + Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);

const GOLD = '#c9a227';

/* ─── CertPreview (inline, only for manual PDF generation) ─── */
const CertPreview = React.forwardRef(({ tmpl, workerName, courseName, courseCode, certCodeVal, issueDate }, ref) => {
    const s = {
        wrap: { width: '1920px', height: '1080px', padding: '56px 120px', borderRadius: 0, background: '#ffffff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
        company: { fontSize: '36px', letterSpacing: '12px', color: GOLD, fontWeight: '900', textTransform: 'uppercase', marginBottom: '14px' },
        subtitle: { fontSize: '22px', letterSpacing: '6px', color: '#888', textTransform: 'uppercase' },
        name: { fontSize: '96px', fontFamily: "'Playfair Display', Georgia, serif", color: '#1a1a2e', fontWeight: '700', fontStyle: 'italic', lineHeight: 1.1, marginBottom: '32px' },
        body: { fontSize: '24px', letterSpacing: '4px', color: '#777', textTransform: 'uppercase' },
        course: { fontSize: '62px', color: GOLD, fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' },
        footerLabel: { fontSize: '22px', color: '#1a1a2e', fontWeight: '700' },
        footerValue: { fontSize: '18px', color: '#999' },
        codeLabel: { fontSize: '16px', color: '#bbb', letterSpacing: '2px', textTransform: 'uppercase' },
        codeValue: { fontSize: '22px', color: GOLD, fontWeight: '900', letterSpacing: '2px' },
    };
    const divLong = { width: '500px', height: '2px', background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, margin: '0 auto' };
    const divShort = { width: '120px', height: '3px', background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, margin: '0 auto 14px' };
    const lineFooter = { width: '280px', height: '2px', background: `${GOLD}60`, marginBottom: '10px' };

    return (
        <div ref={ref} style={s.wrap}>
            {/* Border frame */}
            <div style={{ position: 'absolute', inset: '14px', border: `2px solid ${GOLD}`, borderRadius: '6px', pointerEvents: 'none' }} />
            {/* Corner accents */}
            {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
                <div key={v + h} style={{ position: 'absolute', [v]: '6px', [h]: '6px', width: '80px', height: '80px', [`border${v[0].toUpperCase() + v.slice(1)}`]: `4px solid ${GOLD}`, [`border${h[0].toUpperCase() + h.slice(1)}`]: `4px solid ${GOLD}`, borderRadius: v === 'top' && h === 'left' ? '8px 0 0 0' : v === 'top' ? '0 8px 0 0' : h === 'left' ? '0 0 0 8px' : '0 0 8px 0' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,#c9a22706 0px,#c9a22706 1px,transparent 1px,transparent 36px)', pointerEvents: 'none' }} />

            <div style={{ textAlign: 'center', marginBottom: '30px', position: 'relative', zIndex: 1 }}>
                <p style={s.company}>{tmpl?.issued_by || 'EMPRESA'}</p>
                <div style={divShort} />
                <p style={s.subtitle}>{tmpl?.custom_title || 'Certifica con orgullo a'}</p>
            </div>

            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '28px', position: 'relative', zIndex: 1 }}>
                <div>
                    <h1 style={s.name}>{workerName}</h1>
                    <div style={divLong} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={s.body}>ha completado satisfactoriamente el programa de certificación en</p>
                    <h2 style={s.course}>{courseName}</h2>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {tmpl?.signature_url && <img src={tmpl.signature_url} alt="Firma" crossOrigin="anonymous" style={{ height: '100px', maxWidth: '260px', objectFit: 'contain', display: 'block', marginBottom: '10px' }} />}
                    <div style={lineFooter} />
                    <p style={s.footerLabel}>{tmpl?.signatory_name || 'Firma Autorizada'}</p>
                    <p style={s.footerValue}>{tmpl?.signatory_title || 'Gerente General'}</p>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {courseCode && <div><p style={s.codeLabel}>Código Curso</p><code style={s.codeValue}>{courseCode}</code></div>}
                    {certCodeVal && <div><p style={s.codeLabel}>Código Certificado</p><code style={{ ...s.codeValue, color: '#555', fontWeight: '800', letterSpacing: '1px' }}>{certCodeVal}</code></div>}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={lineFooter} />
                    <p style={s.footerLabel}>{issueDate || fmt(new Date())}</p>
                    <p style={s.footerValue}>Fecha de emisión</p>
                </div>
            </div>
        </div>
    );
});

/* ─── Main component ─── */
const WorkerEnrollments = () => {
    const { profile } = useAuth();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null); // { worker, enrollment, cert, progress, template }
    const [generating, setGenerating] = useState(false);
    const pdfRef = useRef(null);
    const [pdfData, setPdfData] = useState(null);

    // Notifications state
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [sendingNotif, setSendingNotif] = useState(false);

    /* ── Load all enrollments for this company ── */
    const load = useCallback(async () => {
        if (!profile?.company_id) return;
        setLoading(true);
        try {
            // Parallel fetch of base entities
            const [coursesRes, linkedWorkersRes, directWorkersRes, templatesRes] = await Promise.all([
                supabase.from('courses').select('id, title, course_code').eq('company_id', profile.company_id),
                supabase.from('worker_companies').select('profiles(id, full_name, email, employee_id)').eq('company_id', profile.company_id),
                supabase.from('profiles').select('id, full_name, email, employee_id').eq('company_id', profile.company_id).eq('role', 'worker'),
                supabase.from('certificate_templates').select('id, course_id, issued_by, signatory_name, signatory_title, custom_title, signature_url, status').eq('company_id', profile.company_id)
            ]);

            const courses = coursesRes.data || [];
            const courseIds = courses.map(c => c.id);
            if (courseIds.length === 0) { setEnrollments([]); setLoading(false); return; }

            // Merge unique workers
            const workersMap = new Map();
            (directWorkersRes.data || []).forEach(w => workersMap.set(w.id, w));
            (linkedWorkersRes.data || []).forEach(lw => {
                if (lw.profiles) workersMap.set(lw.profiles.id, lw.profiles);
            });
            const workers = Array.from(workersMap.values());
            const workerIds = workers.map(w => w.id);
            if (workerIds.length === 0) { setEnrollments([]); setLoading(false); return; }

            // Parallel fetch of activity data
            const [modulesRes, progressRes, certsRes, examsRes, assignmentsRes] = await Promise.all([
                supabase.from('modules').select('id, course_id').in('course_id', courseIds),
                supabase.from('progress').select('user_id, module_id, status, completed_at').in('user_id', workerIds),
                supabase.from('certificates').select('id, user_id, course_id, cert_code, issue_date, expiry_date, verification_code, download_count, max_downloads, template_id').in('course_id', courseIds).in('user_id', workerIds),
                supabase.from('exam_attempts').select('user_id, course_id, score, passed, completed_at').in('course_id', courseIds).in('user_id', workerIds),
                supabase.from('course_assignments').select('user_id, course_id, created_at').in('course_id', courseIds)
            ]);

            const modules = modulesRes.data || [];
            const progressRows = progressRes.data || [];
            const certs = certsRes.data || [];
            const exams = examsRes.data || [];
            const templates = templatesRes.data || [];
            const courseAssignments = assignmentsRes.data || [];

            // ── PRE-INDEXING (The Secret Sauce for Speed) ──
            const modulesByCourse = {};
            modules.forEach(m => {
                if (!modulesByCourse[m.course_id]) modulesByCourse[m.course_id] = [];
                modulesByCourse[m.course_id].push(m.id);
            });

            const progressByWorkerAndModule = {};
            progressRows.forEach(p => {
                const key = `${p.user_id}_${p.module_id}`;
                progressByWorkerAndModule[key] = p;
            });

            const certsByWorkerAndCourse = {};
            certs.forEach(c => {
                certsByWorkerAndCourse[`${c.user_id}_${c.course_id}`] = c;
            });

            const examsByWorkerAndCourse = {};
            exams.forEach(e => {
                const key = `${e.user_id}_${e.course_id}`;
                if (!examsByWorkerAndCourse[key]) examsByWorkerAndCourse[key] = [];
                examsByWorkerAndCourse[key].push(e);
            });

            const templatesByCourse = {};
            templates.forEach(t => templatesByCourse[t.course_id] = t);

            // ── Build enrollments list ──
            const rows = [];
            
            // Map course assignments first (the source of truth for who is in which course)
            courseAssignments.forEach(assignment => {
                const worker = workersMap.get(assignment.user_id);
                const course = courses.find(c => c.id === assignment.course_id);
                if (!worker || !course) return;

                const courseMods = modulesByCourse[course.id] || [];
                const workerProgress = courseMods
                    .map(mid => progressByWorkerAndModule[`${worker.id}_${mid}`])
                    .filter(Boolean);
                
                const cert = certsByWorkerAndCourse[`${worker.id}_${course.id}`];
                const examsForThis = examsByWorkerAndCourse[`${worker.id}_${course.id}`] || [];
                const examPassed = examsForThis.some(e => e.passed);

                const completedCount = workerProgress.filter(p => p.status === 'completed').length;
                const progressPct = pct(completedCount, courseMods.length);
                const template = templatesByCourse[course.id] || null;
                const certStatus = cert 
                    ? (cert.expiry_date && new Date(cert.expiry_date) < new Date() ? 'expired' : 'certified')
                    : examPassed ? 'passed_no_cert' : 'in_progress';

                rows.push({ 
                    worker, 
                    course, 
                    progressPct, 
                    completed: completedCount, 
                    totalModules: courseMods.length, 
                    cert, 
                    certStatus, 
                    examPassed, 
                    template,
                    enrolledAt: assignment.created_at
                });
            });

            // Add workers with NO assignments yet (but linked to company)
            workers.forEach(worker => {
                const isAssigned = courseAssignments.some(a => a.user_id === worker.id);
                if (!isAssigned) {
                    rows.push({
                        worker,
                        course: { title: '(Sin curso asignado)', id: 'none' },
                        progressPct: 0, completed: 0, totalModules: 0,
                        cert: null, certStatus: 'in_progress', examPassed: false, template: null
                    });
                }
            });

            setEnrollments(rows);
        } catch (e) {
            console.error('Performance Load Error:', e);
        } finally {
            setLoading(false);
        }
    }, [profile?.company_id]);

    useEffect(() => { load(); }, [load]);

    /* ── Manual certificate generation ── */
    const handleGenerateCert = async (row) => {
        setGenerating(true);
        try {
            const code = certCode();
            const now = new Date().toISOString();

            // Insert certificate record
            const { data: newCert, error } = await supabase
                .from('certificates')
                .insert({
                    user_id: row.worker.id,
                    course_id: row.course.id,
                    cert_code: code,
                    issue_date: now,
                    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                    verification_code: 'VER-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
                    max_downloads: 3,
                    download_count: 0,
                    template_id: row.template?.id || null,
                })
                .select()
                .single();

            if (error) throw error;

            // Generate and download PDF
            const pdfPayload = {
                workerName: row.worker.full_name,
                courseName: row.course.title,
                courseCode: row.course.course_code,
                certCodeVal: code,
                issueDate: fmt(now),
                tmpl: row.template,
            };
            setPdfData(pdfPayload);
            await new Promise(r => setTimeout(r, 300)); // wait for render

            const el = pdfRef.current;
            if (el) {
                const canvas = await html2canvas(el, { scale: 1, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false, width: 1920, height: 1080 });
                const img = canvas.toDataURL('image/jpeg', 0.95);
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167.06] });
                pdf.addImage(img, 'JPEG', 0, 0, 297, 167.06);
                pdf.save(`certificado-${(row.worker.full_name || 'trabajador').toLowerCase().replace(/\s+/g, '-')}.pdf`);
            }

            await load();
            setSelected(prev => prev ? { ...prev, cert: newCert, certStatus: 'certified' } : null);
            alert('✅ Certificado generado y descargado correctamente.');
        } catch (e) {
            alert('Error generando certificado: ' + e.message);
        } finally {
            setGenerating(false);
            setPdfData(null);
        }
    };

    /* ── Filtered rows ── */
    const filtered = enrollments.filter(r => {
        const q = search.toLowerCase();
        return (
            (r.worker.full_name || '').toLowerCase().includes(q) ||
            (r.worker.email || '').toLowerCase().includes(q) ||
            (r.worker.employee_id || '').toLowerCase().includes(q) ||
            (r.course.title || '').toLowerCase().includes(q) ||
            (r.course.course_code || '').toLowerCase().includes(q)
        );
    });

    /* ── Status badge helper ── */
    const handleSendNotification = async () => {
        if (!selected?.worker?.id || !profile?.company_id || !notifTitle) return;
        setSendingNotif(true);
        try {
            await notifyWorker(selected.worker.id, profile.company_id, notifTitle, notifMessage, 'info');
            alert('Notificación enviada con éxito');
            setNotifTitle('');
            setNotifMessage('');
        } catch (e) {
            console.error(e);
            alert('Error al enviar notificación');
        } finally {
            setSendingNotif(false);
        }
    };

    const StatusBadge = ({ status }) => {
        const map = {
            certified: { label: 'CERTIFICADO', cls: 'bg-green-50 text-green-600 border border-green-200' },
            expired: { label: 'VENCIDO', cls: 'bg-red-50 text-red-600 border border-red-200' },
            passed_no_cert: { label: 'APROBADO', cls: 'bg-blue-50 text-blue-600 border border-blue-200' },
            in_progress: { label: 'EN PROCESO', cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
        };
        const { label, cls } = map[status] || map.in_progress;
        return <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase whitespace-nowrap ${cls}`}>{label}</span>;
    };

    /* ── Progress bar ── */
    const ProgressBar = ({ value, showLabel = false }) => (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: value === 100 ? '#22c55e' : '#f3b012' }} />
            </div>
            {showLabel && <span className="text-xs font-black text-gray-500 shrink-0 w-8 text-right">{value}%</span>}
        </div>
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <section className="p-4 lg:p-6">
            {/* Hidden PDF render target */}
            {pdfData && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                    <CertPreview ref={pdfRef} {...pdfData} />
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-black font-black text-2xl">Trabajadores Inscritos</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                        {enrollments.length} inscripción{enrollments.length !== 1 ? 'es' : ''} activa{enrollments.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                <input
                    type="text" placeholder="Buscar por nombre, email, ID, curso..."
                    className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium outline-none focus:border-[#f3b012] focus:ring-4 focus:ring-[#f3b012]/10 transition-all shadow-sm"
                    value={search} onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_80px] gap-4 px-4 mb-2">
                {['Trabajador', 'Curso', 'Progreso', 'Estado', ''].map(h => (
                    <p key={h} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</p>
                ))}
            </div>

            {/* Rows */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-black/5 overflow-hidden divide-y divide-gray-100">
                {filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">group_off</span>
                        <p className="text-gray-400 font-bold text-sm">
                            {enrollments.length === 0 ? 'Ningún trabajador se ha inscrito a un curso todavía.' : 'No se encontraron resultados.'}
                        </p>
                    </div>
                ) : filtered.map((row, i) => (
                    <div
                        key={`${row.worker.id}-${row.course.id}`}
                        className="grid md:grid-cols-[2fr_2fr_1fr_1fr_80px] grid-cols-1 gap-3 md:gap-4 px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer group items-center"
                        onClick={() => setSelected(row)}
                    >
                        {/* Worker */}
                        <div className="min-w-0 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-[#f3b012]/10 transition-colors flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-gray-400 group-hover:text-[#f3b012] text-lg transition-colors">engineering</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-black truncate">{row.worker.full_name || '—'}</p>
                                <p className="text-[11px] text-gray-400 truncate">{row.worker.email}</p>
                                {row.worker.employee_id && (
                                    <p className="text-[10px] text-gray-300 font-mono">{row.worker.employee_id}</p>
                                )}
                            </div>
                        </div>

                        {/* Course */}
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-black truncate">{row.course.title}</p>
                            {row.course.course_code && (
                                <code className="text-[10px] text-[#c9a227] font-bold">{row.course.course_code}</code>
                            )}
                        </div>

                        {/* Progress */}
                        <div>
                            <p className="text-sm font-black text-black mb-1">{row.progressPct}%</p>
                            <ProgressBar value={row.progressPct} />
                            <p className="text-[10px] text-gray-400 mt-1">{row.completed}/{row.totalModules} módulos</p>
                        </div>

                        {/* Status */}
                        <div>
                            <StatusBadge status={row.certStatus} />
                        </div>

                        {/* Detail arrow */}
                        <div className="flex justify-end">
                            <span className="material-symbols-outlined text-gray-300 group-hover:text-[#f3b012] transition-colors">chevron_right</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Detail Drawer ── */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setSelected(null)}>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    <div
                        className="relative z-10 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer header */}
                        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                            <button onClick={() => setSelected(null)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors shrink-0">
                                <span className="material-symbols-outlined text-gray-500">close</span>
                            </button>
                            <div className="min-w-0">
                                <p className="font-black text-black truncate">{selected.worker.full_name}</p>
                                <p className="text-xs text-gray-400 truncate">{selected.worker.email}</p>
                            </div>
                        </div>

                        <div className="p-6 flex flex-col gap-6 flex-1">
                            {/* Worker info */}
                            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Datos del Trabajador</h4>
                                <InfoRow icon="badge" label="Código trabajador" value={selected.worker.employee_id || '—'} />
                                <InfoRow icon="email" label="Correo" value={selected.worker.email || '—'} />
                            </div>

                            {/* Course info */}
                            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Curso Asignado</h4>
                                <InfoRow icon="library_books" label="Curso" value={selected.course.title} />
                                <InfoRow icon="qr_code" label="Código del curso" value={selected.course.course_code || '—'} mono />
                            </div>

                            {/* Progress */}
                            <div className="bg-gray-50 rounded-2xl p-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Progreso de Módulos</h4>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-black">{selected.progressPct}% completado</span>
                                    <span className="text-xs text-gray-400">{selected.completed} / {selected.totalModules} módulos</span>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${selected.progressPct}%`, background: selected.progressPct === 100 ? '#22c55e' : '#f3b012' }} />
                                </div>
                            </div>

                            {/* Certification status */}
                            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Certificación</h4>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={selected.certStatus} />
                                    {selected.certStatus === 'certified' && <span className="text-xs text-green-600 font-bold">✓ Certificado emitido</span>}
                                    {selected.certStatus === 'expired' && <span className="text-xs text-red-500 font-bold">⚠ Certificado vencido</span>}
                                    {selected.certStatus === 'passed_no_cert' && <span className="text-xs text-blue-600 font-bold">Examen aprobado — sin certificado aún</span>}
                                    {selected.certStatus === 'in_progress' && <span className="text-xs text-yellow-600 font-bold">Aún no ha aprobado el examen</span>}
                                </div>
                                {selected.cert && (
                                    <>
                                        <InfoRow icon="tag" label="Código cert." value={selected.cert.cert_code || '—'} mono />
                                        <InfoRow icon="calendar_today" label="Fecha emisión" value={fmt(selected.cert.issue_date)} />
                                        <InfoRow
                                            icon="event_busy"
                                            label="Vencimiento"
                                            value={selected.cert.expiry_date ? fmt(selected.cert.expiry_date) : 'Sin vencimiento'}
                                            warn={selected.cert.expiry_date && new Date(selected.cert.expiry_date) < new Date()}
                                        />
                                        <InfoRow icon="download" label="Descargas" value={`${selected.cert.download_count} / ${selected.cert.max_downloads}`} />
                                    </>
                                )}
                            </div>

                            {/* Send Notification */}
                            <div className="bg-blue-50/50 rounded-2xl p-4 flex flex-col gap-3 border border-blue-100">
                                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Enviar Notificación</h4>
                                <input
                                    type="text"
                                    value={notifTitle}
                                    onChange={e => setNotifTitle(e.target.value)}
                                    placeholder="Título de la notificación"
                                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 font-bold shadow-sm"
                                />
                                <textarea
                                    value={notifMessage}
                                    onChange={e => setNotifMessage(e.target.value)}
                                    placeholder="Escribe un mensaje para el trabajador..."
                                    rows={3}
                                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 resize-none shadow-sm"
                                />
                                <button
                                    onClick={handleSendNotification}
                                    disabled={sendingNotif || !notifTitle}
                                    className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    <span className="material-symbols-outlined text-base">send</span>
                                    {sendingNotif ? 'Enviando...' : 'Enviar mensaje'}
                                </button>
                            </div>

                            {/* Manual cert generation — show when: no cert, OR expired, OR passed exam without cert */}
                            {(selected.certStatus !== 'certified' || selected.certStatus === 'expired') && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="material-symbols-outlined text-amber-500 text-xl shrink-0">warning</span>
                                        <div>
                                            <p className="text-sm font-bold text-amber-800">
                                                {selected.certStatus === 'expired' ? 'Certificado vencido' : 'Sin certificado generado'}
                                            </p>
                                            <p className="text-xs text-amber-600 mt-0.5">
                                                {selected.certStatus === 'passed_no_cert'
                                                    ? 'El trabajador aprobó el examen pero no tiene certificado en su perfil.'
                                                    : selected.certStatus === 'expired'
                                                        ? 'El certificado de este trabajador ha vencido. Puedes generar uno nuevo.'
                                                        : 'Puedes generar el certificado de forma manual y entregarlo al perfil del trabajador.'}
                                            </p>
                                        </div>
                                    </div>
                                    {!selected.template || selected.template.status !== 'published' ? (
                                        <p className="text-xs text-amber-700 bg-amber-100 rounded-xl px-3 py-2 font-bold">
                                            ⚠ Este curso no tiene una plantilla de certificado publicada. Ve a Certificados y emite la plantilla primero.
                                        </p>
                                    ) : (
                                        <button
                                            onClick={() => handleGenerateCert(selected)}
                                            disabled={generating}
                                            className="w-full bg-[#f3b012] text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 text-sm"
                                        >
                                            {generating ? (
                                                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Generando...</>
                                            ) : (
                                                <><span className="material-symbols-outlined text-sm">workspace_premium</span>Generar Certificado Manual</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

/* ─── Simple info row ─── */
const InfoRow = ({ icon, label, value, mono = false, warn = false }) => (
    <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-gray-300 text-base shrink-0">{icon}</span>
        <span className="text-xs text-gray-400 shrink-0 w-28">{label}</span>
        <span className={`text-xs font-bold truncate ${warn ? 'text-red-500' : 'text-black'} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
);

export default WorkerEnrollments;

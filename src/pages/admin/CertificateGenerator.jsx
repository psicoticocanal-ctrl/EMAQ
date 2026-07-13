import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* ════════════════════════════════════════════════════════
   Certificate Template System
   - Admin designs ONE template per course
   - "Emitir" publishes the template
   - When worker passes final exam → auto-generated cert
   - Worker download limit: 2  |  Company: unlimited
   ════════════════════════════════════════════════════════ */

/* ─── Live Certificate Preview ─── */
const CertPreview = React.forwardRef(({ fields, workerName = null, certCodeWorker = null, pdfMode = false }, ref) => {
    // In pdfMode use fixed px, in preview mode use responsive clamp/vw
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
        headerGap: '16px',
        footerGap: '12px',
        sectionGap: '24px',
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
        nameDivider: { width: '100px', height: '1px' },
        footerLine: { width: '110px', height: '1px' },
        sigImg: { height: 'clamp(28px,3.5vw,46px)', maxWidth: '120px' },
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
            {/* Gold outer border frame */}
            <div style={{ position: 'absolute', inset: pdfMode ? '14px' : '10px', border: `${pdfMode ? '2px' : '1.5px'} solid #c9a227`, borderRadius: pdfMode ? '6px' : '10px', pointerEvents: 'none' }} />
            {/* Corner accents */}
            {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
                <div key={v + h} style={{
                    position: 'absolute', [v]: pdfMode ? '6px' : '4px', [h]: pdfMode ? '6px' : '4px',
                    width: s.cornerSize, height: s.cornerSize,
                    [`border${v[0].toUpperCase() + v.slice(1)}`]: s.cornerBorder,
                    [`border${h[0].toUpperCase() + h.slice(1)}`]: s.cornerBorder,
                    borderRadius: v === 'top' && h === 'left' ? '8px 0 0 0' : v === 'top' ? '0 8px 0 0' : h === 'left' ? '0 0 0 8px' : '0 0 8px 0',
                }} />
            ))}
            {/* Subtle diagonal gold texture */}
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
                    <h1 style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        color: '#1a1a2e', ...s.name, fontWeight: '700',
                        fontStyle: 'italic', lineHeight: 1.1, marginBottom: pdfMode ? '24px' : '1.5%',
                    }}>
                        {workerName || fields.previewName || 'Nombre del Trabajador'}
                    </h1>
                    <div style={{ ...s.nameDivider, background: 'linear-gradient(90deg,transparent,#c9a227,transparent)', margin: '0 auto' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: pdfMode ? '12px' : '4px', maxWidth: '85%', margin: '0 auto' }}>
                    <p style={{ color: '#555', ...s.body, textTransform: 'uppercase', fontWeight: '700', lineHeight: 1.4 }}>
                        ASISTIÓ Y DEMOSTRÓ SUS COMPETENCIAS CON UNA INTENSIDAD HORARIA DE 60 HORAS TEÓRICO - PRÁCTICAS EN LA OPERACIÓN DE LOS SIGUIENTES EQUIPOS Y TERMINANDO SATISFACTORIAMENTE EL CURSO REALIZADO:
                    </p>
                    <h2 style={{ color: '#c9a227', ...s.course, fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', lineHeight: 1.2 }}>
                        {fields.courseName || 'NOMBRE DEL CURSO'}
                    </h2>
                </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: pdfMode ? '25px' : '3.5%', marginBottom: pdfMode ? '25px' : '3.5%', position: 'relative', zIndex: 1 }}>
                {/* Signatory + digital signature image */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: pdfMode ? '8px' : '2px' }}>
                    {fields.signatureUrl && (
                        <img
                            src={fields.signatureUrl}
                            alt="Firma"
                            crossOrigin="anonymous"
                            style={{ ...s.sigImg, objectFit: 'contain', display: 'block', marginBottom: pdfMode ? '10px' : '3px' }}
                        />
                    )}
                    <div style={{ ...s.footerLine, background: '#c9a22760', marginBottom: pdfMode ? '10px' : '3px' }} />
                    <p style={{ color: '#1a1a2e', ...s.footerLabel, fontWeight: '700' }}>{fields.signatoryName || 'Firma Autorizada'}</p>
                    <p style={{ color: '#999', ...s.footerValue }}>{fields.signatoryTitle || 'Cargo'}</p>
                </div>

                {/* Codes */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: pdfMode ? '16px' : '5px' }}>
                    {fields.courseCode && (
                        <div>
                            <p style={{ color: '#bbb', ...s.codeLabel, letterSpacing: '2px', textTransform: 'uppercase' }}>Código Curso</p>
                            <code style={{ color: '#c9a227', ...s.codeValue, fontWeight: '900', letterSpacing: '2px' }}>{fields.courseCode}</code>
                        </div>
                    )}
                    {(certCodeWorker || fields.previewCertCode) && (
                        <div>
                            <p style={{ color: '#bbb', ...s.codeLabel, letterSpacing: '2px', textTransform: 'uppercase' }}>Código Certificado</p>
                            <code style={{ color: '#555', ...s.codeValue, fontWeight: '800', letterSpacing: '1px' }}>
                                {certCodeWorker || fields.previewCertCode}
                            </code>
                        </div>
                    )}
                </div>

                {/* Date */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ ...s.footerLine, background: '#c9a22760', marginBottom: pdfMode ? '10px' : '3px' }} />
                    <p style={{ color: '#1a1a2e', ...s.footerLabel, fontWeight: '700' }}>
                        {fields.issueDate || new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
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


/* ─── PDF Export ─── */
const exportPDF = async (renderRef, workerName = 'Certificado') => {
    const el = renderRef.current;
    if (!el) return;

    // el is already 1920x1080 in the hidden div, just capture it
    await new Promise(r => setTimeout(r, 150)); // allow fonts/paint
    const canvas = await html2canvas(el, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1920,
        height: 1080,
    });

    // Custom 16:9 PDF page
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
    pdf.save(`certificado-${(workerName || 'cert').replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

/* ════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════ */
const CertificateGenerator = () => {
    const { profile } = useAuth();
    const previewRef = useRef();   // live preview in editor
    const pdfRenderRef = useRef(); // hidden 1920x1080 element for PDF export
    const [exporting, setExporting] = useState(false);

    const [view, setView] = useState('templates');  // 'templates' | 'editor' | 'issued'
    const [courses, setCourses] = useState([]);
    const [templates, setTemplates] = useState([]);   // existing templates
    const [issuedCerts, setIssuedCerts] = useState([]); // auto-generated worker certs
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingSig, setUploadingSig] = useState(false);

    const [editingTemplate, setEditingTemplate] = useState(null); // null = new
    const [pdfFields, setPdfFields] = useState(null); // fields used for PDF render

    const emptyFields = {
        course_id: '',
        courseName: '',
        courseCode: '',
        issuedBy: profile?.companies?.name || '',
        customTitle: 'Certifica con orgullo a',
        signatoryName: '',
        signatoryTitle: 'Gerente General',
        signatureUrl: '',
        issueDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
        issueDateRaw: new Date().toISOString().slice(0, 10),
        validityMonths: 12,
        maxDownloads: 3,
        previewName: 'Juan Pérez',
        previewCertCode: 'CERT-PREVIEW-001',
    };
    const [fields, setFields] = useState(emptyFields);
    const up = (k, v) => setFields(p => ({ ...p, [k]: v }));

    /* ─── Load data ─── */
    const loadAll = useCallback(async () => {
        if (!profile?.company_id) return;
        setLoading(true);
        try {
            // Parallel fetch of base data
            const [coursesRes, templatesRes] = await Promise.all([
                supabase.from('courses').select('id, title, course_code').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
                supabase.from('certificate_templates').select('*, courses(title, course_code)').eq('company_id', profile.company_id).order('created_at', { ascending: false })
            ]);

            const courses = coursesRes.data || [];
            const courseIds = courses.map(x => x.id);

            if (courseIds.length === 0) {
                setCourses([]);
                setTemplates([]);
                setIssuedCerts([]);
                setLoading(false);
                return;
            }

            // Fetch certificates for those courses
            const { data: ic } = await supabase.from('certificates').select(`
                id, cert_code, download_count, max_downloads, issue_date, expiry_date, verification_code,
                profiles:user_id(full_name, employee_id, email),
                courses:course_id(title, course_code)
            `)
            .in('course_id', courseIds)
            .order('issue_date', { ascending: false })
            .limit(100); // Limit to recent 100 for better performance

            setCourses(courses);
            setTemplates(templatesRes.data || []);
            setIssuedCerts(ic || []);
        } catch (e) {
            console.error('Error loading certificates:', e);
        } finally {
            setLoading(false);
        }
    }, [profile?.company_id]);

    useEffect(() => { loadAll(); }, [loadAll]);

    /* ─── Signature PNG upload ─── */
    const handleSignatureUpload = async (file) => {
        if (!file) return;
        if (file.type !== 'image/png' && file.type !== 'image/webp') {
            alert('Por favor sube la firma en formato PNG (sin fondo) o WebP.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('El archivo de firma no debe superar los 2 MB.');
            return;
        }
        setUploadingSig(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `${profile.company_id}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage.from('signatures').upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data: { publicUrl } } = supabase.storage.from('signatures').getPublicUrl(path);
            up('signatureUrl', publicUrl);
        } catch (e) {
            alert('Error al subir la firma: ' + e.message);
        } finally {
            setUploadingSig(false);
        }
    };

    /* ─── Open editor for existing template ─── */
    const openEditor = (tmpl = null) => {
        if (tmpl) {
            const customTitleRaw = tmpl.custom_title || 'Certifica con orgullo a';
            const customTitleParts = customTitleRaw.split('|||max_downloads:');
            const customTitle = customTitleParts[0];
            const maxDownloads = customTitleParts[1] ? parseInt(customTitleParts[1]) : 3;

            setFields({
                course_id: tmpl.course_id,
                courseName: tmpl.courses?.title || '',
                courseCode: tmpl.courses?.course_code || '',
                issuedBy: tmpl.issued_by || '',
                customTitle: customTitle,
                signatoryName: tmpl.signatory_name || '',
                signatoryTitle: tmpl.signatory_title || 'Gerente General',
                signatureUrl: tmpl.signature_url || '',
                issueDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
                issueDateRaw: new Date().toISOString().slice(0, 10),
                validityMonths: tmpl.validity_months || 12,
                maxDownloads: maxDownloads,
                previewName: 'Juan Pérez',
                previewCertCode: 'CERT-PREVIEW-001',
            });
            setEditingTemplate(tmpl);
        } else {
            setFields({ ...emptyFields, issuedBy: profile?.companies?.name || '' });
            setEditingTemplate(null);
        }
        setView('editor');
    };

    /* ─── Save template (draft) ─── */
    const handleSave = async (publish = false) => {
        if (!fields.course_id) { alert('Selecciona el curso al que pertenece este certificado.'); return; }
        if (!fields.issuedBy) { alert('Escribe el nombre de la empresa emisora.'); return; }
        setSaving(true);
        try {
            const payload = {
                course_id: fields.course_id,
                company_id: profile.company_id,
                issued_by: fields.issuedBy,
                custom_title: fields.customTitle + '|||max_downloads:' + (fields.maxDownloads || 3),
                signatory_name: fields.signatoryName,
                signatory_title: fields.signatoryTitle,
                signature_url: fields.signatureUrl || null,
                validity_months: parseInt(fields.validityMonths) || 12,
                status: publish ? 'published' : 'draft',
                updated_at: new Date().toISOString(),
            };
            let error;

            if (editingTemplate?.id) {
                ({ error } = await supabase.from('certificate_templates').update(payload).eq('id', editingTemplate.id));
            } else {
                ({ error } = await supabase.from('certificate_templates').upsert({ ...payload }, { onConflict: 'course_id' }));
            }
            if (error) throw error;

            // Propagate max downloads limit changes to all existing certificates for this course
            await supabase
                .from('certificates')
                .update({ max_downloads: parseInt(fields.maxDownloads) || 3 })
                .eq('course_id', fields.course_id);

            await loadAll();
            if (publish) {
                setView('templates');
            }
        } catch (e) {
            console.error(e);
            alert('Error al guardar: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    /* ─── Export as PDF (company: unlimited) ─── */
    const handleExportPDF = async (workerName, certCode, certDataFields = null) => {
        // Set the pdfFields so the hidden render div shows this cert's data
        const renderFields = certDataFields || fields;
        setPdfFields({ ...renderFields, previewCertCode: certCode || renderFields.previewCertCode });
        setExporting(true);
        await new Promise(r => setTimeout(r, 200)); // wait for React to re-render hidden div
        try {
            await exportPDF(pdfRenderRef, workerName || 'certificado');
        } catch (e) {
            alert('Error al exportar PDF: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#f3b012] focus:ring-2 focus:ring-[#f3b012]/10 transition-all";

    const statusBadge = (status) => status === 'published'
        ? <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded-lg">PUBLICADO</span>
        : <span className="text-[10px] font-black bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg">BORRADOR</span>;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    /* ══════════════════════════════════════════
       VIEW: Templates list
       ══════════════════════════════════════════ */
    if (view === 'templates') return (
        <section className="p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h3 className="text-black font-black text-2xl">Plantillas de Certificados</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-0.5">Una plantilla por curso — se llena automáticamente cuando el trabajador aprueba</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('issued')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                        <span className="material-symbols-outlined text-lg">workspace_premium</span>
                        Certificados Emitidos ({issuedCerts.length})
                    </button>
                    <button onClick={() => openEditor(null)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#f3b012] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity">
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        Nueva Plantilla
                    </button>
                </div>
            </div>

            {/* How it works banner */}
            <div className="bg-black rounded-2xl p-4 mb-6 flex flex-wrap gap-6 text-white">
                {[
                    { icon: 'brush', color: '#f3b012', step: '1', label: 'Diseñas', desc: 'Crea la plantilla para cada curso' },
                    { icon: 'send', color: '#60a5fa', step: '2', label: 'Emites', desc: 'La publicas: queda lista para ese curso' },
                    { icon: 'auto_awesome', color: '#4ade80', step: '3', label: 'Automático', desc: 'Cuando el trabajador aprueba el examen final, se genera su certificado' },
                    { icon: 'download', color: '#c084fc', step: '4', label: 'Descarga', desc: 'La empresa ilimitado · El trabajador máx. 2 veces' },
                ].map(s => (
                    <div key={s.step} className="flex items-start gap-3 flex-1 min-w-[160px]">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color + '22' }}>
                            <span className="material-symbols-outlined text-sm" style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs font-black" style={{ color: s.color }}>Paso {s.step}: {s.label}</p>
                            <p className="text-xs text-gray-400">{s.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Templates grid */}
            {templates.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-200 block mb-4">workspace_premium</span>
                    <p className="text-gray-500 font-bold mb-1">Sin plantillas aún</p>
                    <p className="text-gray-400 text-sm mb-4">Crea una plantilla para cada curso que quieras certificar.</p>
                    <button onClick={() => openEditor(null)} className="bg-[#f3b012] text-black font-black px-6 py-2.5 rounded-xl text-sm">
                        + Crear primera plantilla
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.map(tmpl => (
                        <div key={tmpl.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                            {/* Mini preview */}
                            <div className="h-36 bg-gray-900 flex items-center justify-center p-3 relative">
                                <div className="text-center px-4">
                                    <p className="text-[#f3b012] text-[10px] font-black uppercase tracking-widest mb-1">{tmpl.issued_by}</p>
                                    <p className="text-white/50 text-[8px] uppercase tracking-wider mb-1">{tmpl.custom_title}</p>
                                    <p className="text-white text-sm font-bold italic" style={{ fontFamily: 'serif' }}>Nombre del Trabajador</p>
                                    <p className="text-[#f3b012] text-[9px] font-black uppercase mt-1">{tmpl.courses?.title}</p>
                                </div>
                                <div className="absolute top-2 right-2">{statusBadge(tmpl.status)}</div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col gap-3">
                                <div>
                                    <p className="text-sm font-black text-gray-900 line-clamp-1">{tmpl.courses?.title || 'Curso sin título'}</p>
                                    {tmpl.courses?.course_code && (
                                        <code className="text-[10px] font-bold text-[#b88000]">{tmpl.courses.course_code}</code>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">Firmado por: <span className="font-bold text-gray-600">{tmpl.signatory_name || '—'}</span></p>
                                </div>
                                <div className="flex gap-2 mt-auto">
                                    <button onClick={() => openEditor(tmpl)}
                                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-blue-50 rounded-xl text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors">
                                        <span className="material-symbols-outlined text-sm">edit</span> Editar
                                    </button>
                                    {tmpl.status !== 'published' ? (
                                        <button onClick={async () => {
                                            setEditingTemplate(tmpl);
                                            await supabase.from('certificate_templates').update({ status: 'published' }).eq('id', tmpl.id);
                                            loadAll();
                                        }}
                                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#f3b012]/10 hover:bg-[#f3b012]/20 rounded-xl text-xs font-bold text-[#b88000] transition-colors">
                                            <span className="material-symbols-outlined text-sm">send</span> Emitir
                                        </button>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold text-green-600 bg-green-50">
                                            <span className="material-symbols-outlined text-sm">check_circle</span> Activa
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    /* ══════════════════════════════════════════
       VIEW: Issued Certificates (worker certs)
       ══════════════════════════════════════════ */
    if (view === 'issued') return (
        <>
            {/* Always-mounted hidden PDF render div */}
            <div style={{ position: 'fixed', top: '-9999px', left: 0, width: '1920px', height: '1080px', overflow: 'hidden', pointerEvents: 'none', zIndex: -999 }}>
                <CertPreview
                    ref={pdfRenderRef}
                    fields={pdfFields || fields}
                    workerName={pdfFields?.previewName || ''}
                    certCodeWorker={pdfFields?.previewCertCode || ''}
                    pdfMode
                />
            </div>
            <section className="p-4 lg:p-6">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setView('templates')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                        <span className="text-sm font-medium">Plantillas</span>
                    </button>
                    <div>
                        <h3 className="text-black font-black text-2xl">Certificados Emitidos</h3>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Generados automáticamente al aprobar el examen final</p>
                    </div>
                </div>

                {issuedCerts.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
                        <span className="material-symbols-outlined text-6xl text-gray-200 block mb-4">workspace_premium</span>
                        <p className="text-gray-500 font-bold">Aún no hay certificados emitidos</p>
                        <p className="text-gray-400 text-sm mt-1">Los certificados aparecerán aquí cuando los trabajadores aprueben el examen final.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trabajador</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Curso</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Código Cert.</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Descargas</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Emisión</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Vencimiento</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {issuedCerts.map(cert => (
                                    <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-black">{cert.profiles?.full_name || '—'}</p>
                                            <p className="text-[10px] text-gray-400">{cert.profiles?.employee_id ? `ID: ${cert.profiles.employee_id}` : cert.profiles?.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-gray-700 line-clamp-1">{cert.courses?.title || '—'}</p>
                                            {cert.courses?.course_code && <code className="text-[9px] font-black text-[#b88000]">{cert.courses.course_code}</code>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <code className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded-lg text-gray-700">
                                                {cert.cert_code || cert.verification_code || '—'}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black ${cert.download_count >= cert.max_downloads ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                <span className="material-symbols-outlined text-xs">download</span>
                                                {cert.download_count}/{cert.max_downloads === 9999 ? '∞' : cert.max_downloads}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <p className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                                {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('es-ES') : '—'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <p className={`text-xs font-bold whitespace-nowrap ${cert.expiry_date && new Date(cert.expiry_date) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                                                {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('es-ES') : 'Indefinida'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                disabled={exporting}
                                                onClick={async () => {
                                                    const certDataFields = {
                                                        issuedBy: '',
                                                        customTitle: 'Certifica con orgullo a',
                                                        courseName: cert.courses?.title || '',
                                                        courseCode: cert.courses?.course_code || '',
                                                        signatoryName: '',
                                                        signatoryTitle: '',
                                                        issueDate: cert.issue_date
                                                            ? new Date(cert.issue_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                                            : new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
                                                        previewCertCode: '',
                                                        previewName: '',
                                                    };
                                                    await handleExportPDF(
                                                        cert.profiles?.full_name,
                                                        cert.cert_code || cert.verification_code,
                                                        certDataFields
                                                    );
                                                }}
                                                className="flex items-center gap-1 text-xs font-bold text-[#b88000] hover:underline mx-auto disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                                {exporting ? 'Exportando...' : 'Descargar PDF'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );

    /* ══════════════════════════════════════════
       VIEW: Template Editor
       ══════════════════════════════════════════ */
    return (
        <section className="p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <button onClick={() => setView('templates')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                    <span className="text-sm font-medium">Plantillas</span>
                </button>
                <div className="flex-1">
                    <h3 className="text-black font-black text-xl">
                        {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Certificado'}
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">Esta plantilla se llenará automáticamente con los datos del trabajador al aprobar el examen final.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleSave(false)} disabled={saving}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                        {saving ? 'Guardando...' : 'Guardar borrador'}
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-black hover:bg-gray-900 disabled:opacity-50 transition-colors">
                        <span className="material-symbols-outlined text-lg">send</span>
                        {saving ? '...' : 'Emitir plantilla'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* ─── Left: Form ─── */}
                <div className="flex flex-col gap-4">

                    {/* Course selector */}
                    <div className="bg-[#f3b012]/10 border-2 border-[#f3b012]/30 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-[#b88000] uppercase tracking-widest mb-2">⚠️ Curso al que pertenece este certificado</p>
                        <select className={inputCls}
                            value={fields.course_id}
                            onChange={e => {
                                const c = courses.find(x => x.id === e.target.value);
                                up('course_id', e.target.value);
                                up('courseName', c?.title || '');
                                up('courseCode', c?.course_code || '');
                            }}>
                            <option value="">— Selecciona el curso —</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.title}{c.course_code ? ` · ${c.course_code}` : ''}
                                </option>
                            ))}
                        </select>
                        {fields.courseCode && (
                            <p className="text-xs text-[#b88000] font-bold mt-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">qr_code</span>
                                Código del curso: <code className="ml-1">{fields.courseCode}</code>
                            </p>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
                        <h4 className="font-black text-gray-900 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-[#b88000]">edit_note</span>
                            Diseño de la Plantilla
                        </h4>

                        <div>
                            <p className="text-xs font-bold text-gray-500 mb-1.5">A nombre de (empresa emisora)</p>
                            <input className={inputCls} placeholder="Ej. Constructora EMAQ S.A." value={fields.issuedBy} onChange={e => up('issuedBy', e.target.value)} />
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 mb-1.5">Texto introductorio</p>
                            <input className={inputCls} placeholder="Certifica con orgullo a" value={fields.customTitle} onChange={e => up('customTitle', e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1.5">Nombre del firmante</p>
                                <input className={inputCls} placeholder="Ej. Ana Rodríguez" value={fields.signatoryName} onChange={e => up('signatoryName', e.target.value)} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1.5">Cargo del firmante</p>
                                <input className={inputCls} placeholder="Ej. Directora RRHH" value={fields.signatoryTitle} onChange={e => up('signatoryTitle', e.target.value)} />
                            </div>
                        </div>

                        {/* Issue date & validity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    Fecha de creación
                                </p>
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={fields.issueDateRaw || new Date().toISOString().slice(0, 10)}
                                    onChange={e => {
                                        up('issueDateRaw', e.target.value);
                                        up('issueDate', e.target.value ? new Date(e.target.value + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
                                    }}
                                />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">event_busy</span>
                                    Validez del certificado
                                </p>
                                <select className={inputCls} value={fields.validityMonths} onChange={e => up('validityMonths', parseInt(e.target.value))}>
                                    <option value={6}>6 meses</option>
                                    <option value={12}>1 año (12 meses)</option>
                                    <option value={18}>18 meses</option>
                                    <option value={24}>2 años (24 meses)</option>
                                    <option value={36}>3 años (36 meses)</option>
                                    <option value={0}>Sin vencimiento</option>
                                </select>
                                {fields.validityMonths > 0 && fields.issueDateRaw && (
                                    <p className="text-[10px] text-[#b88000] font-bold mt-1">
                                        Vence: {(() => { const d = new Date(fields.issueDateRaw + 'T12:00:00'); d.setMonth(d.getMonth() + parseInt(fields.validityMonths)); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); })()}
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">download_done</span>
                                    Intentos de descarga permitidos (operador)
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    max="999"
                                    className={inputCls}
                                    value={fields.maxDownloads}
                                    onChange={e => up('maxDownloads', parseInt(e.target.value) || 3)}
                                    placeholder="Ej: 3"
                                />
                                <p className="text-[10px] text-gray-400 font-bold mt-1">
                                    Límite de descargas de este certificado por operador.
                                </p>
                            </div>
                        </div>

                        {/* Digital Signature Upload */}

                        <div>
                            <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">draw</span>
                                Firma digital del responsable
                                <span className="text-gray-300 font-normal">(PNG sin fondo)</span>
                            </p>
                            {fields.signatureUrl ? (
                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                                    <img src={fields.signatureUrl} alt="Firma" className="h-10 object-contain" crossOrigin="anonymous" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-green-600 font-bold">✓ Firma cargada</p>
                                        <p className="text-[10px] text-gray-400 truncate">{fields.signatureUrl.split('/').pop()}</p>
                                    </div>
                                    <button type="button" onClick={() => up('signatureUrl', '')} className="text-red-400 hover:text-red-600 transition-colors">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 px-3 cursor-pointer hover:border-[#c9a227] hover:bg-yellow-50 transition-all">
                                    {uploadingSig ? (
                                        <div className="w-5 h-5 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-2xl text-gray-300">signature</span>
                                            <span className="text-xs text-gray-400 font-medium">Sube la firma del responsable en PNG (fondo transparente)</span>
                                            <span className="text-[10px] text-gray-300">Máx. 2 MB &middot; PNG / WebP</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/png,image/webp" className="hidden" onChange={e => handleSignatureUpload(e.target.files?.[0])} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Preview controls (helpers) */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                        <h4 className="font-black text-gray-900 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-blue-500">preview</span>
                            Datos de Vista Previa <span className="text-gray-300 font-normal text-xs ml-1">(no se guardan)</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1.5">Nombre de prueba del trabajador</p>
                                <input className={inputCls} value={fields.previewName} onChange={e => up('previewName', e.target.value)} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1.5">Código cert. de prueba</p>
                                <input className={inputCls} value={fields.previewCertCode} onChange={e => up('previewCertCode', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Right: Live preview ─── */}
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-black text-gray-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#b88000]">preview</span>
                        Vista previa de la plantilla
                    </p>
                    <CertPreview ref={previewRef} fields={fields} />

                    {/* Hidden 1920×1080 render target for PDF — exactly 16:9 px */}
                    <div style={{ position: 'fixed', top: '-9999px', left: 0, width: '1920px', height: '1080px', overflow: 'hidden', pointerEvents: 'none', zIndex: -999 }}>
                        <CertPreview
                            ref={pdfRenderRef}
                            fields={pdfFields || fields}
                            workerName={pdfFields ? pdfFields.previewName : fields.previewName}
                            certCodeWorker={pdfFields ? pdfFields.previewCertCode : fields.previewCertCode}
                            pdfMode
                        />
                    </div>

                    <button
                        disabled={exporting}
                        onClick={() => handleExportPDF(fields.previewName, fields.previewCertCode)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        {exporting ? 'Generando PDF...' : 'Probar descarga PDF'}
                    </button>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 font-medium">
                        <strong>💡 Recuerda:</strong> Al hacer clic en <strong>"Emitir plantilla"</strong>, esta plantilla quedará activa para el curso seleccionado. Cada vez que un trabajador apruebe el examen final, su certificado se generará automáticamente con su nombre y código de certificado.
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CertificateGenerator;

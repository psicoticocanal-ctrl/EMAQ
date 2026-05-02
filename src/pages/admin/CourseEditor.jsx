import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { createCourse, updateCourse as updateCourseService } from '../../lib/courseService';

/* ─── Helpers ─── */
const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#f3b012] focus:ring-2 focus:ring-[#f3b012]/10 transition-all";
const Field = ({ label, children, hint }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-gray-700">{label}</label>
        {children}
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
);

/* ─── File type metadata ─── */
const FILE_TYPES = {
    pdf: { label: 'PDF', icon: 'picture_as_pdf', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', accept: 'application/pdf', ext: 'pdf' },
    word: { label: 'Word', icon: 'description', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', accept: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'doc,docx' },
    excel: { label: 'Excel', icon: 'table_view', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100', accept: '.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xls,xlsx,csv' },
    video: { label: 'Video', icon: 'play_circle', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', accept: 'video/mp4,video/webm', ext: 'mp4,webm' },
    text: { label: 'Texto', icon: 'text_snippet', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', accept: null, ext: null },
};

/* ─── Content File Uploader ─── */
const ContentUploader = ({ contentType, contentUrl, contentText, onChangeType, onChangeUrl, onChangeText }) => {
    const inputRef = useRef();
    const [uploading, setUploading] = useState(false);

    // Ensure we have a valid meta object
    const currentType = contentType || 'pdf';
    const meta = FILE_TYPES[currentType] || FILE_TYPES.pdf;
    const fileName = contentUrl ? contentUrl.split('/').pop().split('?')[0] : null;

    const handleFile = async (file) => {
        if (!file) return;
        const MAX = 50 * 1024 * 1024;
        if (file.size > MAX) { alert('El archivo no puede superar 50MB.'); return; }
        
        // Auto-detect type based on extension
        const ext = file.name.split('.').pop().toLowerCase();
        let detectedType = contentType;
        if (ext === 'pdf') detectedType = 'pdf';
        else if (['doc', 'docx'].includes(ext)) detectedType = 'word';
        else if (['xls', 'xlsx', 'csv'].includes(ext)) detectedType = 'excel';
        else if (['mp4', 'webm', 'mov'].includes(ext)) detectedType = 'video';
        
        if (detectedType !== contentType) {
            onChangeType(detectedType);
        }

        setUploading(true);
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `modules/${Date.now()}_${safeName}`;
            const { error: upErr } = await supabase.storage
                .from('module-content')
                .upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('module-content').getPublicUrl(path);
            onChangeUrl(data.publicUrl);
        } catch (e) {
            console.error('Upload error:', e);
            alert('Error al subir el archivo: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async (e) => {
        e.stopPropagation();
        if (!contentUrl) return;
        try {
            const parts = contentUrl.split('/module-content/');
            if (parts[1]) await supabase.storage.from('module-content').remove([parts[1]]);
        } catch { }
        onChangeUrl('');
    };

    const handleTypeChange = (key) => {
        console.log("DEBUG: Cambiando tipo a ->", key);
        // Actualizamos primero el tipo
        onChangeType(key);
        // Si el tipo cambia, forzamos la limpieza de los campos de contenido
        if (key !== currentType) {
            onChangeUrl('');
            onChangeText('');
        }
    };

    return (
        <div className="flex flex-col gap-5 p-5 bg-gray-50/50 rounded-3xl border border-gray-100">
            {/* Step 1: Type selection */}
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">1. Tipo de Contenido</label>
                <select 
                    value={currentType} 
                    onChange={(e) => {
                        const val = e.target.value;
                        console.log("Seleccionado:", val);
                        handleTypeChange(val);
                    }}
                    className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:border-[#f3b012] transition-all shadow-md cursor-pointer block"
                    style={{ WebkitAppearance: 'menulist' }}
                >
                    {Object.entries(FILE_TYPES).map(([key, t]) => (
                        <option key={key} value={key}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Step 2: Content Area (Only if type is selected) */}
            {contentType && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">2. Cargar {meta.label}</p>
                    <div className="relative">
                        {contentType === 'text' ? (
                            <textarea
                                className={`${inputCls} min-h-[160px] resize-none border-2 focus:border-[#f3b012] bg-white`}
                                placeholder="Escribe el contenido de texto, instrucciones o apuntes de la lección..."
                                value={contentText || ''}
                                onChange={e => onChangeText(e.target.value)}
                            />
                        ) : contentUrl ? (
                            <div className={`flex items-center gap-4 p-5 rounded-3xl border-2 ${meta.border} ${meta.bg} shadow-sm bg-white`}>
                                <div className={`w-14 h-14 rounded-2xl ${meta.bg} border-2 ${meta.border} flex items-center justify-center shrink-0`}>
                                    <span className={`material-symbols-outlined text-3xl ${meta.color}`}>{meta.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-gray-900 truncate">{decodeURIComponent(fileName || 'Archivo subido')}</p>
                                    <div className="flex gap-3 mt-1">
                                        <a href={contentUrl} target="_blank" rel="noreferrer"
                                            className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">open_in_new</span> Ver archivo
                                        </a>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button type="button" onClick={() => inputRef.current?.click()}
                                        className="w-10 h-10 rounded-xl bg-white border-2 border-gray-100 text-gray-500 hover:text-[#b88000] hover:border-[#f3b012] transition-all flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-xl">swap_horiz</span>
                                    </button>
                                    <button type="button" onClick={handleRemove}
                                        className="w-10 h-10 rounded-xl bg-white border-2 border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => !uploading && inputRef.current?.click()}
                                className={`border-2 border-dashed border-gray-200 bg-white hover:border-[#f3b012] hover:bg-[#f3b012]/5 rounded-3xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all group ${uploading ? 'opacity-50' : ''}`}
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-10 h-10 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm font-black text-[#b88000]">Subiendo...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className={`w-16 h-16 rounded-full ${meta.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <span className={`material-symbols-outlined text-4xl ${meta.color}`}>{meta.icon}</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-gray-700">Seleccionar {meta.label}</p>
                                            <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wider">Máx 50MB</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <input
                ref={inputRef}
                type="file"
                accept={meta.accept || '*'}
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
            />
        </div>
    );
};

/* ─── Image Upload Widget ─── */
const ImageUpload = ({ value, onChange, bucket = 'course-images', folder = 'thumbnails' }) => {
    const inputRef = useRef();
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(value || null);

    const handleFile = async (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('La imagen no puede superar 5MB.'); return; }
        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `${folder}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
            setPreview(data.publicUrl);
            onChange(data.publicUrl);
        } catch (e) {
            console.error('Upload error:', e);
            alert('Error al subir la imagen. Verifica que el bucket "' + bucket + '" exista en Supabase Storage.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative">
            {preview ? (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm group">
                    <img src={preview} alt="Portada" className="w-full h-44 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => inputRef.current?.click()}
                            className="bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-100">
                            <span className="material-symbols-outlined text-sm align-middle mr-1">image</span>
                            Cambiar
                        </button>
                        <button type="button" onClick={() => { setPreview(null); onChange(''); }}
                            className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-600">
                            Eliminar
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => !uploading && inputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-[#f3b012] rounded-2xl p-10 flex flex-col items-center gap-2 cursor-pointer transition-colors group"
                >
                    {uploading ? (
                        <div className="w-8 h-8 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-gray-300 group-hover:text-[#f3b012] text-5xl transition-colors">image</span>
                            <p className="text-sm font-bold text-gray-400 group-hover:text-[#f3b012] transition-colors">Haz clic para subir imagen de portada</p>
                            <p className="text-xs text-gray-300">PNG, JPG — máx 5MB</p>
                        </>
                    )}
                </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </div>
    );
};

/* ─── Question Editor ─── */
const QuestionEditor = ({ question, qIndex, onChange, onRemove }) => {
    const updateQuestion = (field, val) => onChange({ ...question, [field]: val });

    const updateOption = (oIdx, field, val) => {
        const newOpts = (question.options || []).map((o, i) =>
            i === oIdx ? { ...o, [field]: val } : (field === 'correct' && val ? { ...o, correct: false } : o)
        );
        updateQuestion('options', newOpts);
    };

    const addOption = () => updateQuestion('options', [...(question.options || []), { text: '', correct: false }]);
    const removeOption = (oIdx) => updateQuestion('options', (question.options || []).filter((_, i) => i !== oIdx));

    const type = question.type || 'multiple_choice';

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header info */}
            <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center gap-3 flex-1">
                    <span className="text-[10px] font-black text-gray-400 bg-gray-200 rounded-lg px-2 py-1 shrink-0">P{qIndex + 1}</span>
                    <select 
                        value={type} 
                        onChange={(e) => updateQuestion('type', e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-gray-500 outline-none focus:border-[#f3b012]"
                    >
                        <option value="multiple_choice">Opción Múltiple</option>
                        <option value="dropdown">Desplegable (Dropdown)</option>
                        <option value="open_ended">Pregunta Abierta</option>
                    </select>
                </div>
                <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 p-1">
                    <span className="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
                {/* Question text */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enunciado de la Pregunta</label>
                    <textarea
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#f3b012] focus:ring-2 focus:ring-[#f3b012]/10 transition-all resize-none min-h-[60px]"
                        placeholder="Escribe la pregunta aquí..."
                        value={question.text}
                        onChange={e => updateQuestion('text', e.target.value)}
                    />
                </div>

                {/* Question Image */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Imagen de Apoyo (Opcional)</label>
                    <div className="max-w-[300px]">
                        <ImageUpload 
                            value={question.image_url} 
                            onChange={(url) => updateQuestion('image_url', url)}
                            folder="quiz-images"
                        />
                    </div>
                </div>

                {/* Question Options */}
                {type !== 'open_ended' ? (
                    <div className="flex flex-col gap-2">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                            Opciones · {type === 'multiple_choice' ? 'Marca la respuesta correcta' : 'Elige la opción que aparecerá en el menú'}
                        </p>
                        {(question.options || []).map((opt, oIdx) => (
                            <div key={oIdx} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${opt.correct ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                                <button
                                    onClick={() => updateOption(oIdx, 'correct', true)}
                                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${opt.correct ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}
                                >
                                    {opt.correct && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                </button>
                                <input
                                    className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder-gray-300"
                                    placeholder={`Opción ${oIdx + 1}`}
                                    value={opt.text}
                                    onChange={e => updateOption(oIdx, 'text', e.target.value)}
                                />
                                {(question.options || []).length > 2 && (
                                    <button onClick={() => removeOption(oIdx)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-base">close</span>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={addOption} className="mt-1 text-xs font-bold text-[#f3b012] hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">add</span> Añadir opción
                        </button>
                    </div>
                ) : (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-400 text-2xl">info</span>
                        <div>
                            <p className="text-blue-700 text-xs font-bold">Pregunta Abierta</p>
                            <p className="text-blue-500 text-[10px]">El usuario tendrá un espacio de texto para responder. Esta respuesta no se califica automáticamente.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Quiz Panel ─── */
const QuizPanel = ({ title, icon, questions, onChange, accentColor = 'blue' }) => {
    const addQuestion = () => onChange([...questions, {
        text: '',
        type: 'multiple_choice',
        image_url: '',
        options: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }]
    }]);
    const colors = {
        blue: 'bg-blue-600',
        amber: 'bg-[#f3b012]',
    };

    return (
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <span className={`material-symbols-outlined text-${accentColor === 'blue' ? 'blue' : '[#b88000]'}-600`}>{icon}</span>
                    {title}
                </h4>
                <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded-lg">{questions.length} preguntas</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
                {questions.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                        <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">quiz</span>
                        <p className="text-sm font-medium">Sin preguntas aún. Añade la primera.</p>
                    </div>
                )}
                {questions.map((q, i) => (
                    <QuestionEditor
                        key={i}
                        question={q}
                        qIndex={i}
                        onChange={(updated) => onChange(questions.map((x, xi) => xi === i ? updated : x))}
                        onRemove={() => onChange(questions.filter((_, xi) => xi !== i))}
                    />
                ))}
                <button onClick={addQuestion}
                    className="w-full py-3 border-2 border-dashed border-gray-200 hover:border-[#f3b012] rounded-xl text-sm font-bold text-gray-400 hover:text-[#f3b012] flex items-center justify-center gap-2 transition-colors">
                    <span className="material-symbols-outlined">add_circle</span>
                    Nueva Pregunta
                </button>
            </div>
        </div>
    );
};

/* ─── Module Item ─── */
const ModuleItem = ({ mod, index, onChange, onRemove }) => {
    const [showQuiz, setShowQuiz] = useState(false);

    const updateField = (field, val) => {
        const updated = { ...mod, [field]: val };
        onChange(updated);
    };

    return (
        <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-gray-50/30">
                <span className="w-7 h-7 rounded-lg bg-gray-200 text-gray-500 text-xs font-black flex items-center justify-center shrink-0">{index + 1}</span>
                <input
                    className="flex-1 bg-transparent border-none outline-none font-bold text-gray-900 text-sm placeholder-gray-300"
                    placeholder="Título del módulo..."
                    value={mod.title}
                    onChange={e => updateField('title', e.target.value)}
                />
                <button onClick={() => updateField('expanded', !mod.expanded)} className="text-gray-400 hover:text-gray-700 transition-colors">
                    <span className="material-symbols-outlined">{mod.expanded ? 'expand_less' : 'expand_more'}</span>
                </button>
                <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors">
                    <span className="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>

            {mod.expanded && (
                <div className="border-t border-gray-100 p-4 flex flex-col gap-4">
                    {/* Description */}
                    <Field label="Descripción del módulo">
                        <textarea
                            className={`${inputCls} min-h-[80px] resize-none`}
                            placeholder="Describe el contenido de este módulo..."
                            value={mod.description || ''}
                            onChange={e => updateField('description', e.target.value)}
                        />
                    </Field>

                    {/* Image */}
                    <Field label="Imagen del módulo">
                        <ImageUpload
                            value={mod.image_url}
                            onChange={(url) => updateField('image_url', url)}
                            folder="modules"
                        />
                    </Field>

                    {/* Content File Upload */}
                    <Field label="Contenido del módulo" hint="Sube el archivo de la actividad directamente al almacenamiento.">
                        <ContentUploader
                            contentType={mod.content_type || 'pdf'}
                            contentUrl={mod.content_url || ''}
                            contentText={mod.content_text || ''}
                            onChangeType={(val) => updateField('content_type', val)}
                            onChangeUrl={(val) => updateField('content_url', val)}
                            onChangeText={(val) => updateField('content_text', val)}
                        />
                    </Field>

                    {/* Module Quiz */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600 text-lg">fact_check</span>
                                Cuestionario del Módulo
                            </p>
                            <button onClick={() => setShowQuiz(!showQuiz)}
                                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                {showQuiz ? 'Ocultar' : `${(mod.quiz || []).length > 0 ? 'Ver/Editar' : 'Agregar'} cuestionario`}
                                <span className="material-symbols-outlined text-sm">{showQuiz ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                            </button>
                        </div>
                        {showQuiz && (
                            <QuizPanel
                                title="Preguntas del módulo"
                                icon="quiz"
                                questions={mod.quiz || []}
                                onChange={(q) => updateField('quiz', q)}
                                accentColor="blue"
                            />
                        )}
                        {!showQuiz && (mod.quiz || []).length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-blue-600">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                <span className="font-bold">{mod.quiz.length} {mod.quiz.length === 1 ? 'pregunta' : 'preguntas'} configuradas</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   Main CourseEditor component
   ════════════════════════════════════════════════════════════ */
const CourseEditor = ({ course: initialCourse = null, companyId, createdBy, onBack, onSave }) => {
    const [tab, setTab] = useState('general');
    const [course, setCourse] = useState({
        title: '',
        description: '',
        category: 'Maquinaria Pesada',
        role: 'Operador',
        duration: '',
        difficulty: 'Básico',
        thumbnail_url: '',
        course_code: '',
        requiresApproval: false,
        certOnComplete: true,
        allowRetakes: true,
        ...(initialCourse || {})
    });
    const [modules, setModules] = useState([]);
    const [finalExam, setFinalExam] = useState([]);
    const [loading, setLoading] = useState(!!initialCourse?.id);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const isNew = !initialCourse?.id;

    // Load existing data
    useEffect(() => {
        if (!initialCourse?.id) { setLoading(false); return; }
        setLoading(true);
        Promise.all([
            supabase.from('modules').select('*').eq('course_id', initialCourse.id).order('sort_order'),
            supabase.from('evaluations').select('*').eq('course_id', initialCourse.id)
        ]).then(([{ data: mods }, { data: evals }]) => {
            if (mods) {
                // Load each module's quiz
                Promise.all(mods.map(async m => {
                    const { data: mEvals } = await supabase.from('evaluations')
                        .select('*').eq('module_id', m.id).eq('type', 'module_quiz');
                    return {
                        ...m,
                        expanded: false,
                        quiz: mEvals?.[0]?.questions || [],
                        _evalId: mEvals?.[0]?.id || null
                    };
                })).then(enriched => setModules(enriched));
            }
            const exam = evals?.find(e => e.type === 'final_exam');
            if (exam) {
                setFinalExam(exam.questions || []);
            }
            setLoading(false);
        });
    }, [initialCourse?.id]);

    const updateField = (key, val) => setCourse(prev => ({ ...prev, [key]: val }));

    const addModule = () => setModules(prev => [...prev, {
        title: '',
        description: '',
        content_type: 'pdf',
        content_url: '',
        content_text: '',
        image_url: '',
        quiz: [],
        expanded: true,
        _evalId: null
    }]);

    const handleSave = async (isPublish = false) => {
        if (!course.title.trim()) { alert('El curso debe tener un título.'); return; }
        setSaving(true);
        try {
            const courseData = {
                title: course.title,
                description: course.description,
                category: course.category,
                job_role: course.role,
                duration: course.duration,
                difficulty: course.difficulty,
                thumbnail_url: course.thumbnail_url || null,
                course_code: course.course_code ? `CURSOEMAQ-${course.course_code.replace(/^CURSOEMAQ-/i, '')}` : null,
                company_id: companyId,
                created_by: createdBy,
                status: isPublish ? 'published' : (course.status || 'draft')
            };

            let savedCourse;
            if (isNew) {
                savedCourse = await createCourse(courseData);
            } else {
                const { data } = await supabase.from('courses').update(courseData).eq('id', initialCourse.id).select().single();
                savedCourse = data;
            }
            if (!savedCourse?.id) throw new Error('No se pudo obtener el ID del curso guardado.');

            const courseId = savedCourse.id;

            // Save modules
            const existingIds = modules.filter(m => m.id).map(m => m.id);
            const { data: dbMods } = await supabase.from('modules').select('id').eq('course_id', courseId);
            const toDelete = (dbMods || []).filter(m => !existingIds.includes(m.id)).map(m => m.id);
            if (toDelete.length > 0) {
                await supabase.from('evaluations').delete().in('module_id', toDelete);
                await supabase.from('modules').delete().in('id', toDelete);
            }

            for (let i = 0; i < modules.length; i++) {
                const m = modules[i];
                const modData = {
                    course_id: courseId,
                    title: m.title || `Módulo ${i + 1}`,
                    description: m.description || null,
                    content_url: m.content_url || null,
                    content_type: m.content_type || 'pdf',
                    content_text: m.content_text || null,
                    image_url: m.image_url || null,
                    sort_order: i + 1
                };

                let modId = m.id;
                if (modId) {
                    const { error: upErr } = await supabase.from('modules').update(modData).eq('id', modId);
                    if (upErr) throw upErr;
                } else {
                    const { data, error: insErr } = await supabase.from('modules').insert(modData).select().single();
                    if (insErr) throw insErr;
                    modId = data?.id;
                }

                // Save module quiz
                if (modId) {
                    const evalData = {
                        module_id: modId,
                        course_id: courseId,
                        type: 'module_quiz',
                        questions: m.quiz || [],
                        passing_score: 70
                    };
                    if (m._evalId) {
                        const { error: evUpErr } = await supabase.from('evaluations').update(evalData).eq('id', m._evalId);
                        if (evUpErr) throw evUpErr;
                    } else if ((m.quiz || []).length > 0) {
                        const { error: evInsErr } = await supabase.from('evaluations').insert(evalData);
                        if (evInsErr) throw evInsErr;
                    }
                }
            }

            // Save final exam
            const { data: existingExam } = await supabase.from('evaluations')
                .select('id').eq('course_id', courseId).eq('type', 'final_exam').maybeSingle();

            if (finalExam.length > 0) {
                const examData = {
                    course_id: courseId,
                    type: 'final_exam',
                    questions: finalExam,
                    passing_score: 70,
                    module_id: null
                };
                if (existingExam) {
                    const { error: exUpErr } = await supabase.from('evaluations').update(examData).eq('id', existingExam.id);
                    if (exUpErr) throw exUpErr;
                } else {
                    const { error: exInsErr } = await supabase.from('evaluations').insert(examData);
                    if (exInsErr) throw exInsErr;
                }
            }

            setSaved(true);
            setTimeout(() => { setSaved(false); if (isPublish) onSave?.(savedCourse); }, 1500);
            if (!isPublish) onSave?.(savedCourse);
        } catch (e) {
            console.error('Error saving:', e);
            alert('Error al guardar el curso: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm">Cargando curso...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* ── Sticky Header ── */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">
                <div className="flex items-center px-4 py-3 gap-3 max-w-3xl mx-auto w-full">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors shrink-0">
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                        <span className="text-sm font-medium hidden sm:block">Cursos</span>
                    </button>
                    <h2 className="flex-1 text-gray-900 text-base font-bold truncate">
                        {isNew ? 'Nuevo Curso' : `Editar: ${course.title || 'Sin título'}`}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleSave(false)} disabled={saving}
                            className={`text-sm font-bold transition-colors px-3 py-2 rounded-xl ${saved ? 'text-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-50`}>
                            {saved ? '✓ Guardado' : saving ? '...' : 'Guardar'}
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="bg-[#f3b012] text-black px-4 py-2 rounded-xl text-sm font-black shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                            {saving ? 'Guardando...' : 'Publicar'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-4 gap-0 border-t border-gray-100 max-w-3xl mx-auto w-full">
                    {[
                        { id: 'general', label: 'General', icon: 'info' },
                        { id: 'modulos', label: `Módulos (${modules.length})`, icon: 'layers' },
                        { id: 'examen', label: `Examen Final (${finalExam.length})`, icon: 'assignment_turned_in' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${tab === t.id ? 'border-[#f3b012] text-[#b88000]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                            <span className="material-symbols-outlined text-base">{t.icon}</span>
                            <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* ── Content ── */}
            <main className="flex-1 p-4 lg:p-6 pb-10 max-w-3xl mx-auto w-full">

                {/* ── Tab: General ── */}
                {tab === 'general' && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-gray-900 text-xl font-black">Detalles del Curso</h2>

                        <Field label="Título del Curso">
                            <input className={inputCls} value={course.title}
                                onChange={e => updateField('title', e.target.value)}
                                placeholder="Ej. Seguridad en Operación de Excavadoras" />
                        </Field>

                        {/* ── Course Code Card ── */}
                        <div className="bg-black rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-[#f3b012] text-xl">qr_code</span>
                                <h4 className="font-black text-white text-sm">Código del Curso</h4>
                                <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded-lg">ÚNICO POR CURSO</span>
                            </div>
                            <p className="text-gray-400 text-xs mb-4">
                                Asigna un código para que los trabajadores ingresen al curso. El formato siempre será <span className="text-[#f3b012] font-bold">CURSOEMAQ-</span> seguido del sufijo que elijas.
                            </p>
                            <div className="flex gap-2 items-center">
                                <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex-1">
                                    <span className="text-[#f3b012] font-black text-sm px-3 py-3 border-r border-gray-700 whitespace-nowrap select-none">CURSOEMAQ-</span>
                                    <input
                                        className="flex-1 bg-transparent px-3 py-3 text-white text-sm font-bold outline-none placeholder-gray-600 uppercase"
                                        placeholder="Ej. 2026001"
                                        value={(course.course_code || '').replace(/^CURSOEMAQ-/i, '')}
                                        onChange={e => updateField('course_code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                        maxLength={20}
                                    />
                                </div>
                                <button
                                    type="button"
                                    title="Generar código aleatorio"
                                    onClick={() => updateField('course_code', Math.floor(Date.now() / 1000).toString())}
                                    className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">refresh</span>
                                </button>
                                {course.course_code && (
                                    <button
                                        type="button"
                                        title="Copiar código completo"
                                        onClick={() => {
                                            const full = `CURSOEMAQ-${(course.course_code || '').replace(/^CURSOEMAQ-/i, '')}`;
                                            navigator.clipboard.writeText(full);
                                        }}
                                        className="p-3 rounded-xl bg-[#f3b012]/20 hover:bg-[#f3b012]/30 text-[#f3b012] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">content_copy</span>
                                    </button>
                                )}
                            </div>
                            {course.course_code && (
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                                    <p className="text-green-400 text-xs font-bold">
                                        Código asignado: <span className="text-white">CURSOEMAQ-{(course.course_code || '').replace(/^CURSOEMAQ-/i, '')}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <Field label="Descripción" hint="Explica qué aprenderán los operadores.">
                            <textarea className={`${inputCls} min-h-[110px] resize-none`} value={course.description}
                                onChange={e => updateField('description', e.target.value)}
                                placeholder="Describe el objetivo del curso..." />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Categoría">
                                <select className={inputCls} value={course.category} onChange={e => updateField('category', e.target.value)}>
                                    <option>Maquinaria Pesada</option>
                                    <option>Seguridad</option>
                                    <option>Mantenimiento</option>
                                    <option>Liderazgo</option>
                                    <option>Operaciones</option>
                                    <option>Otro</option>
                                </select>
                            </Field>
                            <Field label="Rol objetivo">
                                <select className={inputCls} value={course.role} onChange={e => updateField('role', e.target.value)}>
                                    <option>Operador</option>
                                    <option>Supervisor</option>
                                    <option>Técnico</option>
                                    <option>Inspector</option>
                                    <option>Todos</option>
                                </select>
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Duración estimada">
                                <input className={inputCls} value={course.duration}
                                    onChange={e => updateField('duration', e.target.value)}
                                    placeholder="Ej. 3 horas" />
                            </Field>
                            <Field label="Nivel de dificultad">
                                <select className={inputCls} value={course.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                                    <option>Básico</option>
                                    <option>Intermedio</option>
                                    <option>Avanzado</option>
                                </select>
                            </Field>
                        </div>

                        <Field label="Imagen de portada del curso">
                            <ImageUpload
                                value={course.thumbnail_url}
                                onChange={(url) => updateField('thumbnail_url', url)}
                                folder="thumbnails"
                            />
                        </Field>

                        {/* Settings */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#b88000]">tune</span>
                                Opciones del Curso
                            </h4>
                            {[
                                { key: 'certOnComplete', label: 'Emitir certificado al completar', sub: 'Genera certificado automático al aprobar el examen final' },
                                { key: 'allowRetakes', label: 'Permitir reintentos', sub: 'El trabajador puede repetir módulos y el examen final' },
                                { key: 'requiresApproval', label: 'Requiere aprobación previa', sub: 'El admin debe aprobar manualmente a cada trabajador' },
                            ].map(opt => (
                                <div key={opt.key} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                                    </div>
                                    <button onClick={() => updateField(opt.key, !course[opt.key])}
                                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${course[opt.key] ? 'bg-[#f3b012]' : 'bg-gray-200'}`}>
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${course[opt.key] ? 'left-[22px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Tab: Módulos ── */}
                {tab === 'modulos' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-gray-900 text-xl font-black">Módulos del Curso</h2>
                                <p className="text-gray-400 text-xs font-medium mt-0.5">Cada módulo puede tener contenido y un cuestionario propio.</p>
                            </div>
                            <button onClick={addModule}
                                className="flex items-center gap-1.5 bg-[#f3b012] text-black font-black text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0">
                                <span className="material-symbols-outlined text-lg">add</span>
                                <span className="hidden sm:inline">Módulo</span>
                            </button>
                        </div>

                        {modules.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                                <span className="material-symbols-outlined text-6xl text-gray-200 block mb-3">layers</span>
                                <p className="text-gray-500 font-bold mb-1">Sin módulos aún</p>
                                <p className="text-gray-400 text-sm mb-4">Crea el primer módulo para empezar a estructurar el curso.</p>
                                <button onClick={addModule}
                                    className="bg-[#f3b012] text-black font-black text-sm px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                                    + Crear primer módulo
                                </button>
                            </div>
                        )}

                        {modules.map((mod, i) => (
                            <ModuleItem
                                key={i}
                                mod={mod}
                                index={i}
                                onChange={(updated) => setModules(prev => prev.map((m, mi) => mi === i ? updated : m))}
                                onRemove={() => setModules(prev => prev.filter((_, mi) => mi !== i))}
                            />
                        ))}

                        {modules.length > 0 && (
                            <button onClick={addModule}
                                className="w-full py-3 border-2 border-dashed border-gray-200 hover:border-[#f3b012] rounded-2xl text-sm font-bold text-gray-400 hover:text-[#f3b012] flex items-center justify-center gap-2 transition-colors mt-2">
                                <span className="material-symbols-outlined">add</span>
                                Agregar otro módulo
                            </button>
                        )}
                    </div>
                )}

                {/* ── Tab: Examen Final ── */}
                {tab === 'examen' && (
                    <div className="flex flex-col gap-5">
                        <div>
                            <h2 className="text-gray-900 text-xl font-black">Examen Final</h2>
                            <p className="text-gray-400 text-xs font-medium mt-0.5">
                                El examen final evalúa el conocimiento completo del curso. Se requiere una nota mínima de 70% para aprobar.
                            </p>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                            <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">info</span>
                            <div>
                                <p className="text-sm font-bold text-amber-800">Examen habilitador de certificado</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    El trabajador debe completar todos los módulos y aprobar este examen para obtener su certificado.
                                </p>
                            </div>
                        </div>

                        <QuizPanel
                            title="Preguntas del Examen Final"
                            icon="assignment_turned_in"
                            questions={finalExam}
                            onChange={setFinalExam}
                            accentColor="amber"
                        />

                        {finalExam.length === 0 && (
                            <p className="text-center text-xs text-gray-400 font-medium -mt-2">
                                Sin examen final configurado, el curso no emitirá certificados.
                            </p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default CourseEditor;

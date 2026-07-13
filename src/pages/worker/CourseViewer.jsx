import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCourseWithModules } from '../../lib/courseService';
import { getCourseProgress, markModuleComplete } from '../../lib/progressService';
import { supabase } from '../../lib/supabase';
import ExamView from './ExamView';
import { getBestScore, getAttempts } from '../../lib/examService';
import { notifyCompanyOnQuizAttemptRequest } from '../../lib/notificationService';


/* ─── Video/Content Player ─── */
const ContentDisplay = ({ module, courseTitle }) => {
    if (!module) return <div className="bg-slate-900 aspect-video flex items-center justify-center text-gray-500"><span className="text-sm font-medium">Selecciona un módulo para comenzar</span></div>;

    const openInNewTab = (url) => {
        const win = window.open(url, '_blank');
        if (win) win.focus();
    };

    if (module.content_type === 'video' && module.content_url) {
        return (
            <div className="bg-black aspect-video relative group select-none">
                <video src={module.content_url} className="w-full h-full" controls poster={module.image_url || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop"} />
            </div>
        );
    }

    if ((module.content_type === 'pdf' || module.content_type === 'word' || module.content_type === 'excel') && module.content_url) {
        const isPdf = module.content_type === 'pdf';
        const isExcel = module.content_type === 'excel';
        const icon = isPdf ? 'picture_as_pdf' : isExcel ? 'table_view' : 'description';
        const iconColor = isPdf ? 'text-red-500' : isExcel ? 'text-green-600' : 'text-blue-600';
        const label = isPdf ? 'Documento PDF' : isExcel ? 'Archivo Excel' : 'Documento Word';

        return (
            <div className="bg-slate-100 aspect-video relative flex flex-col items-center justify-center p-6 border-b border-gray-200">
                <div className={`w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4 border-2 border-gray-50`}>
                    <span className={`material-symbols-outlined text-5xl ${iconColor}`}>{icon}</span>
                </div>
                <p className="text-gray-900 font-black mb-1">{label}</p>
                <p className="text-gray-400 text-xs font-bold mb-5 truncate max-w-xs">{module.title}</p>
                <button
                    onClick={() => openInNewTab(module.content_url)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-sm font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-base">download</span>
                    Ver o Descargar Archivo
                </button>
            </div>
        );
    }

    if (module.content_type === 'text') {
        return (
            <div className="bg-white aspect-video overflow-y-auto p-4 lg:p-8 border-b border-gray-200">
                <div className="prose prose-sm max-w-none">
                    <h2 className="text-xl font-black text-gray-900 mb-4">{module.title}</h2>
                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">{module.content_text || 'No hay contenido adicional.'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 aspect-video flex flex-col items-center justify-center text-gray-400 gap-3 border-b border-gray-200">
            <span className="material-symbols-outlined text-5xl">inventory_2</span>
            <p className="text-xs font-bold uppercase tracking-wider">Este módulo no tiene contenido multimedia</p>
        </div>
    );
};

/* ─── Module status icon ─── */
const ModuleIcon = ({ status }) => {
    if (status === 'completed') return <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>;
    if (status === 'active') return <span className="material-symbols-outlined text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>;
    return <span className="material-symbols-outlined text-gray-400">lock</span>;
};

/* ─── Lesson item ─── */
const LessonItem = ({ lesson, isActive }) => {
    const isCurrent = lesson.status === 'current';
    const isDone = lesson.status === 'done';
    const isLocked = lesson.status === 'locked';

    return (
        <div className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}>
            {isDone
                ? <span className="material-symbols-outlined text-green-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                : isCurrent
                    ? <span className="material-symbols-outlined text-blue-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                    : isLocked
                        ? <span className="material-symbols-outlined text-gray-400 text-lg">lock</span>
                        : <span className="material-symbols-outlined text-gray-400 text-lg">play_circle</span>
            }
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-${isCurrent ? 'bold' : 'medium'} truncate ${isCurrent ? 'text-blue-600' : 'text-gray-900'}`}>
                    Lección {lesson.id}: {lesson.title}
                </p>
                <p className={`text-xs ${isCurrent ? 'text-blue-400' : 'text-gray-400'}`}>
                    {isCurrent ? 'Viendo ahora • ' : isDone ? 'Completado • ' : 'Pendiente • '}{lesson.duration}
                </p>
            </div>
            {isCurrent && (
                <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase shrink-0">EN CURSO</span>
            )}
        </div>
    );
};

/* ─── Module accordion ─── */
const ModuleAccordion = ({ mod, index, isLocked, isCompleted, isActive, expanded, onToggle, onClick, onTakeQuiz, progress, onRequestQuizAttempt, requestingQuizId }) => {
    return (
        <div className={`rounded-2xl overflow-hidden border transition-all ${isActive ? 'border-2 border-blue-400 ring-4 ring-blue-50 shadow-md' : isLocked ? 'border border-gray-100 opacity-60' : 'border border-gray-100 bg-white'}`}>
            <button
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isActive ? 'bg-blue-50' : isCompleted ? 'bg-emerald-50/30' : 'bg-white'}`}
                onClick={onToggle}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {isCompleted ? (
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                        )}
                    </div>
                    <div>
                        <h4 className="text-gray-900 text-sm font-black tracking-tight leading-tight">{mod.title || `Módulo ${index + 1}`}</h4>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">{mod.content_type || 'Lectura'}</p>
                    </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-xl transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
                    expand_more
                </span>
            </button>

            {expanded && (
                <div className="p-4 bg-gray-50/30 border-t border-gray-100 space-y-3">
                    {/* Material button */}
                    {!isLocked ? (
                        <button
                            disabled={isLocked}
                            onClick={onClick}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50'} disabled:opacity-50`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">
                                    {mod.content_type === 'video' ? 'play_circle' : 'description'}
                                </span>
                                <div className="text-left flex-1">
                                    <p className="text-xs font-bold">Ver Material de Estudio</p>
                                    <p className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {mod.content_type === 'video' ? 'Video instructivo' : mod.content_type === 'pdf' ? 'Documento PDF' : 'Contenido de texto'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ) : (
                        <div className="p-3 text-center bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Módulo Bloqueado</p>
                        </div>
                    )}

                    {/* Module Quiz if exists */}
                    {mod.evaluations?.length > 0 && (
                        <div className="pt-2 border-t border-gray-50 flex flex-col gap-2">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-1">Evaluación de Módulo</p>
                            {mod.evaluations.map((ev, idx) => {
                                const prog = progress.find(p => p.module_id === mod.id);
                                const isDone = prog?.last_score >= (ev.passing_score || 70);
                                const attemptsLimit = ev.attempts_limit ?? 3;
                                const attemptsCount = prog?.attempts_count || 0;
                                const outOfAttempts = !isDone && attemptsCount >= attemptsLimit;

                                return (
                                    <button
                                        key={ev.id}
                                        disabled={isLocked || requestingQuizId === ev.id}
                                        onClick={outOfAttempts ? () => onRequestQuizAttempt(mod, ev) : () => onTakeQuiz(mod, ev)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isDone ? 'bg-emerald-50 border-emerald-100' : outOfAttempts ? 'bg-amber-50 border-amber-200' : 'bg-white border-blue-100 hover:bg-blue-50/50'} disabled:opacity-50`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined ${isDone ? 'text-emerald-500' : outOfAttempts ? 'text-amber-500' : 'text-blue-500'} text-sm`}>
                                                {isDone ? 'check_circle' : outOfAttempts ? 'support_agent' : 'quiz'}
                                            </span>
                                            <span className={`text-xs font-bold ${isDone ? 'text-emerald-700' : outOfAttempts ? 'text-amber-700' : 'text-gray-700'}`}>
                                                {isDone ? 'Quiz Aprobado' : outOfAttempts ? (requestingQuizId === ev.id ? 'Enviando...' : 'Solicitar Intento Adicional') : 'Realizar Quiz'}
                                            </span>
                                        </div>
                                        {isDone ? (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-600 font-black px-2 py-0.5 rounded-full">{prog.last_score}%</span>
                                        ) : outOfAttempts ? (
                                            <span className="text-[10px] bg-amber-100 text-amber-600 font-black px-2 py-0.5 rounded-full">Agotado</span>
                                        ) : (
                                            <span className="text-[10px] bg-blue-100 text-blue-600 font-black px-2 py-0.5 rounded-full">Pendiente</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   Main CourseViewer
   ════════════════════════════════════════════════════════════ */
const CourseViewer = ({ courseId: courseIdProp, subPath, course: courseProp, onBack, onNavigate, onUpdatePath }) => {
    const { profile } = useAuth();
    const courseId = courseIdProp || courseProp?.id;
    const [courseData, setCourseData] = useState(courseProp || null);
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(!courseProp);
    const [activeModuleIdx, setActiveModuleIdx] = useState(0);
    const [expandedModule, setExpandedModule] = useState(0);
    const [takingExam, setTakingExam] = useState(false);
    const [takingQuiz, setTakingQuiz] = useState(false);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [activeNav, setActiveNav] = useState('cursos');
    const [examAttempt, setExamAttempt] = useState(null);
    const [allExamAttempts, setAllExamAttempts] = useState([]);
    const [certificate, setCertificate] = useState(null);
    const [requestingQuizId, setRequestingQuizId] = useState(null);
    const [isResetPermitted, setIsResetPermitted] = useState(false);
    const [resettingProgress, setResettingProgress] = useState(false);
    const [requestingReset, setRequestingReset] = useState(false);
    const [requestingExamAttempt, setRequestingExamAttempt] = useState(false);

    // Sync Exam/Quiz state with URL subPath
    useEffect(() => {
        if (!courseData) return;
        if (!subPath || subPath === '/') {
            setTakingExam(false);
            setTakingQuiz(false);
            setActiveQuiz(null);
            return;
        }

        if (subPath === '/examen') {
            setTakingExam(true);
            setTakingQuiz(false);
        } else {
            const quizMatch = subPath.match(/\/quiz\/([a-zA-Z0-9-]+)/);
            if (quizMatch) {
                const modId = quizMatch[1];
                const mod = courseData.modules?.find(m => m.id === modId);
                const quiz = mod?.evaluations?.find(e => e.type === 'module_quiz');
                if (quiz) {
                    setActiveQuiz({ ...quiz, moduleTitle: mod.title });
                    setTakingQuiz(true);
                    setTakingExam(false);
                }
            } else {
                setTakingExam(false);
                setTakingQuiz(false);
                setActiveQuiz(null);
            }
        }
    }, [subPath, courseData]);

    // Fetch data on mount
    useEffect(() => {
        const load = async () => {
            if (!courseId || !profile?.id) return;
            setLoading(true);
            try {
                const fullCourse = await getCourseWithModules(courseId);
                setCourseData(fullCourse);

                const best = await getBestScore(profile.id, courseId);
                setExamAttempt(best);

                const attempts = await getAttempts(profile.id, courseId);
                setAllExamAttempts(attempts || []);

                const { data: cert } = await supabase
                    .from('certificates')
                    .select('*')
                    .eq('user_id', profile.id)
                    .eq('course_id', courseId)
                    .maybeSingle();
                setCertificate(cert);

                const { data: assignData } = await supabase
                    .from('course_assignments')
                    .select('reset_permitted')
                    .eq('worker_id', profile.id)
                    .eq('course_id', courseId)
                    .maybeSingle();
                setIsResetPermitted(assignData?.reset_permitted || false);

                const prog = await getCourseProgress(profile.id, courseId);
                setProgress(prog || []);

                // Set initial active module (first uncompleted or first overall)
                const firstIncompleteIdx = (fullCourse?.modules || []).findIndex(m => {
                    const p = (prog || []).find(pr => pr.module_id === m.id);
                    return p?.status !== 'completed';
                });
                if (firstIncompleteIdx !== -1) {
                    setActiveModuleIdx(firstIncompleteIdx);
                    setExpandedModule(firstIncompleteIdx);
                }
            } catch (e) {
                console.error('Error loading course info:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [courseId, profile?.id]);

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-bold text-sm">Cargando curso...</p>
            </div>
        </div>
    );

    const modules = courseData?.modules || [];
    const activeModule = modules[activeModuleIdx];
    const isModuleFullyCompleted = (mod) => {
        const prog = progress.find(p => p.module_id === mod.id);
        if (!prog || prog.status !== 'completed') return false;
        const quiz = mod.evaluations?.find(e => e.type === 'module_quiz');
        if (quiz) {
            return (prog.last_score || 0) >= (quiz.passing_score || 70);
        }
        return true;
    };

    const overallProgress = (modules.filter(isModuleFullyCompleted).length / (modules.length || 1)) * 100;

    // Check if current module has a quiz that must be passed
    const currentModuleProg = progress.find(p => p.module_id === activeModule?.id);
    const hasPendingQuiz = activeModule?.evaluations?.some(ev => {
        const score = currentModuleProg?.last_score || 0;
        return score < (ev.passing_score || 70);
    });

    // Find final exam in course evaluations or first quiz found
    const finalExam = courseData?.evaluations?.find(e => e.type === 'final_exam') ||
        courseData?.modules?.reduce((acc, m) => acc || m.evaluations?.find(e => e.type === 'final_exam'), null);

    const onTakeQuiz = (mod, ev) => {
        const prog = progress.find(p => p.module_id === mod.id);
        const attemptsLimit = ev.attempts_limit ?? 3;
        const attemptsCount = prog?.attempts_count || 0;
        const isDone = prog?.last_score >= (ev.passing_score || 70);

        if (isDone) {
            alert('Este cuestionario ya ha sido aprobado.');
            return;
        }

        if (attemptsCount >= attemptsLimit) {
            alert(`Has alcanzado el límite de intentos permitidos (${attemptsLimit}) para este cuestionario.`);
            return;
        }

        if (onUpdatePath) onUpdatePath(`/quiz/${mod.id}`);
    };

    const handleRequestQuizAttempt = async (mod, ev) => {
        if (requestingQuizId) return;
        setRequestingQuizId(ev.id);
        try {
            await notifyCompanyOnQuizAttemptRequest(profile.id, courseId, mod.id);
            alert('Tu solicitud de intento adicional para este quiz ha sido enviada al administrador.');
        } catch (e) {
            console.error('Error requesting quiz attempt:', e);
            alert('Error al enviar la solicitud. Inténtalo de nuevo.');
        } finally {
            setRequestingQuizId(null);
        }
    };

    const handleFinalExamStart = () => {
        const attemptsLimit = finalExam?.attempts_limit ?? 3;
        const attemptsCount = allExamAttempts.length;

        if (examAttempt?.passed) {
            if (onUpdatePath) onUpdatePath('/examen');
            return;
        }

        if (attemptsCount >= attemptsLimit) {
            alert(`Has alcanzado el límite de intentos permitidos (${attemptsLimit}) para el examen final.`);
            return;
        }

        if (onUpdatePath) onUpdatePath('/examen');
    };

    const handleRequestCourseReset = async () => {
        if (requestingReset) return;
        setRequestingReset(true);
        try {
            // Fetch worker profile details
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, employee_id')
                .eq('id', profile.id)
                .single();

            // Fetch worker company association
            const { data: workerComp } = await supabase
                .from('worker_companies')
                .select('company_id')
                .eq('worker_id', profile.id)
                .limit(1)
                .maybeSingle();

            if (!profileData || !workerComp || !workerComp.company_id) {
                alert('Tu perfil no está vinculado a una empresa.');
                return;
            }

            const companyId = workerComp.company_id;

            // Find company admins
            const { data: companyAdmins } = await supabase
                .from('profiles')
                .select('id')
                .eq('company_id', companyId)
                .eq('role', 'admin');

            if (companyAdmins && companyAdmins.length > 0) {
                const notifications = companyAdmins.map(admin => ({
                    user_id: admin.id,
                    company_id: companyId,
                    sender_id: profile.id,
                    title: 'Solicitud de Reinicio de Curso',
                    message: `El trabajador ${profileData.full_name} (${profileData.employee_id || 'Sin documento'}) solicita reiniciar su progreso en el curso "${courseData?.title || 'Curso'}".`,
                    type: 'course_reset_request'
                }));

                const { error } = await supabase.from('notifications').insert(notifications);
                if (error) throw error;
                alert('Tu solicitud de reinicio de curso ha sido enviada exitosamente al administrador.');
            } else {
                alert('No se encontraron administradores para esta empresa.');
            }
        } catch (e) {
            console.error('Error requesting course reset:', e);
            alert('Error al enviar la solicitud. Inténtalo de nuevo.');
        } finally {
            setRequestingReset(false);
        }
    };

    const handleRequestExamAttempt = async () => {
        if (requestingExamAttempt) return;
        setRequestingExamAttempt(true);
        try {
            await notifyCompanyOnExamAttemptRequest(profile.id, courseId);
            alert('Tu solicitud de intento adicional para el examen final ha sido enviada al administrador.');
        } catch (e) {
            console.error('Error requesting exam attempt:', e);
            alert('Error al enviar la solicitud. Inténtalo de nuevo.');
        } finally {
            setRequestingExamAttempt(false);
        }
    };

    const handleExecuteProgressReset = async () => {
        if (!window.confirm('¿Estás seguro de que deseas restablecer por completo este curso? Esto borrará tu progreso de lectura, calificaciones de quices, intentos y certificados emitidos para comenzar desde cero.')) return;
        setResettingProgress(true);
        try {
            const moduleIds = modules.map(m => m.id);

            if (moduleIds.length > 0) {
                const { error: progErr } = await supabase
                    .from('progress')
                    .delete()
                    .eq('user_id', profile?.id)
                    .in('module_id', moduleIds);
                if (progErr) throw progErr;
            }

            const { error: examErr } = await supabase
                .from('exam_attempts')
                .delete()
                .eq('user_id', profile?.id)
                .eq('course_id', courseId);
            if (examErr) throw examErr;

            const { error: certErr } = await supabase
                .from('certificates')
                .delete()
                .eq('user_id', profile?.id)
                .eq('course_id', courseId);
            if (certErr) throw certErr;

            const { error: assignErr } = await supabase
                .from('course_assignments')
                .update({ reset_permitted: false })
                .eq('worker_id', profile?.id)
                .eq('course_id', courseId);
            if (assignErr) throw assignErr;

            alert('Tu progreso ha sido completamente restablecido. El curso iniciará desde cero.');
            setIsResetPermitted(false);
            window.location.reload();
        } catch (e) {
            console.error('Error resetting progress:', e);
            alert('Ocurrió un error al restablecer el curso. Inténtalo de nuevo.');
        } finally {
            setResettingProgress(false);
        }
    };

    const handleQuizFinish = async (score) => {
        if (!activeQuiz || !profile?.id) return;
        try {
            await markModuleComplete(profile.id, activeQuiz.module_id, score);
            // Refresh progress in background
            const prog = await getCourseProgress(profile.id, courseId);
            setProgress(prog || []);
        } catch (e) {
            console.error(e);
        }
        // Do NOT close yet, let user see results
    };

    if (takingQuiz && activeQuiz) {
        const quizProg = progress.find(p => p.module_id === activeQuiz.module_id);
        return (
            <ExamView
                courseName={activeQuiz.moduleTitle}
                courseId={courseId}
                courseImage={courseData?.image_url}
                questions={activeQuiz.questions || []}
                onBack={() => onUpdatePath('')}
                onGoHome={() => { onUpdatePath(''); onBack(); }}
                isModuleQuiz={true}
                onFinish={handleQuizFinish}
                timeLimit={activeQuiz.time_limit}
                attemptsLimit={activeQuiz.attempts_limit}
                attemptsCount={quizProg?.attempts_count || 0}
                moduleId={activeQuiz.module_id}
                onRequestAttempt={() => handleRequestQuizAttempt({ id: activeQuiz.module_id }, activeQuiz)}
                requestingAttempt={requestingQuizId === activeQuiz.id}
            />
        );
    }

    if (takingExam) {
        // Find if they have any passed attempt in all attempts
        const passedAttempt = allExamAttempts.find(a => a.passed);
        return (
            <ExamView
                courseName={courseData?.title}
                courseId={courseId}
                courseImage={courseData?.image_url}
                questions={finalExam?.questions || []}
                onBack={() => onUpdatePath('')}
                onGoHome={() => { onUpdatePath(''); onBack(); }}
                timeLimit={finalExam?.time_limit}
                attemptsLimit={finalExam?.attempts_limit}
                attemptsCount={allExamAttempts.length}
                viewResultsMode={!!passedAttempt}
                completedScore={passedAttempt?.score}
                completedTimeUsed={passedAttempt ? Math.ceil((passedAttempt.time_used_seconds || 0) / 60) : 0}
                completedCertCode={certificate?.verification_code}
                onDownloadCertificate={() => onNavigate && onNavigate('certificados')}
                onRequestAttempt={handleRequestExamAttempt}
                requestingAttempt={requestingExamAttempt}
            />
        );
    }

    const toggleModule = (idx) => setExpandedModule(prev => prev === idx ? null : idx);

    const navItems = [
        { id: 'inicio', icon: 'home', label: 'Inicio' },
        { id: 'cursos', icon: 'menu_book', label: 'Mis Cursos' },
        { id: 'certificados', icon: 'workspace_premium', label: 'Diplomas' },
        { id: 'perfil', icon: 'person', label: 'Perfil' },
    ];

    const markCurrentComplete = async () => {
        if (!activeModule) return;
        try {
            await markModuleComplete(profile.id, activeModule.id);
            // Refresh progress
            const prog = await getCourseProgress(profile.id, courseId);
            setProgress(prog);
            // Move to next if possible
            if (activeModuleIdx < modules.length - 1) {
                setActiveModuleIdx(activeModuleIdx + 1);
                setExpandedModule(activeModuleIdx + 1);
            }
        } catch (e) {
            console.error(e);
            alert('Error al marcar módulo: ' + (e.message || 'Sin permisos'));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="w-full lg:max-w-3xl xl:max-w-4xl bg-white shadow-xl flex flex-col min-h-screen relative overflow-hidden">

                {/* ── Header ── */}
                <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center px-4 py-3 gap-3 shrink-0">
                    <button onClick={onBack}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-600 transition-colors shrink-0">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                            {courseData?.category || 'Curso Técnico'}
                        </h2>
                        <h1 className="text-sm font-black text-gray-900 leading-tight truncate">
                            {courseData?.title}
                        </h1>
                    </div>
                </header>

                {/* ── Scrollable content ── */}
                <main className="flex-1 overflow-y-auto pb-32">

                    {/* Dynamic Media Player */}
                    <ContentDisplay module={activeModule} courseTitle={courseData?.title} />

                    <div className="p-4 lg:p-6 space-y-6">

                        {/* Current module info */}
                        {activeModule && (
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider shadow-sm">
                                            Módulo {activeModuleIdx + 1}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• {activeModule.content_type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-20 rounded-full bg-gray-100 overflow-hidden">
                                            <div className="h-full bg-[#f3b012] transition-all duration-700" style={{ width: `${overallProgress}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-[#f3b012]">{Math.round(overallProgress)}%</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">
                                    {activeModule.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    {activeModule.description || 'Este módulo contiene material de estudio para tu capacitación técnica.'}
                                </p>
                            </section>
                        )}

                        {/* Curriculum */}
                        <section className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Plan de Estudios</h4>
                            <div className="grid gap-3">
                                {modules.map((mod, idx) => {
                                    const p = progress.find(pr => pr.module_id === mod.id);
                                    const quiz = mod.evaluations?.find(e => e.type === 'module_quiz');
                                    const isCompleted = p?.status === 'completed' && (!quiz || (p.last_score || 0) >= (quiz.passing_score || 70));
                                    const isUnlocked = idx === 0 || (() => {
                                        const prevMod = modules[idx - 1];
                                        const prevP = progress.find(pr => pr.module_id === prevMod.id);
                                        if (!prevP || prevP.status !== 'completed') return false;
                                        const prevQuiz = prevMod.evaluations?.find(e => e.type === 'module_quiz');
                                        if (prevQuiz) {
                                            return (prevP.last_score || 0) >= (prevQuiz.passing_score || 70);
                                        }
                                        return true;
                                    })();
                                    const isActive = activeModuleIdx === idx;

                                    return (
                                        <ModuleAccordion
                                            key={mod.id}
                                            mod={mod}
                                            index={idx}
                                            isLocked={!isUnlocked}
                                            isCompleted={isCompleted}
                                            isActive={isActive}
                                            expanded={expandedModule === idx}
                                            onToggle={() => toggleModule(idx)}
                                            onClick={() => { setActiveModuleIdx(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            onTakeQuiz={onTakeQuiz}
                                            progress={progress}
                                            onRequestQuizAttempt={handleRequestQuizAttempt}
                                            requestingQuizId={requestingQuizId}
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        {/* Next lesson CTA */}
                        {activeModule && (
                            <div className={`rounded-2xl p-4 border flex flex-col gap-3 ${hasPendingQuiz ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                                <p className="text-xs font-bold text-gray-500 text-center">
                                    {hasPendingQuiz
                                        ? 'Debes aprobar el quiz de este módulo para poder marcarlo como completado.'
                                        : 'Una vez revisado el material, marca como completado para avanzar'}
                                </p>
                                <button
                                    onClick={markCurrentComplete}
                                    disabled={hasPendingQuiz}
                                    className={`w-full py-4 font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${hasPendingQuiz ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100'}`}
                                >
                                    <span className="material-symbols-outlined">{hasPendingQuiz ? 'lock' : 'verified'}</span>
                                    {hasPendingQuiz ? 'Quiz Pendiente' : 'Marcar Módulo como Completado'}
                                </button>
                            </div>
                        )}

                        {/* Evaluation CTA */}
                        {overallProgress >= 100 && (
                            <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[160px]">{examAttempt?.passed ? 'workspace_premium' : 'quiz'}</span>
                                </div>
                                <div className="relative z-10">
                                    <h4 className="font-black text-xl mb-1">{examAttempt?.passed ? '¡Certificación Obtenida!' : '¡Listo para el Examen Final!'}</h4>
                                    <p className="text-blue-100 text-sm mb-6 max-w-[80%]">
                                        {examAttempt?.passed
                                            ? `Has aprobado el examen con ${examAttempt.score}%. Puedes descargar tu certificado en la sección de Diplomas.`
                                            : 'Has completado todos los módulos. Realiza la evaluación final para obtener tu certificación técnica.'}
                                    </p>
                                    <button
                                        onClick={handleFinalExamStart}
                                        className="w-full py-4 bg-white text-blue-600 font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-black/10"
                                    >
                                        <span className="material-symbols-outlined">{examAttempt?.passed ? 'visibility' : 'quiz'}</span>
                                        {examAttempt?.passed ? 'Ver Resultados del Examen' : 'Comenzar Examen de Certificación'}
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Course Reset Panel */}
                        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 mt-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isResetPermitted ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-gray-50 text-gray-400'
                                }`}>
                                    <span className="material-symbols-outlined text-xl">restart_alt</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-black text-gray-900">Restablecer Progreso Completo</h4>
                                    <p className="text-gray-400 text-[10px] font-medium leading-relaxed mt-0.5">
                                        {isResetPermitted 
                                            ? 'El administrador ha autorizado el reinicio de tu curso. Haz clic abajo para restablecer todos tus intentos y certificados.'
                                            : 'Si agotaste tus intentos o requieres reiniciar, solicita autorización a tu administrador.'}
                                    </p>
                                </div>
                            </div>
                            
                            {isResetPermitted ? (
                                <button
                                    onClick={handleExecuteProgressReset}
                                    disabled={resettingProgress}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-amber-100 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-base">refresh</span>
                                    {resettingProgress ? 'Restableciendo...' : 'Restablecer Todo el Curso'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleRequestCourseReset}
                                    disabled={requestingReset}
                                    className="w-full bg-[#f3b012] hover:bg-[#f3b012]/90 text-black font-black py-3.5 rounded-2xl shadow-lg shadow-amber-100 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-base">support_agent</span>
                                    {requestingReset ? 'Enviando Solicitud...' : 'Solicitar Reinicio al Administrador'}
                                </button>
                            )}
                        </div>
                    </div>
                </main>

                {/* ── Bottom nav ── */}
                <nav className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30 flex justify-center">
                    <div className="w-full flex items-center justify-around px-2 py-2">
                        {navItems.map(item => (
                            <button key={item.id}
                                onClick={() => { setActiveNav(item.id); if (item.id !== 'cursos' && onNavigate) onNavigate(item.id); if (item.id !== 'cursos') onBack(); }}
                                className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${activeNav === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
                                <span className="material-symbols-outlined text-[22px]"
                                    style={activeNav === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                    {item.icon}
                                </span>
                                <span className="text-[10px] font-bold">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    );
};

export default CourseViewer;

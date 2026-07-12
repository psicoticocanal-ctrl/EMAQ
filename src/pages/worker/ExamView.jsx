import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { submitExam } from '../../lib/examService';
import { issueCertificate } from '../../lib/certificateService';
import { notifyCompanyOnExamFinish, notifyCompanyOnQuizAttemptRequest, notifyCompanyOnExamAttemptRequest } from '../../lib/notificationService';

/* ─── Mock exam data ─── */
const EXAM_QUESTIONS = [
    {
        id: 1,
        image: null,
        imageCaption: null,
        question: '¿Cuál es el procedimiento correcto al detectar una pérdida repentina de presión en el sistema hidráulico principal durante la operación de carga?',
        options: [
            'Continuar la maniobra hasta depositar la carga y luego apagar el motor inmediatamente.',
            'Detener el movimiento, bajar el implemento al suelo de forma controlada, activar el freno de parqueo y apagar el motor.',
            'Aumentar las RPM del motor para intentar compensar la pérdida de presión y finalizar el ciclo.',
            'Revisar visualmente las mangueras externas mientras se mantiene el equipo encendido en ralentí.',
        ],
        correct: 1,
    },
    {
        id: 2,
        image: null,
        imageCaption: 'Figura 1.1: Panel de instrumentos estándar',
        question: '¿Con qué frecuencia mínima debe realizarse la inspección pre-operacional de una excavadora hidráulica según la norma ISO 10263?',
        options: [
            'Una vez por semana antes del primer turno.',
            'Al inicio de cada turno de trabajo, antes de encender el motor.',
            'Únicamente cuando el equipo regresa de mantenimiento mayor.',
            'Solo si el operador observa anomalías visibles antes de subir.',
        ],
        correct: 1,
    },
    {
        id: 3,
        image: null,
        imageCaption: null,
        question: '¿Cuál es la presión de trabajo máxima permitida en el circuito principal de una excavadora de 20 toneladas de clase media?',
        options: [
            '150 bar (2,175 psi)',
            '250 bar (3,625 psi)',
            '350 bar (5,075 psi)',
            '450 bar (6,525 psi)',
        ],
        correct: 1,
    },
    {
        id: 4,
        image: null,
        imageCaption: null,
        question: 'Al estacionar una excavadora en una pendiente, ¿cuál es el posicionamiento correcto del implemento?',
        options: [
            'Balde levantado al máximo para evitar contacto con el suelo.',
            'Implemento apoyado en el suelo, motor apagado, freno activo y bloqueo de seguridad activado.',
            'Implemento a media altura con el motor en ralentí.',
            'Cualquier posición es válida si se activa el freno de estacionamiento.',
        ],
        correct: 1,
    },
    {
        id: 5,
        image: null,
        imageCaption: 'Figura 2.1: Esquema de válvulas de alivio',
        question: '¿Qué función cumple la válvula de alivio en un sistema hidráulico de excavadora?',
        options: [
            'Controlar la velocidad de actuación del cilindro hidráulico.',
            'Limitar la presión máxima del sistema evitando sobrepresiones que dañen componentes.',
            'Regular el flujo de aceite hacia los motores de traslación hidráulicos.',
            'Distribuir el flujo hidráulico entre los actuadores según la demanda.',
        ],
        correct: 1,
    },
];

const CATEGORY_RESULTS = [
    { label: 'Protocolos de Seguridad', score: 95, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: 'Controles Hidráulicos', score: 80, color: 'bg-blue-600', textColor: 'text-blue-600' },
    { label: 'Mantenimiento Preventivo', score: 72, color: 'bg-amber-500', textColor: 'text-amber-500' },
];

/* ─── Format seconds as MM:SS ─── */
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* ═══════════════════════════════════════════════════════════
   EXAM RESULTS VIEW
   ═══════════════════════════════════════════════════════════ */
const ExamResults = ({ passed, score, timeUsed, certCode, courseName, courseImage, isModuleQuiz, onBack, onRetry, onGoHome, onDownloadCertificate, onRequestAttempt, requestingAttempt }) => (
    <div className="min-h-screen bg-gray-50 flex justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="w-full lg:max-w-md bg-white shadow-xl flex flex-col min-h-screen">

            {/* Header */}
            <div className="flex items-center bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-50 text-gray-600 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-gray-900 text-lg font-black flex-1 text-center pr-10">Resultados del Examen</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 pb-32">

                {/* Course card */}
                <div className="rounded-2xl overflow-hidden aspect-video relative bg-slate-900 mb-8 shadow-sm">
                    {courseImage ? (
                        <img src={courseImage} alt={courseName} className="w-full h-full object-cover opacity-60" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-8xl text-slate-700">construction</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-5">
                        <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Resultados de Evaluación</span>
                        <h2 className="text-white text-xl font-black leading-tight truncate">{courseName}</h2>
                    </div>
                </div>

                {/* Pass/Fail state */}
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-sm ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                        <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {passed ? 'check_circle' : 'cancel'}
                        </span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {passed ? '¡Felicidades, has aprobado!' : 'No aprobado — ¡Ánimo!'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                        {passed
                            ? 'Has demostrado las competencias necesarias para operar maquinaria pesada de nivel avanzado.'
                            : 'Repasa los módulos y vuelve a intentarlo.'}
                    </p>
                </div>

                {/* Score + time */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Puntaje</p>
                        <p className="text-3xl font-black text-blue-600 leading-none">
                            {score}<span className="text-lg text-gray-300 font-medium">/100</span>
                        </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Tiempo</p>
                        <p className="text-3xl font-black text-gray-900 leading-none">
                            {timeUsed}<span className="text-lg text-gray-300 font-medium">m</span>
                        </p>
                    </div>
                </div>

                {/* Results Summary */}
                <div className="mb-8">
                    <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                        <span className="material-symbols-outlined text-blue-600 text-xl">analytics</span>
                        Resumen de Evaluación
                    </h4>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm font-semibold">
                                <span className="text-gray-700">Puntaje Obtenido</span>
                                <span className={score >= 70 ? 'text-emerald-600' : 'text-amber-500'}>{score}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${score >= 70 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full transition-all`} style={{ width: `${score}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {passed && certCode && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center mb-2">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Código de Verificación</p>
                            <p className="font-black text-blue-700 text-lg tracking-widest">{certCode}</p>
                        </div>
                    )}

                    {/* Primary Action */}
                    {isModuleQuiz ? (
                        passed ? (
                            <button onClick={onBack}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm">
                                <span className="material-symbols-outlined">save</span>
                                Guardar y Continuar Curso
                            </button>
                        ) : (
                            onRetry ? (
                                <button onClick={onRetry}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm">
                                    <span className="material-symbols-outlined">refresh</span>
                                    Reintentar Quiz
                                </button>
                            ) : (
                                <button 
                                    onClick={onRequestAttempt}
                                    disabled={requestingAttempt}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined">support_agent</span>
                                    {requestingAttempt ? 'Enviando Solicitud...' : 'Solicitar Intento al Administrador'}
                                </button>
                            )
                        )
                    ) : (
                        passed ? (
                            <button 
                                onClick={onDownloadCertificate}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm">
                                <span className="material-symbols-outlined">download</span>
                                Descargar Certificado
                            </button>
                        ) : (
                            onRetry ? (
                                <button onClick={onRetry}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm">
                                    <span className="material-symbols-outlined">refresh</span>
                                    Reintentar Examen
                                </button>
                            ) : (
                                <button 
                                    onClick={onRequestAttempt}
                                    disabled={requestingAttempt}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined">support_agent</span>
                                    {requestingAttempt ? 'Enviando Solicitud...' : 'Solicitar Intento al Administrador'}
                                </button>
                            )
                        )
                    )}

                    {/* Secondary Actions */}
                    {isModuleQuiz && !passed && (
                        <button onClick={onBack}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm">
                            <span className="material-symbols-outlined">visibility</span>
                            Revisar Contenido del Módulo
                        </button>
                    )}

                    {!isModuleQuiz && (
                        <button onClick={onGoHome}
                            className="w-full text-gray-400 hover:text-gray-700 font-semibold py-3 rounded-2xl transition-colors text-sm">
                            Volver al Panel de Control
                        </button>
                    )}
                    {isModuleQuiz && passed && onRetry && (
                        <button onClick={onRetry}
                            className="w-full text-gray-400 hover:text-gray-700 font-semibold py-3 rounded-2xl transition-colors text-sm">
                            Repetir para mejorar nota
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom nav */}
            <nav className="border-t border-gray-100 bg-white/90 backdrop-blur-md px-6 py-3 flex justify-between items-center sticky bottom-0">
                {[
                    { icon: 'home', label: 'Inicio', active: false },
                    { icon: 'school', label: 'Cursos', active: true },
                    { icon: 'military_tech', label: 'Logros', active: false },
                    { icon: 'person', label: 'Perfil', active: false },
                ].map(item => (
                    <button key={item.label}
                        className={`flex flex-col items-center gap-1 ${item.active ? 'text-blue-600' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined"
                            style={item.active ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    </div>
);

/* ═══════════════════════════════════════════════════════════
   EXAM VIEW (question by question)
   ═══════════════════════════════════════════════════════════ */
const ExamView = ({ 
    courseName = 'Operación de Excavadora Nivel II', 
    courseId = null, 
    courseImage = null, 
    questions: questionsProp = [], 
    onBack, 
    onGoHome, 
    isModuleQuiz = false, 
    onFinish,
    timeLimit = null,
    attemptsLimit = null,
    attemptsCount = 0,
    viewResultsMode = false,
    completedScore = null,
    completedTimeUsed = null,
    completedCertCode = null,
    onDownloadCertificate = null,
    moduleId = null
}) => {
    const { profile } = useAuth();
    const TOTAL_TIME = isModuleQuiz 
        ? (timeLimit ? timeLimit * 60 : 15 * 60) 
        : (timeLimit ? timeLimit * 60 : 45 * 60);

    // Normalize questions from DB format to Interface format
    const normalizedQuestions = (questionsProp || []).map((q, idx) => {
        const options = (q.options || []).map(opt => typeof opt === 'string' ? opt : opt.text).filter(Boolean);
        let correctIndex = -1;
        if (Array.isArray(q.options)) {
            correctIndex = q.options.findIndex(opt => opt.correct === true);
        }

        return {
            id: q.id || `q-${idx}`,
            question: q.text || q.question || `Pregunta ${idx + 1}`,
            type: q.type || 'multiple_choice',
            image_url: q.image_url || null,
            options: options.length > 0 ? options : ['Sin opciones'],
            correct: correctIndex !== -1 ? correctIndex : 0,
            imageCaption: q.imageCaption || null
        };
    });

    const questions = normalizedQuestions;

    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
    const [submitted, setSubmitted] = useState(viewResultsMode);
    const [score, setScore] = useState(viewResultsMode ? completedScore : null);
    const [certCode, setCertCode] = useState(viewResultsMode ? completedCertCode : null);
    const [showExit, setShowExit] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localAttemptsCount, setLocalAttemptsCount] = useState(attemptsCount);
    const [requestingAttempt, setRequestingAttempt] = useState(false);

    useEffect(() => {
        setLocalAttemptsCount(attemptsCount);
    }, [attemptsCount]);

    const handleRequestAttempt = async () => {
        if (requestingAttempt) return;
        setRequestingAttempt(true);
        try {
            if (isModuleQuiz) {
                await notifyCompanyOnQuizAttemptRequest(profile.id, courseId, moduleId);
            } else {
                await notifyCompanyOnExamAttemptRequest(profile.id, courseId);
            }
            alert('Tu solicitud ha sido enviada exitosamente al administrador.');
        } catch (e) {
            console.error('Error requesting attempt:', e);
            alert('Error al enviar la solicitud. Inténtalo de nuevo.');
        } finally {
            setRequestingAttempt(false);
        }
    };

    // Persistence Key
    const persistKey = `exam_progress_${profile?.id}_${courseId}_${isModuleQuiz ? 'quiz' : 'final'}`;

    // Restore progress on mount
    useEffect(() => {
        if (viewResultsMode) return;
        const saved = localStorage.getItem(persistKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.answers) setAnswers(data.answers);
                if (data.current !== undefined) setCurrent(data.current);
                if (data.timeLeft !== undefined) setTimeLeft(data.timeLeft);
            } catch (e) {
                console.error('Error restoring exam progress:', e);
            }
        }
    }, [persistKey, viewResultsMode]);

    // Save progress on changes
    useEffect(() => {
        if (viewResultsMode) return;
        if (submitted) {
            localStorage.removeItem(persistKey);
            return;
        }
        const data = { answers, current, timeLeft };
        localStorage.setItem(persistKey, JSON.stringify(data));
    }, [answers, current, timeLeft, submitted, persistKey, viewResultsMode]);

    const handleSubmitRef = useRef(null);

    const handleSubmit = async () => {
        if (saving) return;
        setSaving(true);
        let correctCount = 0;
        questions.forEach(q => {
            if (q.type === 'open_ended') {
                if (answers[q.id] && answers[q.id].trim().length > 0) correctCount++;
            } else {
                if (answers[q.id] === q.correct) correctCount++;
            }
        });
        const pct = Math.round((correctCount / totalQ) * 100);
        const timeUsedSec = TOTAL_TIME - timeLeft;
        try {
            if (onFinish) {
                await onFinish(pct);
            } else if (profile?.id && courseId) {
                // Default handling for Final Exams
                await submitExam(profile.id, courseId, pct, timeUsedSec, answers);
                // Send notification to company admin
                await notifyCompanyOnExamFinish(profile.id, courseId, pct, pct >= 70);
                if (pct >= 70) {
                    const cert = await issueCertificate(profile.id, courseId);
                    setCertCode(cert?.verification_code || null);
                }
            }
        } catch (e) {
            console.error('Error saving exam:', e);
        }
        setScore(pct);
        setSubmitted(true);
        setSaving(false);
        setLocalAttemptsCount(prev => prev + 1);
    };

    useEffect(() => {
        handleSubmitRef.current = handleSubmit;
    });

    /* Timer */
    useEffect(() => {
        if (submitted || viewResultsMode) return;
        const t = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { 
                    clearInterval(t); 
                    if (handleSubmitRef.current) handleSubmitRef.current(); 
                    return 0; 
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [submitted, viewResultsMode]);

    const q = questions[current] || {};
    const totalQ = questions.length;
    const progress = totalQ > 0 ? ((current + 1) / totalQ) * 100 : 0;
    const isLast = totalQ > 0 ? current === totalQ - 1 : false;
    const selectedAnswer = q.id ? answers[q.id] : undefined;

    const select = (val) => q.id && setAnswers(prev => ({ ...prev, [q.id]: val }));

    const timeUsedMin = viewResultsMode 
        ? (completedTimeUsed || 0) 
        : Math.ceil((TOTAL_TIME - timeLeft) / 60);

    const attemptsLimitVal = attemptsLimit ?? 3;
    const currentAttemptVal = submitted 
        ? (localAttemptsCount || 1) 
        : (localAttemptsCount !== undefined ? localAttemptsCount + 1 : 1);

    const reachedLimit = currentAttemptVal >= attemptsLimitVal;

    /* Results screen */
    if (submitted) {
        return (
            <ExamResults
                passed={score >= 70}
                score={score}
                timeUsed={timeUsedMin}
                certCode={certCode}
                courseName={courseName}
                courseImage={courseImage}
                isModuleQuiz={isModuleQuiz}
                onBack={onBack}
                onRetry={(viewResultsMode || reachedLimit) ? null : () => { setAnswers({}); setCurrent(0); setTimeLeft(TOTAL_TIME); setSubmitted(false); setScore(null); setCertCode(null); }}
                onGoHome={onGoHome}
                onDownloadCertificate={onDownloadCertificate}
                onRequestAttempt={handleRequestAttempt}
                requestingAttempt={requestingAttempt}
            />
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-amber-500">warning</span>
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">No hay preguntas disponibles</h2>
                <p className="text-gray-500 text-sm max-w-xs mb-8">Esta evaluación aún no tiene preguntas configuradas.</p>
                <button onClick={onBack} className="bg-blue-600 font-black text-white px-8 py-3 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    Volver al Curso
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* ── Header ── */}
            <header className="sticky top-0 z-50 bg-white border-b border-blue-50 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowExit(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-50 text-gray-700 transition-colors shrink-0">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h2 className="text-gray-900 text-sm font-black leading-tight truncate">
                            {isModuleQuiz ? 'Quiz de Módulo' : 'Certificación'}: {courseName}
                        </h2>
                    </div>
                    <button onClick={() => setShowExit(true)}
                        className="text-blue-600 font-bold text-sm px-4 py-2 hover:bg-blue-50 rounded-xl transition-colors shrink-0">
                        Salir
                    </button>
                </div>

                {/* Status bar */}
                <div className="bg-white border-t border-gray-100">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        {/* Progress */}
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-xs font-black uppercase tracking-wider">Progreso del Examen</span>
                            <span className="text-gray-900 text-sm font-black">Pregunta {current + 1} de {totalQ}</span>
                        </div>
                        <div className="w-full bg-blue-50 rounded-full h-2 mb-4">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`flex items-center gap-3 bg-blue-50 border border-blue-100 p-3 rounded-xl ${timeLeft < 300 ? 'border-red-200 bg-red-50' : ''}`}>
                                <span className={`material-symbols-outlined ${timeLeft < 300 ? 'text-red-500' : 'text-blue-600'}`}>timer</span>
                                <div>
                                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-tight">Tiempo Restante</p>
                                    <p className={`text-lg font-black leading-none ${timeLeft < 300 ? 'text-red-500' : 'text-gray-900'}`}>
                                        {fmtTime(timeLeft)} min
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-3 rounded-xl">
                                <span className="material-symbols-outlined text-blue-600">history</span>
                                <div>
                                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-tight">Intento Actual</p>
                                    <p className="text-lg font-black text-gray-900 leading-none">
                                        {currentAttemptVal} de {attemptsLimitVal}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Question ── */}
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-32">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

                    {/* Question image */}
                    {(q.image_url || q.image) && (
                        <div className="w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img src={q.image_url || q.image} alt="Pregunta" className="w-full h-auto max-h-[400px] object-contain" />
                        </div>
                    )}

                    {/* Question text + inputs */}
                    <div className="p-6 lg:p-10">
                        <h1 className="text-xl lg:text-2xl font-black text-gray-900 leading-snug mb-8">{q.question}</h1>

                        {/* Multiple Choice */}
                        {q.type === 'multiple_choice' && (
                            <div className="space-y-4">
                                {q.options.map((opt, idx) => {
                                    const isSelected = selectedAnswer === idx;
                                    return (
                                        <label key={idx}
                                            className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all select-none
                                                ${isSelected
                                                    ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                                                    : 'border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                                            <div className="mt-0.5 shrink-0">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                                    ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                                                </div>
                                            </div>
                                            <input type="radio" className="sr-only"
                                                checked={isSelected} onChange={() => select(idx)} />
                                            <p className={`text-sm lg:text-base leading-relaxed ${isSelected ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                {opt}
                                            </p>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* Dropdown / Selection */}
                        {q.type === 'dropdown' && (
                            <div className="flex flex-col gap-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Selecciona una opción:</p>
                                <select 
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-base font-bold text-gray-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    value={selectedAnswer !== undefined ? selectedAnswer : ''}
                                    onChange={(e) => select(parseInt(e.target.value))}
                                >
                                    <option value="" disabled>--- Seleccionar respuesta ---</option>
                                    {q.options.map((opt, idx) => (
                                        <option key={idx} value={idx}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Open Ended */}
                        {q.type === 'open_ended' && (
                            <div className="flex flex-col gap-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Escribe tu respuesta:</p>
                                <textarea
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-base font-medium text-gray-900 outline-none focus:border-blue-500 transition-all min-h-[160px] resize-none"
                                    placeholder="Escribe aquí tu respuesta detallada..."
                                    value={selectedAnswer || ''}
                                    onChange={(e) => select(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Question dots */}
                <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
                    {questions.map((qItem, i) => (
                        <button key={i} onClick={() => setCurrent(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-blue-600 scale-125' : answers[qItem.id] !== undefined ? 'bg-green-400' : 'bg-gray-200'}`} />
                    ))}
                </div>
            </main>

            {/* ── Footer navigation ── */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <button
                        onClick={() => setCurrent(Math.max(0, current - 1))}
                        disabled={current === 0}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <span className="material-symbols-outlined">chevron_left</span>
                        Anterior
                    </button>

                    <div className="flex items-center gap-3">
                        <button onClick={handleSubmit}
                            className="hidden md:flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors text-sm">
                            Finalizar Examen
                        </button>
                        {isLast ? (
                            <button onClick={handleSubmit}
                                className="flex items-center gap-2 px-7 py-3 rounded-xl font-black bg-green-600 text-white hover:bg-green-700 transition-colors shadow-lg shadow-green-200 text-sm">
                                Terminar
                                <span className="material-symbols-outlined">check</span>
                            </button>
                        ) : (
                            <button onClick={() => setCurrent(Math.min(totalQ - 1, current + 1))}
                                className="flex items-center gap-2 px-7 py-3 rounded-xl font-black bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 text-sm">
                                Siguiente
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile finish button */}
                <div className="md:hidden flex justify-center pb-2">
                    <button onClick={handleSubmit} className="text-red-500 text-xs font-black uppercase tracking-widest py-2">
                        Finalizar Examen
                    </button>
                </div>
            </footer>

            {/* ── Exit confirmation modal ── */}
            {showExit && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full">
                        <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-yellow-500 text-2xl">warning</span>
                        </div>
                        <h3 className="text-gray-900 font-black text-lg text-center mb-1">¿Salir del examen?</h3>
                        <p className="text-gray-400 text-sm text-center mb-6">
                            Tu progreso se perderá. ¿Estás seguro de que deseas salir?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowExit(false)}
                                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                                Continuar
                            </button>
                            <button onClick={onBack}
                                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamView;

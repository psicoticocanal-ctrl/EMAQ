import React, { useState, useEffect, useCallback } from 'react';
import CourseEditor from './CourseEditor';
import { useAuth } from '../../context/AuthContext';
import { getCoursesByCompany, deleteCourse, setcourseStatus } from '../../lib/courseService';
import { bulkAssignCourse } from '../../lib/assignmentService';
import { supabase } from '../../lib/supabase';

/* ─── Helpers ─── */
const STATUS_COLORS = {
    published: 'bg-green-50 text-green-600',
    draft: 'bg-yellow-50 text-yellow-600',
};
const STATUS_LABELS = { published: 'Publicado', draft: 'Borrador' };
const CATEGORY_ICONS = {
    'Maquinaria Pesada': 'construction',
    'Seguridad': 'security',
    'Mantenimiento': 'build',
    'Liderazgo': 'groups',
};

/* ─── Enrolled users count badge ─── */
const EnrolledCount = ({ courseId }) => {
    const [count, setCount] = useState(null);
    useEffect(() => {
        supabase.from('course_assignments').select('id', { count: 'exact', head: true }).eq('course_id', courseId)
            .then(({ count: c }) => setCount(c ?? 0));
    }, [courseId]);
    if (count === null) return null;
    return (
        <span className="flex items-center gap-1 text-[#b88000]">
            <span className="material-symbols-outlined text-sm">group</span>
            {count} inscrito{count !== 1 ? 's' : ''}
        </span>
    );
};


/* ─── Assign modal ─── */
const AssignModal = ({ course, companyId, onClose }) => {
    const { profile } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [dueDate, setDueDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        supabase.from('profiles').select('id,full_name,email').eq('role', 'worker').eq('company_id', companyId)
            .then(({ data }) => setWorkers(data || []));
    }, [companyId]);

    const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const handleAssign = async () => {
        if (!selected.length) return;
        setSaving(true);
        await bulkAssignCourse(course.id, selected, profile.id, dueDate || null);
        setSaving(false);
        setDone(true);
        setTimeout(onClose, 1200);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full">
                <h3 className="font-black text-gray-900 text-lg mb-1">Asignar Curso</h3>
                <p className="text-gray-400 text-sm mb-4 truncate">{course.title}</p>
                {done ? (
                    <div className="text-center py-6">
                        <span className="material-symbols-outlined text-5xl text-green-500 block mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <p className="font-bold text-gray-700">¡Asignado correctamente!</p>
                    </div>
                ) : (
                    <>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Seleccionar Trabajadores</p>
                        <div className="border border-gray-100 rounded-2xl overflow-hidden mb-4 max-h-48 overflow-y-auto">
                            {workers.length === 0
                                ? <p className="text-center text-gray-400 text-sm py-6">No hay trabajadores en esta empresa</p>
                                : workers.map(w => (
                                    <label key={w.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                                        <input type="checkbox" checked={selected.includes(w.id)}
                                            onChange={() => toggle(w.id)}
                                            className="w-4 h-4 rounded accent-blue-600" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{w.full_name}</p>
                                            <p className="text-xs text-gray-400">{w.email}</p>
                                        </div>
                                    </label>
                                ))
                            }
                        </div>
                        <div className="mb-4">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha límite (opcional)</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm">Cancelar</button>
                            <button onClick={handleAssign} disabled={!selected.length || saving}
                                className="flex-1 py-3 rounded-2xl bg-[#f3b012] text-black font-black text-sm disabled:opacity-40">
                                {saving ? 'Asignando…' : `Asignar (${selected.length})`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   Main CourseManager
   ════════════════════════════════════════════════════════════ */
const CourseManager = ({ onNavigate }) => {
    const { profile, signOut } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list');
    const [editingCourse, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilter] = useState('all');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [assigningCourse, setAssigning] = useState(null);
    const [activeTab, setActiveTab] = useState('cursos');
    const [error, setError] = useState(null);

    const navItems = [
        { id: 'inicio', icon: 'dashboard', label: 'Inicio' },
        { id: 'trabajadores', icon: 'groups', label: 'Trabajadores' },
        { id: 'cursos', icon: 'library_books', label: 'Cursos' },
        { id: 'reportes', icon: 'bar_chart', label: 'Reportes' },
        { id: 'certificados', icon: 'verified', label: 'Certs.' },
    ];

    const loadCourses = useCallback(async () => {
        if (!profile?.company_id) { setLoading(false); return; }
        try {
            const data = await getCoursesByCompany(profile.company_id);
            setCourses(data || []);
        } catch (e) {
            setError('No se pudieron cargar los cursos.');
        } finally {
            setLoading(false);
        }
    }, [profile?.company_id]);

    useEffect(() => { loadCourses(); }, [loadCourses]);

    /* Show editor */
    if (view === 'editor') {
        return <CourseEditor
            course={editingCourse}
            companyId={profile?.company_id}
            createdBy={profile?.id}
            onBack={() => { setView('list'); setEditing(null); loadCourses(); }}
            onSave={() => { setView('list'); setEditing(null); loadCourses(); }}
        />;
    }

    const filtered = courses.filter(c => {
        const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || (c.category || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || c.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const handleDelete = async (id) => {
        await deleteCourse(id);
        setCourses(p => p.filter(c => c.id !== id));
        setConfirmDelete(null);
    };

    const handleToggleStatus = async (course) => {
        const newStatus = course.status === 'published' ? 'draft' : 'published';
        await setcourseStatus(course.id, newStatus);
        setCourses(p => p.map(c => c.id === course.id ? { ...c, status: newStatus } : c));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Sidebar */}
            <aside className="hidden lg:flex flex-col w-60 xl:w-64 bg-white border-r border-gray-200 fixed left-0 top-0 h-screen z-40">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-[#f3b012] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-black text-base">corporate_fare</span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-black text-black text-sm">EMAQ Pro</p>
                        <p className="text-xs text-gray-400 truncate">Panel Empresa</p>
                    </div>
                </div>
                <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Empresa</p>
                    <p className="font-bold text-gray-900 text-sm truncate">{profile?.full_name || 'Admin'}</p>
                    <p className="text-xs text-gray-400">{profile?.company_code || 'EMAQ'}</p>
                </div>
                <nav className="flex-1 p-3">
                    <ul className="space-y-1">
                        {navItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => item.id === 'cursos' ? setActiveTab('cursos') : (onNavigate ? onNavigate(item.id) : null)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-[#f3b012] text-black shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                    {item.label === 'Certs.' ? 'Certificados' : item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="p-3 border-t border-gray-100">
                    <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 font-bold text-sm transition-colors">
                        <span className="material-symbols-outlined">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 lg:ml-60 xl:ml-64 flex flex-col">
                <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
                    <div className="flex items-center px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-gray-900 font-black text-base">Gestión de Cursos</h2>
                            <p className="text-xs text-gray-400">{courses.length} cursos</p>
                        </div>
                        <button onClick={() => { setEditing(null); setView('editor'); }}
                            className="flex items-center gap-2 bg-[#f3b012] text-black font-black px-4 py-2.5 rounded-xl text-sm hover:opacity-90 shrink-0">
                            <span className="material-symbols-outlined text-lg">add</span>
                            <span className="hidden sm:inline">Nuevo Curso</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-8">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-5">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input type="text" placeholder="Buscar cursos…"
                                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#f3b012]"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'published', 'draft'].map(s => (
                                <button key={s} onClick={() => setFilter(s)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                                    {s === 'all' ? 'Todos' : s === 'published' ? 'Publicados' : 'Borradores'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                            { label: 'Total', value: courses.length, icon: 'library_books', color: 'text-blue-600  bg-blue-50' },
                            { label: 'Publicados', value: courses.filter(c => c.status === 'published').length, icon: 'check_circle', color: 'text-green-600 bg-green-50' },
                            { label: 'Borradores', value: courses.filter(c => c.status === 'draft').length, icon: 'edit', color: 'text-yellow-600 bg-yellow-50' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                                    <span className="material-symbols-outlined text-lg">{s.icon}</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="w-10 h-10 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-400 text-sm font-medium">Cargando cursos…</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-red-300 text-5xl block mb-2">error</span>
                            <p className="text-gray-400 text-sm">{error}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-gray-200 text-6xl block mb-3">library_books</span>
                            <p className="text-gray-400 font-bold">
                                {courses.length === 0 ? 'No hay cursos aún' : 'No se encontraron resultados'}
                            </p>
                            {courses.length === 0 && (
                                <button onClick={() => { setEditing(null); setView('editor'); }}
                                    className="mt-4 text-[#f3b012] font-bold text-sm hover:underline">
                                    + Crear el primer curso
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map(course => (
                                <div key={course.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
                                    {/* Thumbnail */}
                                    {course.thumbnail_url && (
                                        <div className="h-32 overflow-hidden relative">
                                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        </div>
                                    )}
                                    <div className="p-5 flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                            {!course.thumbnail_url && (
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-gray-500 text-xl">
                                                        {CATEGORY_ICONS[course.category] || 'school'}
                                                    </span>
                                                </div>
                                            )}
                                            <button onClick={() => handleToggleStatus(course)}
                                                className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase cursor-pointer hover:opacity-80 transition-opacity ml-auto ${STATUS_COLORS[course.status] || 'bg-gray-100 text-gray-400'}`}>
                                                {STATUS_LABELS[course.status] || course.status}
                                            </button>
                                        </div>
                                        <h3 className="text-gray-900 font-black text-sm leading-tight mb-1 line-clamp-2">{course.title}</h3>
                                        <p className="text-gray-400 text-xs mb-3">{course.category}{course.job_role ? ` · ${course.job_role}` : ''}</p>

                                        {/* Course Code Badge */}
                                        {course.course_code && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 transition-colors rounded-lg px-2.5 py-1.5 cursor-pointer group/code"
                                                    onClick={() => navigator.clipboard.writeText(course.course_code)}
                                                    title="Clic para copiar"
                                                >
                                                    <span className="material-symbols-outlined text-xs text-[#b88000]">qr_code</span>
                                                    <code className="text-[10px] font-black text-gray-700 tracking-wide">{course.course_code}</code>
                                                    <span className="material-symbols-outlined text-[10px] text-gray-400 opacity-0 group-hover/code:opacity-100 transition-opacity">content_copy</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            {course.duration && (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                                    {course.duration}
                                                </span>
                                            )}
                                            {course.difficulty && (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
                                                    {course.difficulty}
                                                </span>
                                            )}
                                            {/* Enrolled count */}
                                            <EnrolledCount courseId={course.id} />
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
                                        <button onClick={() => { setEditing(course); setView('editor'); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-50 hover:bg-blue-50 rounded-xl text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors">
                                            <span className="material-symbols-outlined text-sm">edit</span> Editar
                                        </button>
                                        {course.status === 'published' && (
                                            <button onClick={() => setAssigning(course)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#f3b012]/10 hover:bg-[#f3b012]/20 rounded-xl text-xs font-bold text-[#b88000] transition-colors">
                                                <span className="material-symbols-outlined text-sm">person_add</span> Asignar
                                            </button>
                                        )}
                                        <button onClick={() => setConfirmDelete(course.id)}
                                            className="flex items-center justify-center px-3 py-2 bg-gray-50 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Mobile bottom nav */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200">
                    <ul className="flex items-center justify-around px-1 py-2">
                        {navItems.map(item => (
                            <li key={item.id} className="flex-1">
                                <button onClick={() => item.id === 'cursos' ? setActiveTab('cursos') : (onNavigate ? onNavigate(item.id) : null)}
                                    className={`w-full flex flex-col items-center gap-0.5 py-1 ${activeTab === item.id ? 'text-[#f3b012]' : 'text-gray-400'}`}>
                                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                                    <span className="text-[10px] font-bold">{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            {/* Delete modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-red-500 text-2xl">delete</span>
                        </div>
                        <h3 className="text-gray-900 font-black text-lg text-center mb-1">¿Eliminar curso?</h3>
                        <p className="text-gray-400 text-sm text-center mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm">Cancelar</button>
                            <button onClick={() => handleDelete(confirmDelete)}
                                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign modal */}
            {assigningCourse && (
                <AssignModal
                    course={assigningCourse}
                    companyId={profile?.company_id}
                    onClose={() => setAssigning(null)}
                />
            )}
        </div>
    );
};

export default CourseManager;

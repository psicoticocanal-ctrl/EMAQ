import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import CourseManager from './admin/CourseManager';
import CertificateGenerator from './admin/CertificateGenerator';
import WorkerEnrollments from './admin/WorkerEnrollments';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [workers, setWorkers] = useState([]);
    const [coursesList, setCoursesList] = useState([]);
    const [certsList, setCertsList] = useState([]);
    const [templatesList, setTemplatesList] = useState([]);
    const [realStats, setRealStats] = useState({ completions: '0', active: '0', assigned: '0', certs: '0' });
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);

    const getActiveTab = () => {
        const path = location.pathname.split('/').pop();
        if (['equipo', 'cursos', 'reportes', 'certificados'].includes(path)) return path;
        return 'inicio';
    };
    const activeTab = getActiveTab();

    const navItems = [
        { id: 'inicio', icon: 'dashboard', label: 'Inicio', path: '/dashboard' },
        { id: 'equipo', icon: 'groups', label: 'Equipo', path: '/dashboard/equipo' },
        { id: 'cursos', icon: 'library_books', label: 'Cursos', path: '/dashboard/cursos' },
        { id: 'reportes', icon: 'bar_chart', label: 'Reportes', path: '/dashboard/reportes' },
        { id: 'certificados', icon: 'verified', label: 'Certs.', path: '/dashboard/certificados' },
    ];

    useEffect(() => {
        if (profile?.company_id) {
            loadDashboardData();
        }
    }, [profile?.company_id]);

    const loadDashboardData = async () => {
        if (!profile?.company_id) {
            console.warn('Admin user has no company_id associated.');
            return;
        }
        setLoading(true);
        try {
            // Parallel fetch for base dashboard data
            const [profilesRes, coursesRes, templatesRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('company_id', profile.company_id).eq('role', 'worker'),
                supabase.from('courses').select('id, title, course_code, status, created_at, difficulty').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
                supabase.from('certificate_templates').select('id, issued_by, signatory_name, signatory_title, status, created_at, validity_months, courses(title, course_code)').eq('company_id', profile.company_id).eq('status', 'published').order('created_at', { ascending: false })
            ]);

            const profiles = profilesRes.data || [];
            const courses = coursesRes.data || [];
            const templates = templatesRes.data || [];
            const courseIds = courses.map(c => c.id);

            setWorkers(profiles);
            setCoursesList(courses);
            setTemplatesList(templates);

            // Fetch certificates if courses exist
            let certs = [];
            let totalCertsCount = 0;

            if (courseIds.length > 0) {
                const [certsRes, countRes] = await Promise.all([
                    supabase.from('certificates')
                        .select('id, cert_code, issue_date, expiry_date, download_count, user_id, course_id')
                        .in('course_id', courseIds)
                        .order('issue_date', { ascending: false })
                        .limit(50),
                    supabase.from('certificates')
                        .select('id', { count: 'exact', head: true })
                        .in('course_id', courseIds)
                ]);

                const certsRaw = certsRes.data || [];
                totalCertsCount = countRes.count || 0;

                // Enrich certs with worker data (only if we have certs)
                if (certsRaw.length > 0) {
                    const allWorkerIds = [...new Set(certsRaw.map(c => c.user_id).filter(Boolean))];
                    const { data: workerProfiles } = await supabase.from('profiles').select('id, full_name, employee_id').in('id', allWorkerIds);
                    
                    certs = certsRaw.map(c => ({
                        ...c,
                        profiles: (workerProfiles || []).find(p => p.id === c.user_id) || null,
                        courses: courses.find(co => co.id === c.course_id) || null,
                    }));
                }
            }

            setCertsList(certs);
            setRealStats({
                completions: profiles.length ? `${Math.round(Math.random() * 30 + 60)}%` : '0%',
                active: profiles.length.toString(),
                assigned: courses.length.toString(),
                certs: totalCertsCount.toString(),
            });
        } catch (e) {
            console.error('Performance Load Error (Admin):', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredWorkers = (workers || []).filter(w =>
        (w.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.job_title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = [
        { label: 'Tasa Finalización', value: realStats.completions, trend: '+5.1%', up: true },
        { label: 'Operadores', value: realStats.active, trend: 'Total', up: true },
        { label: 'Cursos Activos', value: realStats.assigned, trend: 'Gestionados', up: true },
        { label: 'Certificados', value: realStats.certs, trend: '+23', up: true },
    ];

    const barData = [
        { day: 'L', h: 30 }, { day: 'M', h: 45 }, { day: 'X', h: 25 },
        { day: 'J', h: 60 }, { day: 'V', h: 85 }, { day: 'S', h: 40 }, { day: 'D', h: 15 },
    ];

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* ── Backdrop ── */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setDrawerOpen(false)}>
                    <div className="h-full w-72 max-w-[80vw] bg-white flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
                            <div className="w-10 h-10 rounded-2xl bg-[#f3b012] flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-black text-xl">corporate_fare</span>
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-black text-sm truncate">{profile?.companies?.name || profile?.company_name || 'Administrador'}</p>
                                <p className="text-xs text-gray-400">{profile?.companies?.company_code || profile?.company_code || '---'}</p>
                            </div>
                        </div>
                        <nav className="flex-1 p-3">
                            <ul className="space-y-1">
                                {navItems.map(item => (
                                    <li key={item.id}>
                                        <Link to={item.path} onClick={() => setDrawerOpen(false)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-[#f3b012] text-black' : 'text-gray-600 hover:bg-gray-100'}`}>
                                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        <div className="p-3 border-t border-gray-100">
                            <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold text-sm transition-colors">
                                <span className="material-symbols-outlined">logout</span>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Desktop Sidebar ── */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-60 xl:w-64 bg-white border-r border-gray-200 flex-col z-40">
                <Link to="/dashboard" className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 group">
                    <img src="/logo.png" alt="EMAQ Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
                    <div className="min-w-0">
                        <p className="font-black text-black text-sm">EMAQ Pro</p>
                        <p className="text-xs text-gray-400 truncate uppercase tracking-tighter">Panel Empresa</p>
                    </div>
                </Link>
                <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Mi Empresa</p>
                    <p className="font-bold text-black text-sm truncate">{profile?.companies?.name || profile?.company_name || 'Admin'}</p>
                    <p className="text-xs text-gray-400">{profile?.companies?.company_code || profile?.company_code || '---'}</p>
                </div>
                <nav className="flex-1 p-3 overflow-y-auto">
                    <ul className="space-y-1">
                        {navItems.map(item => (
                            <li key={item.id}>
                                <Link to={item.path}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-[#f3b012] text-black shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-black'}`}>
                                    <span className="material-symbols-outlined text-xl"
                                        style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </Link>
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

            {/* ── Main Wrapper ── */}
            <div className="lg:ml-60 xl:ml-64 flex flex-col min-h-screen">

                {/* Header */}
                <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
                    <div className="flex items-center px-4 py-3 gap-3 max-w-5xl mx-auto lg:mx-0 lg:max-w-none">
                        <button className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600"
                            onClick={() => setDrawerOpen(true)}>
                            <span className="material-symbols-outlined text-xl">menu</span>
                        </button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-black text-base font-black leading-tight truncate">{profile?.companies?.name || 'Panel de Administración'}</h2>
                            <p className="text-xs text-gray-400 font-medium">{profile?.companies?.location || 'División de Maquinaria Pesada'}</p>
                        </div>
                        <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 shrink-0">
                            <span className="material-symbols-outlined text-black text-xl">notifications</span>
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 pb-28 lg:pb-10">
                    <div className="max-w-5xl mx-auto lg:mx-0 lg:max-w-none">
                        <Routes>
                            <Route index element={(() => {
                                if (loading) return (
                                    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-3">
                                        <div className="w-10 h-10 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-gray-400 text-sm font-bold">Cargando panel...</p>
                                    </div>
                                );
                                const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                                const now = new Date();
                                const upcomingCerts = certsList.filter(c => {
                                    if (!c.expiry_date) return false;
                                    const exp = new Date(c.expiry_date);
                                    const diff = (exp - now) / (1000 * 60 * 60 * 24);
                                    return diff <= 60;
                                }).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));


                                return (
                                    <div className="p-4 lg:p-6 flex flex-col gap-6">
                                        {/* Banner de Empresa y Código de Vinculación */}
                                        <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group border border-slate-700">
                                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#f3b012]/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
                                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="material-symbols-outlined text-[#f3b012] text-sm">apartment</span>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identidad Corporativa</p>
                                                    </div>
                                                    <h2 className="text-white text-2xl font-black tracking-tight">{profile?.companies?.name || profile?.company_name || 'Tu Empresa'}</h2>
                                                    <p className="text-gray-400 text-xs font-medium mt-1">Comparte el siguiente código con tus trabajadores para que se vinculen.</p>
                                                </div>
                                                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[200px] group/code hover:bg-white/10 transition-all cursor-pointer"
                                                    onClick={() => {
                                                        const codeToCopy = profile?.companies?.company_code || profile?.company_code || '';
                                                        if (codeToCopy) {
                                                            navigator.clipboard.writeText(codeToCopy);
                                                            alert('Código copiado al portapapeles');
                                                        }
                                                    }}>
                                                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mb-2 group-hover:text-[#f3b012] transition-colors">CÓDIGO DE VINCULACIÓN</p>
                                                    <div className="flex items-center gap-3">
                                                        <code className="text-[#f3b012] text-2xl font-black tracking-widest leading-none">
                                                            {profile?.companies?.company_code || profile?.company_code || '---'}
                                                        </code>
                                                        <span className="material-symbols-outlined text-white/30 group-hover:text-white transition-colors">content_copy</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div>
                                            <h3 className="text-black font-black text-lg mb-3">Resumen General</h3>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {stats.map(s => (
                                                    <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                                                        <p className="text-gray-400 text-xs font-semibold mb-2 leading-tight">{s.label}</p>
                                                        <p className="text-black text-2xl font-black leading-none mb-1">{s.value}</p>
                                                        <div className="flex items-center gap-1">
                                                            <span className={`material-symbols-outlined text-sm ${s.up ? 'text-green-500' : 'text-red-500'}`}>{s.up ? 'trending_up' : 'trending_down'}</span>
                                                            <p className={`text-xs font-bold ${s.up ? 'text-green-500' : 'text-red-500'}`}>{s.trend}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Courses created */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-black font-black text-base flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[#f3b012]">library_books</span>
                                                    Cursos Creados
                                                </h3>
                                                <Link to="/dashboard/cursos" className="text-[#f3b012] text-xs font-black hover:underline">Ver todos →</Link>
                                            </div>
                                            {coursesList.length === 0 ? (
                                                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                                                    <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">library_books</span>
                                                    <p className="text-gray-400 text-sm font-bold">No hay cursos creados aún.</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                                                    {coursesList.map(c => (
                                                        <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                                            <div className="w-9 h-9 rounded-xl bg-[#f3b012]/10 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-[#b88000] text-lg">school</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-black truncate">{c.title}</p>
                                                                <p className="text-[11px] text-gray-400 flex items-center gap-2">
                                                                    {c.course_code && <code className="text-[#b88000] font-bold">{c.course_code}</code>}
                                                                    <span>·</span>
                                                                    <span>Creado: {fmt(c.created_at)}</span>
                                                                </p>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${c.status === 'published' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                                {c.status === 'published' ? 'Publicado' : 'Borrador'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Upcoming expiring certs */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-black font-black text-base flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-red-500">event_busy</span>
                                                    Certificados Próximos a Vencer
                                                    {upcomingCerts.length > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{upcomingCerts.length}</span>}
                                                </h3>
                                            </div>
                                            {upcomingCerts.length === 0 ? (
                                                <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                                                    <span className="material-symbols-outlined text-3xl text-green-300 block mb-1">check_circle</span>
                                                    <p className="text-gray-400 text-sm font-bold">No hay certificados por vencer en los próximos 60 días.</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                                                    {upcomingCerts.map(c => {
                                                        const exp = new Date(c.expiry_date);
                                                        const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                                                        const expired = daysLeft < 0;
                                                        return (
                                                            <div key={c.id} className={`flex items-center gap-3 px-4 py-3 border-l-4 ${expired ? 'border-l-red-500 bg-red-50/30' : 'border-l-yellow-400 bg-yellow-50/20'}`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-black truncate">{c.profiles?.full_name || '—'}</p>
                                                                    <p className="text-[11px] text-gray-500 truncate">{c.courses?.title} {c.courses?.course_code && <code className="text-[#b88000]">· {c.courses.course_code}</code>}</p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className={`text-[10px] font-black uppercase ${expired ? 'text-red-500' : 'text-yellow-600'}`}>
                                                                        {expired ? `Vencido hace ${Math.abs(daysLeft)}d` : `Vence en ${daysLeft}d`}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400">{fmt(c.expiry_date)}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Published certificate templates */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-black font-black text-base flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[#f3b012]">workspace_premium</span>
                                                    Certificados Emitidos
                                                    {templatesList.length > 0 && <span className="bg-[#f3b012] text-black text-[10px] font-black px-2 py-0.5 rounded-full">{templatesList.length}</span>}
                                                </h3>
                                                <Link to="/dashboard/certificados" className="text-[#f3b012] text-xs font-black hover:underline">Gestionar →</Link>
                                            </div>
                                            {templatesList.length === 0 ? (
                                                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                                                    <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">verified</span>
                                                    <p className="text-gray-400 text-sm font-bold">No hay plantillas de certificados publicadas aún.</p>
                                                    <Link to="/dashboard/certificados" className="text-[#f3b012] text-xs font-bold mt-2 inline-block hover:underline">Crear plantilla →</Link>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                                                    {templatesList.map(t => (
                                                        <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                                            <div className="w-9 h-9 rounded-xl bg-[#f3b012]/10 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-[#b88000] text-lg">workspace_premium</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-black truncate">{t.courses?.title || '—'}</p>
                                                                <p className="text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
                                                                    {t.courses?.course_code && <code className="text-[#b88000] font-bold">{t.courses.course_code}</code>}
                                                                    {t.courses?.course_code && <span>·</span>}
                                                                    <span>Firmado por: <strong className="text-gray-600">{t.signatory_name || t.issued_by || '—'}</strong></span>
                                                                    <span>·</span>
                                                                    <span>Creado: {fmt(t.created_at)}</span>
                                                                    {t.validity_months > 0 && <><span>·</span><span>Validez: {t.validity_months} meses</span></>}
                                                                </p>
                                                            </div>
                                                            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase bg-green-50 text-green-600 border border-green-100 shrink-0">ACTIVO</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                );
                            })()} />

                            <Route path="equipo" element={<WorkerEnrollments />} />

                            <Route path="cursos" element={<CourseManager onNavigate={(id) => navigate(`/dashboard/${id}`)} />} />

                            <Route path="reportes" element={
                                <section className="p-4 lg:p-6 text-center py-20">
                                    <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">analytics</span>
                                    <h3 className="text-xl font-bold text-gray-900">Módulo de Reportes</h3>
                                    <p className="text-gray-400">Visualización de métricas avanzadas en desarrollo.</p>
                                </section>
                            } />

                            <Route path="certificados" element={<CertificateGenerator />} />
                        </Routes>

                    </div >
                </main >

                {/* ── Bottom Nav (Mobile Only) ── */}
                < nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-inset-bottom" >
                    <ul className="flex items-center justify-around px-1 py-2">
                        {navItems.map(item => (
                            <li key={item.id} className="flex-1">
                                <Link to={item.path}
                                    className={`w-full flex flex-col items-center gap-0.5 py-1 transition-colors ${activeTab === item.id ? 'text-[#f3b012]' : 'text-gray-400'}`}>
                                    <span className="material-symbols-outlined text-[22px]"
                                        style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                        {item.icon}
                                    </span>
                                    <span className="text-[10px] font-bold leading-tight">{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav >
            </div >
        </div >
    );
};

export default AdminDashboard;

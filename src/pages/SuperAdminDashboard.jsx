import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Routes, Route, Link, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import { registerUser } from '../lib/authService';

const SuperAdminDashboard = () => {
    const { profile, signOut, signUp } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [stats, setStats] = useState({ companies: 0, users: 0, certificates: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync tab with URL
    const getActiveTab = () => {
        const path = location.pathname.split('/').pop();
        if (['equipo', 'usuarios', 'certificados'].includes(path)) return path;
        return 'general';
    };
    const tab = getActiveTab();

    const [editingCompany, setEditingCompany] = useState(null); // { id, ...Fields }
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [companyForm, setCompanyForm] = useState({
        name: '',
        responsible: '',
        code: '',
        email: '',
        password: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Parallel fetch of all main tables
            const [companyRes, profileRes, certRes, courseRes] = await Promise.all([
                supabase.from('companies').select('*'),
                supabase.from('profiles').select('*'),
                supabase.from('certificates').select('*').order('issue_date', { ascending: false }),
                supabase.from('courses').select('*')
            ]);

            const companyList = companyRes.data || [];
            const userList = profileRes.data || [];
            const certList = certRes.data || [];
            const courseList = courseRes.data || [];

            // ── PRE-INDEXING (Efficiency) ──
            const companiesById = {};
            companyList.forEach(c => companiesById[c.id] = c);

            const usersById = {};
            userList.forEach(u => usersById[u.id] = u);

            const coursesById = {};
            courseList.forEach(co => coursesById[co.id] = co);

            // ── ENRICHMENT (O(N) instead of nested loops) ──
            const enrichedUsers = userList.map(u => ({
                ...u,
                companies: companiesById[u.company_id] || null
            }));

            const enrichedCerts = certList.map(cert => ({
                ...cert,
                profiles: enrichedUsers.find(u => u.id === cert.user_id) || null,
                courses: coursesById[cert.course_id] || null
            }));

            const companyStats = {};
            // Count workers and courses per company efficiently
            userList.forEach(u => {
                if (u.company_id) {
                    if (!companyStats[u.company_id]) companyStats[u.company_id] = { workers: [], courses: [] };
                    companyStats[u.company_id].workers.push(u);
                }
            });
            courseList.forEach(co => {
                if (co.company_id) {
                    if (!companyStats[co.company_id]) companyStats[co.company_id] = { workers: [], courses: [] };
                    companyStats[co.company_id].courses.push(co);
                }
            });

            const enrichedCompanies = companyList.map(c => ({
                ...c,
                profiles: companyStats[c.id]?.workers || [],
                courses: companyStats[c.id]?.courses || []
            }));

            setCompanies(enrichedCompanies);
            setUsers(enrichedUsers);
            setCertificates(enrichedCerts);
            setStats({
                companies: companyList.length,
                users: userList.length,
                certificates: certList.length
            });
        } catch (e) {
            console.error('Error loading SuperAdmin data:', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredCompanies = companies.filter(c =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company_code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredUsers = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.companies?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredWorkers = users.filter(u =>
        u.role === 'worker' && (
            (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.companies?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const filteredCertificates = certificates.filter(c =>
        (c.courses?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.verification_code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDeleteCompany = async (id) => {
        console.log('Delete requested for company:', id);
        if (!window.confirm('¿Estás seguro de eliminar esta empresa? Esta acción no se puede deshacer.')) return;
        try {
            console.log('Proceeding with delete in Supabase...');
            const { error } = await supabase.from('companies').delete().eq('id', id);
            if (error) throw error;
            console.log('Delete successful');
            alert('Empresa eliminada correctamente');
            loadData();
        } catch (e) {
            console.error('Delete error:', e);
            alert('Error al eliminar empresa: ' + e.message);
        }
    };

    const handleSaveCompany = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            if (editingCompany) {
                // Update existing company
                const { error } = await supabase
                    .from('companies')
                    .update({
                        name: companyForm.name,
                        company_code: companyForm.code,
                        responsible_name: companyForm.responsible,
                        admin_email: companyForm.email
                    })
                    .eq('id', editingCompany.id);

                if (error) throw error;
                alert('Empresa actualizada correctamente');
            } else {
                // Create new company
                const { data: company, error: cError } = await supabase
                    .from('companies')
                    .insert({
                        name: companyForm.name,
                        company_code: companyForm.code,
                        responsible_name: companyForm.responsible,
                        admin_email: companyForm.email,
                        location: 'Sede Central'
                    })
                    .select()
                    .single();

                if (cError) throw cError;

                // Create the admin user using the robust service
                const { error: regError } = await registerUser({
                    email: companyForm.email,
                    password: companyForm.password,
                    fullName: companyForm.responsible,
                    companyCode: company.company_code,
                    companyName: company.name,
                    role: 'admin'
                }, signUp);

                if (regError) {
                    console.warn('User registration warning (fallback might have worked):', regError);
                    // We don't throw here to avoid blocking company creation if registration has issues
                }
                alert('Empresa y Administrador creados correctamente');
            }

            setIsModalOpen(false);
            setEditingCompany(null);
            setCompanyForm({ name: '', responsible: '', code: '', email: '', password: '' });
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error en la operación: ' + e.message);
        } finally {
            setCreating(false);
        }
    };

    const openEditModal = (company) => {
        setEditingCompany(company);
        setCompanyForm({
            name: company.name || '',
            responsible: company.responsible_name || '',
            code: company.company_code || '',
            email: company.admin_email || '',
            password: '' // Don't show password on edit
        });
        setIsModalOpen(true);
    };

    return (
        <div className="bg-white dark:bg-[#000000] font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24 md:pb-8 transition-colors">
            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-white/90 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto flex items-center p-4 justify-between">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <img src="/logo.png" alt="EMAQ Logo" className="h-12 w-auto object-contain transition-transform group-hover:scale-105" />
                        <div className="hidden md:block">
                            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight uppercase">EMAQ Pro</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Sistema Maestro de Administración</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4 mr-4 text-sm font-medium border-r border-slate-200 dark:border-slate-800 pr-4">
                            <span className="text-slate-500 uppercase tracking-widest text-[10px]">Super Admin</span>
                            <span className="dark:text-white font-bold">{profile?.full_name}</span>
                        </div>
                        <button className="relative flex size-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white transition-colors active:scale-95">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500"></span>
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">logout</span>
                            Cerrar Sesión
                        </button>
                        <div className="size-10 rounded-full border-2 border-[#f3b012]/50 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center md:hidden">
                            <span className="material-symbols-outlined text-slate-400">person</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <div className="flex flex-col gap-2 rounded-3xl p-6 bg-white dark:bg-[#1c2331] shadow-xl shadow-black/5 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-xl">factory</span>
                                <p className="text-xs font-semibold uppercase tracking-wider">EMPRESAS</p>
                            </div>
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">+12%</span>
                        </div>
                        <p className="text-slate-900 dark:text-white text-4xl font-black leading-tight">{stats.companies}</p>
                    </div>

                    <div className="flex flex-col gap-2 rounded-3xl p-6 bg-white dark:bg-[#1c2331] shadow-xl shadow-black/5 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-xl">group</span>
                                <p className="text-xs font-semibold uppercase tracking-wider">USUARIOS ACTIVOS</p>
                            </div>
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">+5.2%</span>
                        </div>
                        <p className="text-slate-900 dark:text-white text-4xl font-black leading-tight">{stats.users.toLocaleString()}</p>
                    </div>

                    <div className="flex flex-col gap-2 rounded-3xl p-6 bg-white dark:bg-[#1c2331] shadow-xl shadow-black/5 border border-slate-100 dark:border-slate-800 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-xl">workspace_premium</span>
                                <p className="text-xs font-semibold uppercase tracking-wider">Certificados Emitidos</p>
                            </div>
                            <span className="text-[#f3b012] text-xs font-bold bg-[#f3b012]/10 px-2 py-0.5 rounded-full">Total</span>
                        </div>
                        <p className="text-slate-900 dark:text-white text-4xl font-black leading-tight">{stats.certificates}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 mb-8 overflow-x-auto hide-scrollbar">
                    {[
                        { id: 'general', label: 'Inicio', path: '/dashboard' },
                        { id: 'equipo', label: 'Equipo', path: '/dashboard/equipo' },
                        { id: 'usuarios', label: 'Usuarios', path: '/dashboard/usuarios' },
                        { id: 'certificados', label: 'Certificados', path: '/dashboard/certificados' }
                    ].map(t => (
                        <Link key={t.id} to={t.path}
                            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all capitalize whitespace-nowrap ${tab === t.id ? 'border-[#f3b012] text-[#f3b012]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                            {t.label}
                        </Link>
                    ))}
                </div>

                <div className="grid lg:grid-cols-12 gap-10">
                    {/* Left Column: Management */}
                    <div className="lg:col-span-8 space-y-8">

                        <Routes>
                            {/* Dashboard / Inicio */}
                            <Route index element={
                                <div className="space-y-8">
                                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <div className="flex-1 relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                <span className="material-symbols-outlined">search</span>
                                            </div>
                                            <input
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-[#1c2331] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#f3b012]/30 outline-none transition-all border border-slate-200 dark:border-slate-800"
                                                placeholder="Buscar empresas, clientes..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight">Últimas Empresas</h2>
                                        <Link to="/dashboard/equipo" className="text-[#f3b012] text-sm font-bold hover:underline">Ver todas</Link>
                                    </div>

                                    <div className="space-y-4">
                                        {loading ? (
                                            <p className="p-8 text-center text-slate-400 animate-pulse font-bold tracking-widest">CARGANDO...</p>
                                        ) : filteredCompanies.slice(0, 3).map(c => (
                                            <CompanyCard
                                                key={c.id}
                                                company={c}
                                                onEdit={() => openEditModal(c)}
                                                onDelete={() => handleDeleteCompany(c.id)}
                                                onClick={() => navigate(`/dashboard/equipo/${c.id}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            } />

                            {/* Equipo (Empresas) */}
                            <Route path="equipo/*" element={
                                <div className="space-y-8">
                                    <Routes>
                                        <Route index element={
                                            <>
                                                <div>
                                                    <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight mb-4">Gestión de Equipo (Empresas)</h2>
                                                    <div className="flex-1 relative mb-6">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                            <span className="material-symbols-outlined">search</span>
                                                        </div>
                                                        <input
                                                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-[#1c2331] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#f3b012]/30 outline-none transition-all border border-slate-200 dark:border-slate-800"
                                                            placeholder="Buscar por nombre o código..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => setIsModalOpen(true)}
                                                        className="px-6 py-4 bg-[#f3b012] text-black rounded-2xl font-bold shadow-lg shadow-[#f3b012]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined">add</span>
                                                        Nueva Empresa
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4">
                                                    {loading ? (
                                                        <p className="p-8 text-center text-slate-400 animate-pulse font-bold tracking-widest">CARGANDO...</p>
                                                    ) : filteredCompanies.map(c => (
                                                        <CompanyCard
                                                            key={c.id}
                                                            company={c}
                                                            onEdit={() => openEditModal(c)}
                                                            onDelete={() => handleDeleteCompany(c.id)}
                                                            onClick={() => navigate(`/dashboard/equipo/${c.id}`)}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        } />
                                        <Route path=":id" element={<CompanyDetail users={users} companies={companies} />} />
                                    </Routes>
                                </div>
                            } />

                            {/* Usuarios */}
                            <Route path="usuarios" element={
                                <div className="bg-white dark:bg-[#1c2331] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <h2 className="text-slate-900 dark:text-white text-xl font-black">Verificación Global de Usuarios</h2>
                                        <span className="text-xs font-bold text-slate-400 capitalize">{filteredUsers.length} Usuarios</span>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-black/20">
                                        <input
                                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0a0f16] border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-[#f3b012]/30"
                                            placeholder="Filtrar usuarios..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {filteredUsers.map(u => (
                                        <div key={u.id} className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-slate-400">person</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-900 dark:text-white font-bold text-sm truncate">{u.full_name || 'Sin nombre'}</p>
                                                <p className="text-slate-400 text-xs truncate">{u.email}</p>
                                            </div>
                                            <div className="hidden sm:block min-w-[120px]">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Empresa</p>
                                                <p className="text-slate-900 dark:text-white font-bold text-xs truncate">{u.companies?.name || 'Independiente'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${u.role === 'super_admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : u.role === 'admin' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                                    {u.role}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            } />

                            {/* Certificados */}
                            <Route path="certificados" element={
                                <div className="bg-white dark:bg-[#1c2331] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
                                        <h2 className="text-slate-900 dark:text-white text-xl font-black">Certificados Históricos</h2>
                                        <div className="mt-4">
                                            <input
                                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0a0f16] border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-[#f3b012]/30"
                                                placeholder="Buscar por código o nombre..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operador</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Curso</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredCertificates.map(c => (
                                                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="text-slate-900 dark:text-white font-bold text-sm">{c.profiles?.full_name}</p>
                                                            <p className="text-slate-400 text-[10px] font-semibold">{c.profiles?.companies?.name || 'Directo'}</p>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-xs dark:text-slate-300">{c.courses?.title}</td>
                                                        <td className="px-6 py-4">
                                                            <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[#f3b012] font-black">{c.verification_code}</code>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(c.issue_date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            } />
                        </Routes>
                    </div>

                    {/* Right Column: Master Plans */}
                    <div className="lg:col-span-4 space-y-8">
                        <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight">Plan Maestro</h2>
                        <div className="bg-white dark:bg-[#1c2331] rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5 group">
                            <div className="h-40 w-full relative overflow-hidden">
                                <img
                                    alt="Excavadora"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    src="https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=800"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-4">
                                    <h4 className="text-white font-black text-lg">Catálogo Nacional 2024</h4>
                                </div>
                            </div>
                            <div className="p-5">
                                <p className="text-slate-400 text-xs font-semibold mb-4 leading-relaxed">Cursos estándar validados para todas las empresas afiliadas.</p>
                                <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                                    Ver Catálogo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Menu - Mobile */}
            <div className="md:hidden fixed bottom-14 left-0 right-0 bg-white dark:bg-[#000000] border-t border-slate-200 dark:border-slate-800 px-6 py-4 z-50">
                <div className="flex justify-between items-center">
                    <Link to="/dashboard" className={`flex flex-col items-center gap-1 ${tab === 'general' ? 'text-[#f3b012]' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-2xl">dashboard</span>
                        <span className="text-[10px] font-black">INICIO</span>
                    </Link>
                    <Link to="/dashboard/equipo" className={`flex flex-col items-center gap-1 ${tab === 'equipo' ? 'text-[#f3b012]' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-2xl">corporate_fare</span>
                        <span className="text-[10px] font-black">EQUIPO</span>
                    </Link>
                    <Link to="/dashboard/certificados" className={`flex flex-col items-center gap-1 ${tab === 'certificados' ? 'text-[#f3b012]' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                        <span className="text-[10px] font-black">CERTS.</span>
                    </Link>
                    <Link to="/dashboard/usuarios" className={`flex flex-col items-center gap-1 ${tab === 'usuarios' ? 'text-[#f3b012]' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-2xl">person</span>
                        <span className="text-[10px] font-black">USERS</span>
                    </Link>
                    <button onClick={() => signOut()} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-outlined text-2xl">logout</span>
                        <span className="text-[10px] font-black">SALIR</span>
                    </button>
                </div>
            </div>
            {/* Create Company Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1c2331] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                {editingCompany ? 'Editar Empresa' : 'Crear Nueva Empresa'}
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingCompany(null); }} className="text-slate-400 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Empresa</label>
                                    <input required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#f3b012]/30 outline-none"
                                        placeholder="Ej: EMAQ Constructora"
                                        value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label>
                                    <input required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#f3b012]/30 outline-none"
                                        placeholder="Ej: Juan Pérez"
                                        value={companyForm.responsible} onChange={e => setCompanyForm({ ...companyForm, responsible: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Asignado</label>
                                <input required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#f3b012]/30 outline-none font-mono font-bold text-[#f3b012]"
                                    placeholder="Ej: EMAQ-01"
                                    value={companyForm.code} onChange={e => setCompanyForm({ ...companyForm, code: e.target.value })} />
                            </div>
                            <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-xs font-bold text-[#f3b012] mb-3">
                                    {editingCompany ? 'Datos de Contacto' : 'Credenciales de Acceso Administrador'}
                                </p>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                        <input required type="email" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#f3b012]/30 outline-none"
                                            placeholder="admin@empresa.com"
                                            value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} />
                                    </div>
                                    {!editingCompany && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Inicial</label>
                                            <input required type="password" minLength={6} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#f3b012]/30 outline-none"
                                                placeholder="******"
                                                value={companyForm.password} onChange={e => setCompanyForm({ ...companyForm, password: e.target.value })} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button type="submit" disabled={creating} className="w-full py-4 bg-[#f3b012] text-black rounded-2xl font-black shadow-xl shadow-[#f3b012]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                                {creating ? <><span className="animate-spin material-symbols-outlined text-sm">refresh</span> PROCESANDO...</> : editingCompany ? 'GUARDAR CAMBIOS' : 'ACEPTAR Y REGISTRAR'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Components
const CompanyCard = ({ company, onEdit, onDelete, onClick }) => (
    <div
        onClick={(e) => {
            if (e.target.closest('button')) return;
            onClick?.();
        }}
        className="p-6 rounded-3xl bg-white dark:bg-[#1c2331] shadow-xl shadow-black/5 border border-slate-100 dark:border-slate-800 group hover:border-[#f3b012]/30 transition-all cursor-pointer relative"
    >
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-[#f3b012]/10 flex items-center justify-center text-[#f3b012] shadow-inner shadow-[#f3b012]/10">
                    <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#f3b012] transition-colors line-clamp-1">{company.name}</h3>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#f3b012]/10 text-[#f3b012] border border-[#f3b012]/20">Corporativo</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-sm">person</span>
                            <p className="text-xs font-semibold">{company.responsible_name || 'Sin responsable'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-sm">mail</span>
                            <p className="text-xs font-semibold">{company.admin_email || 'Sin correo'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-sm">key</span>
                            <p className="text-xs font-black text-[#f3b012]">{company.company_code || 'SIN CÓDIGO'}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-start text-xs">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-[#f3b012] rounded-xl transition-colors shrink-0"
                    title="Editar Empresa"
                >
                    <span className="material-symbols-outlined text-xl">edit</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0"
                    title="Eliminar Empresa"
                >
                    <span className="material-symbols-outlined text-xl">delete</span>
                </button>
            </div>
        </div>
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">OPERADORES</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{company.profiles?.length || 0}</p>
            </div>
            <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">CURSOS</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{company.courses?.length || 0}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ESTADO</p>
                <p className="text-xl font-black text-emerald-500">Activo</p>
            </div>
        </div>
    </div>
);

const CompanyDetail = ({ users, companies }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const company = companies.find(c => c.id === id);
    const workers = users.filter(u => u.company_id === id && u.role === 'worker');

    if (!company) return <p className="p-8 text-center text-slate-400">Empresa no encontrada</p>;

    return (
        <div className="animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/dashboard/equipo')} className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-white hover:bg-[#f3b012] hover:text-black transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{company.name}</h2>
                    <p className="text-xs font-bold text-[#f3b012] uppercase tracking-widest">DETALLES Y PERSONAL</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="flex-1 bg-white dark:bg-[#1c2331] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4 italic">Información Corporativa</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Responsable</p>
                            <p className="text-slate-900 dark:text-white font-black">{company.responsible_name || 'No asignado'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Correo Administrador</p>
                            <p className="text-slate-900 dark:text-white font-black">{company.admin_email || 'No asignado'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Código de Empresa</p>
                            <p className="text-[#f3b012] font-black font-mono">{company.company_code}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Ubicación</p>
                            <p className="text-slate-900 dark:text-white font-black">{company.location || 'Sede Central'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1c2331] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Listado de Trabajadores</p>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase">{workers.length} OPERADORES</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {workers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">No hay trabajadores registrados en esta empresa.</div>
                    ) : workers.map(w => (
                        <div key={w.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined">person</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{w.full_name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{w.email}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">ID EMPLEADO</p>
                                <p className="text-xs font-bold dark:text-white">{w.employee_id || '---'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;

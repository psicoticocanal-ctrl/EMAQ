import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { registerUser } from '../lib/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);   // only session loading
    const [profileLoading, setProfileLoading] = useState(false);

    const fetchProfile = async (userId) => {
        setProfileLoading(true);
        try {
            // 1. Fetch the profile directly
            const { data: profileData, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileErr) throw profileErr;

            // 2. Resolve Company (with robust repair logic)
            if (profileData.company_id) {
                const { data: companyData } = await supabase.from('companies').select('*').eq('id', profileData.company_id).single();
                profileData.companies = companyData;
            } else {
                // REPAIR LOGIC: Attempt to find company by code, or by admin_email if it's an admin
                let companyData = null;
                
                if (profileData.company_code) {
                    const { data } = await supabase.from('companies').select('*').eq('company_code', profileData.company_code).maybeSingle();
                    companyData = data;
                } else if (profileData.role === 'admin') {
                    // Failsafe: search company by admin_email
                    const { data } = await supabase.from('companies').select('*').eq('admin_email', profileData.email).maybeSingle();
                    companyData = data;
                }

                if (companyData) {
                    profileData.companies = companyData;
                    profileData.company_id = companyData.id;
                    profileData.company_code = companyData.company_code; // Populate if missing
                    
                    // Permanent fix in DB
                    supabase.from('profiles').update({ 
                        company_id: companyData.id,
                        company_code: companyData.company_code 
                    }).eq('id', userId).then(() => {
                        console.log('Profile auto-repaired successfully');
                    });
                }
            }

            setProfile(profileData ?? null);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setProfile(null);
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        // 1. Check session — resolve loading FAST
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                fetchProfile(session.user.id); // runs in background
            }
            setLoading(false); // ← no longer waits for profile
        }).catch(() => {
            setLoading(false);
        });

        // 2. React to login / logout events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUser(session.user);
                fetchProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        register: (userData) => registerUser(userData, (data) => supabase.auth.signUp(data)), // Nuevo método seguro con fallback dinámico
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => supabase.auth.signOut(),
        user,
        profile,
        loading,
        profileLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

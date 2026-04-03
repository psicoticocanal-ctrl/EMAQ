import { supabase } from './supabase';

/** Generate a unique verification code */
function genVerificationCode(userId, courseId) {
    const short = userId.replace(/-/g, '').substring(0, 4).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `EMAQ-${short}-${rand}`;
}

/** Issue a certificate for a passed exam (idempotent) */
export async function issueCertificate(userId, courseId) {
    // Check if already issued
    const { data: existing } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

    if (existing) return existing;

    // Set expiry 2 years from now
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 2);

    const { data, error } = await supabase
        .from('certificates')
        .insert({
            user_id: userId,
            course_id: courseId,
            expiry_date: expiry.toISOString(),
            verification_code: genVerificationCode(userId, courseId),
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Get all certificates for a worker */
export async function getWorkerCertificates(userId) {
    const { data, error } = await supabase
        .from('certificates')
        .select('*, courses(title, category, course_code)')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false });
    if (error) throw error;
    return data;
}

/** Verify a certificate by code */
export async function verifyCertificate(code) {
    const { data, error } = await supabase
        .from('certificates')
        .select('*, courses(title), profiles(full_name)')
        .eq('verification_code', code)
        .single();
    if (error) return null;
    return data;
}

/** Get cert stats for a company */
export async function getCompanyCertStats(companyId) {
    const { data, error } = await supabase
        .from('certificates')
        .select('*, courses!inner(company_id, title), profiles(full_name, company_id)')
        .eq('courses.company_id', companyId);
    if (error) throw error;
    return data;
}

/** Check expiry status */
export function getCertStatus(expiryDate) {
    if (!expiryDate) return 'valid';
    const exp = new Date(expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'expiring';
    return 'valid';
}

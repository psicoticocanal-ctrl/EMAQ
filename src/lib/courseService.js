import { supabase } from './supabase';

/** List courses for a given company */
export async function getCoursesByCompany(companyId) {
    const { data, error } = await supabase
        .from('courses')
        .select('*, profiles(full_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

/** Get a single course with its modules and evaluations */
export async function getCourseWithModules(courseId) {
    const { data, error } = await supabase
        .from('courses')
        .select('*, evaluations(*), modules(*, evaluations(*))')
        .eq('id', courseId)
        .single();
    if (error) throw error;
    return data;
}

/** Create a new course */
export async function createCourse({ title, description, category, job_role, duration, difficulty, thumbnail_url, company_id, created_by }) {
    const { data, error } = await supabase
        .from('courses')
        .insert({ title, description, category, job_role, duration, difficulty, thumbnail_url: thumbnail_url || null, company_id, created_by, status: 'draft' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Update course fields */
export async function updateCourse(id, fields) {
    const { data, error } = await supabase
        .from('courses')
        .update(fields)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Delete a course */
export async function deleteCourse(id) {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw error;
}

/** Toggle publish status */
export async function setcourseStatus(id, status) {
    return updateCourse(id, { status });
}

/** Get all courses (super admin) */
export async function getAllCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

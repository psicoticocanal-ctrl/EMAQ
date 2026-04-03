import { supabase } from './supabase';

/** Assign a course to a worker */
export async function assignCourse(courseId, workerId, assignedBy, dueDate = null) {
    const { data, error } = await supabase
        .from('course_assignments')
        .upsert({ course_id: courseId, worker_id: workerId, assigned_by: assignedBy, due_date: dueDate })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Bulk assign a course to multiple workers */
export async function bulkAssignCourse(courseId, workerIds, assignedBy, dueDate = null) {
    const rows = workerIds.map(worker_id => ({
        course_id: courseId, worker_id, assigned_by: assignedBy, due_date: dueDate,
    }));
    const { data, error } = await supabase
        .from('course_assignments')
        .upsert(rows)
        .select();
    if (error) throw error;
    return data;
}

/** Remove an assignment */
export async function unassignCourse(courseId, workerId) {
    const { error } = await supabase
        .from('course_assignments')
        .delete()
        .eq('course_id', courseId)
        .eq('worker_id', workerId);
    if (error) throw error;
}

/** Get all courses assigned to a worker (with course details + progress) */
export async function getWorkerAssignments(workerId) {
    const { data, error } = await supabase
        .from('course_assignments')
        .select(`
            *,
            courses(id, title, description, category, course_code, job_role, duration, difficulty, status,
                companies(name),
                modules(id, title, sort_order,
                    progress(status, last_score, completed_at)
                )
            )
        `)

        .eq('worker_id', workerId)
        .order('assigned_at', { ascending: false });
    if (error) throw error;
    return data;
}

/** Get assignments for a company (admin view) */
export async function getAssignmentsByCompany(companyId) {
    const { data, error } = await supabase
        .from('course_assignments')
        .select(`
            *,
            courses(id, title, company_id),
            profiles!course_assignments_worker_id_fkey(id, full_name, email)
        `)
        .eq('courses.company_id', companyId);
    if (error) throw error;
    return data;
}

/** Get workers assigned to a specific course */
export async function getWorkersForCourse(courseId) {
    const { data, error } = await supabase
        .from('course_assignments')
        .select('*, profiles!course_assignments_worker_id_fkey(id, full_name, email, employee_id)')
        .eq('course_id', courseId);
    if (error) throw error;
    return data;
}

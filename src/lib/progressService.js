import { supabase } from './supabase';

/** Get all module progress for a worker */
export async function getWorkerProgress(userId) {
    const { data, error } = await supabase
        .from('progress')
        .select('*, modules(id, title, course_id, sort_order)')
        .eq('user_id', userId);
    if (error) throw error;
    return data;
}

/** Get progress for a specific course (worker) */
export async function getCourseProgress(userId, courseId) {
    const { data, error } = await supabase
        .from('progress')
        .select('*, modules!inner(id, title, sort_order, course_id)')
        .eq('user_id', userId)
        .eq('modules.course_id', courseId)
        .order('modules(sort_order)');
    if (error) throw error;
    return data;
}

/** Mark a module as completed */
export async function markModuleComplete(userId, moduleId, score = null) {
    const { data, error } = await supabase
        .from('progress')
        .upsert({
            user_id: userId,
            module_id: moduleId,
            status: 'completed',
            last_score: score,
            completed_at: new Date().toISOString(),
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Unlock the next module */
export async function unlockModule(userId, moduleId) {
    const { data, error } = await supabase
        .from('progress')
        .upsert({ user_id: userId, module_id: moduleId, status: 'unlocked' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Calculate overall % for a course */
export function calcCourseProgress(progressRows, totalModules) {
    if (!totalModules || !progressRows?.length) return 0;
    const completed = progressRows.filter(p => p.status === 'completed').length;
    return Math.round((completed / totalModules) * 100);
}

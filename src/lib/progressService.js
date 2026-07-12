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

export async function markModuleComplete(userId, moduleId, score = null) {
    const { data: existing, error: fetchError } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .maybeSingle();

    if (fetchError) throw fetchError;

    const updateData = {
        user_id: userId,
        module_id: moduleId,
        status: 'completed',
        completed_at: new Date().toISOString(),
    };

    if (existing) {
        updateData.id = existing.id;
        updateData.last_score = score !== null ? score : existing.last_score;
        updateData.attempts_count = score !== null ? (existing.attempts_count || 0) + 1 : (existing.attempts_count || 0);
    } else {
        updateData.last_score = score;
        updateData.attempts_count = score !== null ? 1 : 0;
    }

    const { data, error } = await supabase
        .from('progress')
        .upsert(updateData)
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

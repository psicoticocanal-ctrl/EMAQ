import { supabase } from './supabase';

/** Submit an exam attempt */
export async function submitExam(userId, courseId, score, timeUsedSeconds, answersData = null) {
    // Get current attempt number
    const { data: existing } = await supabase
        .from('exam_attempts')
        .select('attempt_number')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('attempt_number', { ascending: false })
        .limit(1);

    const attemptNumber = (existing && existing.length > 0) ? (existing[0].attempt_number + 1) : 1;
    const passed = score >= 70;

    const { data, error } = await supabase
        .from('exam_attempts')
        .insert({ 
            user_id: userId, 
            course_id: courseId, 
            score, 
            passed, 
            attempt_number: attemptNumber, 
            time_used_seconds: timeUsedSeconds,
            answers_data: answersData 
        })
        .select()
        .single();
    if (error) throw error;
    return { ...data, passed };
}

/** Get all attempts for a user/course */
export async function getAttempts(userId, courseId) {
    const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('completed_at', { ascending: false });
    if (error) throw error;
    return data;
}

/** Get best score for a user/course */
export async function getBestScore(userId, courseId) {
    const { data, error } = await supabase
        .from('exam_attempts')
        .select('score, passed')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('passed', true)
        .order('score', { ascending: false })
        .limit(1);
    if (error) throw error;
    return data?.[0] || null;
}

/** Get exam stats for admin (all attempts for company courses) */
export async function getCompanyExamStats(companyId) {
    const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, courses!inner(company_id, title), profiles(full_name)')
        .eq('courses.company_id', companyId)
        .order('completed_at', { ascending: false });
    if (error) throw error;
    return data;
}

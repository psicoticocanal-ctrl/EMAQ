import { supabase } from './supabase';

/** Get notifications for the current user */
export async function getNotifications(userId) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

/** Mark a notification as read */
export async function markAsRead(notificationId) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    if (error) throw error;
}

/** Send notification from company to worker */
export async function notifyWorker(workerId, companyId, title, message, type = 'info') {
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: workerId,
            company_id: companyId,
            title,
            message,
            type
        });
    if (error) throw error;
}

/** Notify company about worker entry to course */
export async function notifyCompanyOnEntry(workerId, courseId) {
    try {
        // Find which company owns this course
        const { data: course } = await supabase
            .from('courses')
            .select('company_id, title')
            .eq('id', courseId)
            .single();

        if (!course) return;

        // Find worker name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, employee_id, email')
            .eq('id', workerId)
            .single();

        if (!profile) return;

        // Find an admin/manager for that company to receive the notification
        // For now, we'll send it to all profiles linked to that company with role 'admin'
        const { data: companyAdmins } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', course.company_id)
            .eq('role', 'admin');

        if (companyAdmins && companyAdmins.length > 0) {
            const notifications = companyAdmins.map(admin => ({
                user_id: admin.id,
                company_id: course.company_id,
                sender_id: workerId,
                title: 'Ingreso a Capacitación',
                message: `El trabajador ${profile.full_name} (${profile.employee_id}) ha ingresado al curso: ${course.title}`,
                type: 'course_entry'
            }));

            await supabase.from('notifications').insert(notifications);
        }
    } catch (e) {
        console.error('Error sending entry notification:', e);
    }
}

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

/** Notify company admin when a worker completes the final exam */
export async function notifyCompanyOnExamFinish(workerId, courseId, score, passed) {
    try {
        const { data: course } = await supabase
            .from('courses')
            .select('company_id, title')
            .eq('id', courseId)
            .single();

        if (!course) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, employee_id')
            .eq('id', workerId)
            .single();

        if (!profile) return;

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
                title: passed ? 'Examen Aprobado' : 'Examen Finalizado',
                message: `El trabajador ${profile.full_name} (${profile.employee_id || 'Sin documento'}) ha completado el examen de ${course.title} con un puntaje de ${score}%. Estado: ${passed ? 'APROBADO' : 'NO APROBADO'}.`,
                type: 'exam_completion'
            }));

            await supabase.from('notifications').insert(notifications);
        }
    } catch (e) {
        console.error('Error sending exam completion notification:', e);
    }
}

/** Notify company admin when a worker requests their certificate manually due to download limit */
export async function notifyCompanyOnCertificateRequest(workerId, courseId) {
    try {
        const { data: course } = await supabase
            .from('courses')
            .select('company_id, title')
            .eq('id', courseId)
            .single();

        if (!course) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, employee_id')
            .eq('id', workerId)
            .single();

        if (!profile) return;

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
                title: 'Solicitud de Certificado',
                message: `El trabajador ${profile.full_name} (${profile.employee_id || 'Sin documento'}) ha solicitado la emisión de su certificado del curso: ${course.title} tras agotar el límite de descargas.`,
                type: 'certificate_request'
            }));

            await supabase.from('notifications').insert(notifications);
        }
    } catch (e) {
        console.error('Error sending certificate request notification:', e);
    }
}

/** Notify company admin when a worker requests more attempts for a module quiz */
export async function notifyCompanyOnQuizAttemptRequest(workerId, courseId, moduleId) {
    try {
        const { data: course } = await supabase
            .from('courses')
            .select('company_id, title')
            .eq('id', courseId)
            .single();

        if (!course) return;

        const { data: moduleData } = await supabase
            .from('modules')
            .select('title')
            .eq('id', moduleId)
            .single();

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, employee_id')
            .eq('id', workerId)
            .single();

        if (!profile) return;

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
                title: 'Solicitud de Intentos (Quiz)',
                message: `El trabajador ${profile.full_name} (${profile.employee_id || 'Sin documento'}) ha agotado sus intentos del quiz del módulo "${moduleData?.title || 'Módulo'}" (Curso: ${course.title}) y solicita intentos adicionales para habilitar su certificación.`,
                type: 'quiz_attempt_request'
            }));

            await supabase.from('notifications').insert(notifications);
        }
    } catch (e) {
        console.error('Error sending quiz attempt request notification:', e);
    }
}

/** Notify company admin when a worker requests more attempts for the final exam */
export async function notifyCompanyOnExamAttemptRequest(workerId, courseId) {
    try {
        const { data: course } = await supabase
            .from('courses')
            .select('company_id, title')
            .eq('id', courseId)
            .single();

        if (!course) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, employee_id')
            .eq('id', workerId)
            .single();

        if (!profile) return;

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
                title: 'Solicitud de Intentos (Examen)',
                message: `El trabajador ${profile.full_name} (${profile.employee_id || 'Sin documento'}) ha agotado sus intentos del examen de certificación del curso "${course.title}" y solicita intentos adicionales.`,
                type: 'exam_attempt_request'
            }));

            await supabase.from('notifications').insert(notifications);
        }
    } catch (e) {
        console.error('Error sending exam attempt request notification:', e);
    }
}


import { supabaseAdmin } from '../_lib/supabase.js';

export default async (req, res) => {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { email, password, fullName, role, companyCode, companyName, employeeId } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        // 1. Crear el usuario en auth.users usando el Service Role (omite límites de tasa)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirmar para evitar fricción en EMAQ
            user_metadata: {
                full_name: fullName,
                role: role
            }
        });

        if (authError) throw authError;

        const userId = authUser.user.id;

        // 2. Lógica de Empresa (Vincular usuario a empresa por código)
        let companyId = null;
        if (companyCode) {
            // Buscar si la empresa existe
            let { data: existingCompany } = await supabaseAdmin
                .from('companies')
                .select('id')
                .eq('company_code', companyCode)
                .maybeSingle();

            if (existingCompany) {
                companyId = existingCompany.id;
            } else if (role === 'admin' && companyName) {
                // Si es admin y la empresa no existe, la creamos (o upsert por seguridad)
                const { data: newCompany, error: compError } = await supabaseAdmin
                    .from('companies')
                    .upsert({
                        company_code: companyCode,
                        name: companyName
                    }, { onConflict: 'company_code' })
                    .select()
                    .single();

                if (compError) throw compError;
                companyId = newCompany.id;
            }
        }

        // 3. Crear el Perfil en la tabla pública
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email,
                full_name: fullName,
                role,
                company_id: companyId,
                employee_id: employeeId || null,
                company_code: companyCode || null,
                status: 'active'
            }, { onConflict: 'id' });

        if (profileError) throw profileError;

        return res.status(200).json({
            message: 'Usuario registrado exitosamente',
            userId: userId
        });

    } catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({ error: error.message });
    }
};

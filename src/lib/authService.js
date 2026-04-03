/**
 * Servicio para manejar la autenticación a través de la API de Backend (Vercel Functions)
 */

export const registerUser = async (userData, fallbackSignUp) => {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        // Si el backend responde (Vercel)
        if (response.ok) {
            const data = await response.json();
            return { data, error: null };
        }

        // Si el backend no existe (404 en local dev sin Vercel CLI)
        // o da otro error, intentamos el fallback tradicional si existe
        if (response.status === 404 && fallbackSignUp) {
            console.warn('API de Backend no detectada (404). Usando fallback de Supabase directo...');
            const { data, error } = await fallbackSignUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.fullName,
                        role: userData.role,
                        company_code: userData.companyCode,
                        company_name: userData.companyName,
                        employee_id: userData.employeeId
                    }
                }
            });
            return { data, error };
        }

        const data = await response.json();
        throw new Error(data.error || 'Error al registrar el usuario');
    } catch (error) {
        // Error de red (backend no disponible) - otro intento de fallback
        if (fallbackSignUp) {
            console.warn('Error de conexión con la API. Intentando registro directo...');
            return await fallbackSignUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.fullName,
                        role: userData.role,
                        company_code: userData.companyCode,
                        company_name: userData.companyName,
                        employee_id: userData.employeeId
                    }
                }
            });
        }
        return { data: null, error };
    }
};

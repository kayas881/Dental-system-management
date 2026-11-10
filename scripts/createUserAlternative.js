// Alternative createUser function without admin client
const createUserAlternative = async (userData) => {
    try {
        // Use regular signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        if (authError) {
            throw authError;
        }

        // Create user profile
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .insert([
                {
                    user_id: authData.user.id,
                    email: userData.email,
                    role: userData.role || 'USER',
                    created_by: getUserId()
                }
            ])
            .select();

        if (profileError) {
            throw profileError;
        }

        return { data: { user: authData.user, profile: profileData[0] } };
    } catch (error) {
        console.error('Create user error:', error);
        return { error };
    }
};

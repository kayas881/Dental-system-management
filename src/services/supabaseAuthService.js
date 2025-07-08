import { supabase, supabaseAdmin } from '../supabase/supabaseClient';

const setToken = (token) => {
    localStorage.setItem('token', token);
};

const getToken = () => {
    return localStorage.getItem('token');
};

const getUserEmail = () => {
    return localStorage.getItem('user_email');
};

const getUserRole = () => {
    return localStorage.getItem('user_role');
};

const getUserId = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || localStorage.getItem('user_id');
    } catch (error) {
        console.error('Error getting user ID:', error);
        return localStorage.getItem('user_id');
    }
};

const login = async (userData) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password,
        });

        if (error) {
            throw error;
        }

        // Clear any existing localStorage first
        localStorage.clear();

        // Get user profile with role using email as backup
        let profile = null;
        
        console.log('Looking for profile for user:', data.user.email, 'with ID:', data.user.id);
        
        // First try to get by user_id
        const { data: profileByUserId, error: profileError1 } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();

        console.log('Profile by user_id:', profileByUserId, 'Error:', profileError1);

        if (profileByUserId) {
            profile = profileByUserId;
        } else {
            // If not found by user_id, try by email
            const { data: profileByEmail, error: profileError2 } = await supabase
                .from('user_profiles')
                .select('role, user_id')
                .eq('email', data.user.email)
                .single();
                 console.log('Profile by email:', profileByEmail, 'Error:', profileError2);
        
        if (profileByEmail) {
            profile = profileByEmail;
            // Update the user_id in the profile if it's different
            if (profileByEmail.user_id !== data.user.id) {
                console.log('Updating user_id in profile from', profileByEmail.user_id, 'to', data.user.id);
                await supabase
                    .from('user_profiles')
                    .update({ user_id: data.user.id })
                    .eq('email', data.user.email);
            }
        } else {
            console.error('No profile found for user:', data.user.email);
            // Try to create a basic profile if none exists
            console.log('Attempting to create profile for:', data.user.email);
            const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert([{
                    user_id: data.user.id,
                    email: data.user.email,
                    role: 'USER' // Default role, change manually in DB for admin
                }])
                .select()
                .single();
            
            if (!createError && newProfile) {
                console.log('Created new profile:', newProfile);
                profile = newProfile;
            } else {
                console.error('Failed to create profile:', createError);
            }
        }
        }

        console.log('User profile found:', profile);
        console.log('Profile role:', profile?.role);
        console.log('User email:', data.user.email);
        console.log('User ID:', data.user.id);

        // Store the access token and user info
        if (data.session) {
            setToken(data.session.access_token);
            localStorage.setItem('user_email', data.user.email);
            localStorage.setItem('user_role', profile?.role || 'USER');
            localStorage.setItem('user_id', data.user.id);
            
            console.log('Stored role in localStorage:', profile?.role || 'USER');
            console.log('localStorage after setting:', {
                email: localStorage.getItem('user_email'),
                role: localStorage.getItem('user_role'),
                id: localStorage.getItem('user_id')
            });
        }

        return {
            data: {
                accessToken: data.session?.access_token,
                user: data.user,
                role: profile?.role || 'USER'
            }
        };
    } catch (error) {
        console.error('Login error:', error);
        return { error };
    }
};

const signUp = async (userData) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        if (error) {
            throw error;
        }

        return { data };
    } catch (error) {
        console.error('Signup error:', error);
        return { error };
    }
};

const createUser = async (userData) => {
    try {
        // Create user in Supabase Auth using admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true
        });

        if (authError) {
            throw authError;
        }

        // Get the current user ID for created_by field
        const currentUserId = await getUserId();

        // Create user profile using regular client
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .insert([
                {
                    user_id: authData.user.id,
                    email: userData.email,
                    role: userData.role || 'USER',
                    created_by: currentUserId
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

const getAllUsers = async () => {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select(`
                id,
                user_id,
                email,
                role,
                created_at,
                created_by
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return { data };
    } catch (error) {
        console.error('Get all users error:', error);
        return { error };
    }
};

const deleteUser = async (userId) => {
    try {
        // Get current user ID to prevent self-deletion
        const currentUserId = await getUserId();
        
        // Prevent self-deletion
        if (userId === currentUserId) {
            throw new Error('You cannot delete your own account');
        }

        // First check if the user is an admin
        const { data: userProfile, error: profileCheckError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', userId)
            .single();

        if (profileCheckError) {
            throw new Error('User not found');
        }

        // Prevent deletion of admin users
        if (userProfile.role === 'ADMIN') {
            // Additional check: ensure we're not deleting the last admin
            const { data: adminUsers } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('role', 'ADMIN');
            
            if (adminUsers && adminUsers.length <= 1) {
                throw new Error('Cannot delete the last admin user in the system');
            }
            
            throw new Error('Admin users cannot be deleted');
        }

        // First delete from auth.users using admin client
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            throw authError;
        }

        // Then delete from user_profiles (this should cascade automatically but we'll do it explicitly)
        const { error: profileError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', userId);

        if (profileError) {
            console.warn('Profile deletion failed, but auth user was deleted:', profileError);
            // Don't throw here since the main deletion (auth) succeeded
        }

        return { success: true };
    } catch (error) {
        console.error('Delete user error:', error);
        return { error };
    }
};

const isLoggedIn = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (error) {
        console.error('Error checking session:', error);
        return false;
    }
};

const refreshUserRole = async () => {
    try {
        const userEmail = getUserEmail();
        const userId = await getUserId();
        
        if (!userEmail || !userId) {
            console.error('No user email or ID found');
            return null;
        }

        // Get fresh role from database
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('email', userEmail)
            .single();

        if (error) {
            console.error('Error refreshing user role:', error);
            return null;
        }

        // Update localStorage with fresh role
        if (profile) {
            localStorage.setItem('user_role', profile.role);
            console.log('Refreshed role to:', profile.role);
            return profile.role;
        }

        return null;
    } catch (error) {
        console.error('Error refreshing user role:', error);
        return null;
    }
};

const logOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
        }
        localStorage.clear();
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.clear();
    }
};

// Debug function to check user profile
const debugUserProfile = async (email) => {
    try {
        console.log('=== DEBUG: Checking user profile ===');
        
        // Check auth session first
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session:', session);
        console.log('Current auth user:', session?.user);
        
        if (!session) {
            console.error('No active session found');
            return null;
        }
        
        // Check user_profiles table with authenticated user
        const { data: profiles, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email);
            
        console.log('User profiles for email:', email, profiles);
        if (error) console.error('Profile query error:', error);
        
        // Check all profiles
        const { data: allProfiles } = await supabase
            .from('user_profiles')
            .select('*');
        console.log('All profiles in database:', allProfiles);
        
        // Also try by user_id
        const { data: profileById } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id);
        console.log('Profile by current user ID:', profileById);
        
        return profiles;
    } catch (error) {
        console.error('Debug error:', error);
        return null;
    }
};

const fixUserSession = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
            // Update localStorage with correct UUID
            localStorage.setItem('user_id', user.id);
            localStorage.setItem('user_email', user.email);
            console.log('Fixed user session with proper UUID:', user.id);
            return user.id;
        }
        return null;
    } catch (error) {
        console.error('Error fixing user session:', error);
        return null;
    }
};

const restoreAdminRole = async (email) => {
    try {
        console.log('Attempting to restore admin role for:', email);
        
        // Update the user's role back to ADMIN
        const { data, error } = await supabase
            .from('user_profiles')
            .update({ role: 'ADMIN' })
            .eq('email', email)
            .select();

        if (error) {
            throw error;
        }

        console.log('Admin role restored for:', email, data);
        return { success: true, data };
    } catch (error) {
        console.error('Error restoring admin role:', error);
        return { error };
    }
};

const ensureAdminProtection = async () => {
    try {
        // Check if there are any admin users in the system
        const { data: adminUsers, error } = await supabase
            .from('user_profiles')
            .select('email, role')
            .eq('role', 'ADMIN');

        if (error) {
            console.error('Error checking admin users:', error);
            return { error };
        }

        const adminCount = adminUsers?.length || 0;
        console.log(`Found ${adminCount} admin users in the system`);

        if (adminCount === 0) {
            console.warn('⚠️  WARNING: No admin users found in the system!');
            return { warning: 'No admin users found in system' };
        }

        return { success: true, adminCount, adminUsers };
    } catch (error) {
        console.error('Error ensuring admin protection:', error);
        return { error };
    }
};

export const authService = {
    logOut,
    getToken,
    setToken,
    login,
    signUp,
    getUserEmail,
    getUserRole,
    getUserId,
    fixUserSession,
    isLoggedIn,
    createUser,
    getAllUsers,
    deleteUser,
    refreshUserRole,
    debugUserProfile,
    restoreAdminRole,
    ensureAdminProtection
};

// Quick script to restore admin role for kayas@mail.com
import { authService } from './src/services/supabaseAuthService.js';

async function restoreKayasAdmin() {
    console.log('Restoring admin role for kayas@mail.com...');
    const result = await authService.restoreAdminRole('kayas@mail.com');
    
    if (result.success) {
        console.log('✅ Successfully restored admin role for kayas@mail.com');
    } else {
        console.error('❌ Failed to restore admin role:', result.error);
    }
}

restoreKayasAdmin();

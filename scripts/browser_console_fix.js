/* 
COMPREHENSIVE BROWSER CONSOLE FIX FOR ADMIN ACCESS
Copy and paste this into your browser console (F12 → Console tab) while logged into the app
*/

// Step 1: Check current localStorage
console.log('=== CURRENT SESSION STATUS ===');
console.log('User Email:', localStorage.getItem('user_email'));
console.log('User Role:', localStorage.getItem('user_role'));
console.log('User ID:', localStorage.getItem('user_id'));
console.log('Is Super Admin:', localStorage.getItem('is_super_admin'));
console.log('Token exists:', !!localStorage.getItem('token'));

// Step 2: Check what roles are causing issues
const currentRole = localStorage.getItem('user_role');
console.log('\n=== ROLE ANALYSIS ===');
console.log('Current role in localStorage:', currentRole);
console.log('Is ADMIN?', currentRole === 'ADMIN');
console.log('Is SUPER_ADMIN?', currentRole === 'SUPER_ADMIN');
console.log('Is USER/STAFF?', currentRole === 'USER');

// Step 3: Fix localStorage based on admin status
console.log('\n=== FIXING SESSION ===');

// Check if user should be super admin (modify email as needed)
const userEmail = localStorage.getItem('user_email');
const isSuperAdminUser = userEmail === 'kayas@mail.com'; // Modify this email

if (isSuperAdminUser) {
    // Set as Super Admin
    localStorage.setItem('user_role', 'SUPER_ADMIN');
    localStorage.setItem('is_super_admin', 'true');
    console.log('✅ Set as SUPER_ADMIN');
} else {
    // Set as regular Admin (if they're supposed to be admin)
    localStorage.setItem('user_role', 'ADMIN');
    localStorage.setItem('is_super_admin', 'false');
    console.log('✅ Set as ADMIN');
}

console.log('\n=== FIXED STORAGE ===');
console.log('User Role:', localStorage.getItem('user_role'));
console.log('Is Super Admin:', localStorage.getItem('is_super_admin'));

// Step 4: Force page refresh to apply changes
console.log('\n=== REFRESHING PAGE ===');
console.log('Refreshing page in 2 seconds...');
setTimeout(() => {
    window.location.reload();
}, 2000);

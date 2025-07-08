-- Restore admin role for kayas@mail.com
UPDATE user_profiles 
SET role = 'ADMIN' 
WHERE email = 'kayas@mail.com';

-- Verify the update
SELECT email, role, user_id, created_at 
FROM user_profiles 
WHERE email = 'kayas@mail.com';

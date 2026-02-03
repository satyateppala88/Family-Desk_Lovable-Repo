-- Delete user satyateppala@zohomail.in and all related data
-- User ID: 9e4a5289-346c-4d5d-9d81-92850160a9ef

-- 0. Clear reviewed_by references in access_requests
UPDATE public.access_requests 
SET reviewed_by = NULL 
WHERE reviewed_by = '9e4a5289-346c-4d5d-9d81-92850160a9ef';

-- 1. Delete phone verification tokens
DELETE FROM public.phone_verification_tokens 
WHERE user_id = '9e4a5289-346c-4d5d-9d81-92850160a9ef';

-- 2. Delete user email preferences
DELETE FROM public.user_email_preferences 
WHERE user_id = '9e4a5289-346c-4d5d-9d81-92850160a9ef';

-- 3. Delete user onboarding progress (if any)
DELETE FROM public.user_onboarding_progress 
WHERE user_id = '9e4a5289-346c-4d5d-9d81-92850160a9ef';

-- 4. Delete profile
DELETE FROM public.profiles 
WHERE id = '9e4a5289-346c-4d5d-9d81-92850160a9ef';

-- 5. Delete from auth.users
DELETE FROM auth.users 
WHERE id = '9e4a5289-346c-4d5d-9d81-92850160a9ef';
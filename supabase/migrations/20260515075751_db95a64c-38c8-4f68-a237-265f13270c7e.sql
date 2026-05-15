-- Test environment cleanup for satyateppala@zohomail.in (a4cdc5e5-4e93-4e78-862a-401b6d0f816e)
-- Removes only the orphan single-member household 094d8b3c (Satya's Home),
-- which has onboarding_completed = false and is causing useHousehold (order by joined_at desc)
-- to keep returning an unfinished household after every "create" attempt.

DELETE FROM public.user_roles
WHERE household_id = '094d8b3c-13b9-4573-90ef-c34eb6369bbc';

DELETE FROM public.household_members
WHERE household_id = '094d8b3c-13b9-4573-90ef-c34eb6369bbc';

DELETE FROM public.households
WHERE id = '094d8b3c-13b9-4573-90ef-c34eb6369bbc';
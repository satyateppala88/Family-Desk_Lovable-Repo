DELETE FROM public.household_members
 WHERE user_id = 'a59514a3-bc5e-4501-bbb4-b755821b1f2a'
   AND household_id = 'f75725b0-6886-4add-b2f4-656b106fddfa';

DELETE FROM public.households
 WHERE id = 'f75725b0-6886-4add-b2f4-656b106fddfa'
   AND NOT EXISTS (
     SELECT 1 FROM public.household_members
      WHERE household_id = 'f75725b0-6886-4add-b2f4-656b106fddfa'
   );
-- Promote the existing account to the application's highest role.
-- Resolve identity from auth.users, never from the editable profile email.
BEGIN;

DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO STRICT target_id
  FROM auth.users
  WHERE lower(email) = 'admin@email.com';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- The status guard normally requires an authenticated admin session.
  -- Disable only this trigger within the transaction for the targeted update.
  ALTER TABLE public.profiles DISABLE TRIGGER guard_profile_status;

  INSERT INTO public.profiles (id, email, status)
  VALUES (target_id, 'admin@email.com', 'approved')
  ON CONFLICT (id) DO UPDATE SET status = 'approved';

  ALTER TABLE public.profiles ENABLE TRIGGER guard_profile_status;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'Account admin@email.com does not exist. Create the account before applying this migration.';
  WHEN TOO_MANY_ROWS THEN
    RAISE EXCEPTION 'Multiple accounts match admin@email.com; resolve the account identity before promotion.';
END;
$$;

COMMIT;

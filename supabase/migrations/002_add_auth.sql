-- ─── 1. Profiles table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'receptionist'
             CHECK (role IN ('admin', 'doctor', 'receptionist')),
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─── 2. Extend appointments ───────────────────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── 3. Trigger: auto-create profile on signup ───────────────────────────────
-- SECURITY DEFINER runs as postgres (superuser) → bypasses RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'receptionist')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 4. Helper: get current user's role ──────────────────────────────────────
-- SECURITY DEFINER avoids RLS recursion when used in other policies
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND active = true;
$$;

-- ─── 5. Appointments: replace wide-open policies ─────────────────────────────
DROP POLICY IF EXISTS "Public read"   ON appointments;
DROP POLICY IF EXISTS "Public insert" ON appointments;
DROP POLICY IF EXISTS "Public update" ON appointments;

-- Patient confirmation page requires unauthenticated SELECT (UUID = access token)
CREATE POLICY "appointments_select"
  ON appointments FOR SELECT
  USING (true);

-- Patient confirmation page requires unauthenticated UPDATE (confirm / cancel)
CREATE POLICY "appointments_update"
  ON appointments FOR UPDATE
  USING (true) WITH CHECK (true);

-- Only authenticated staff can create appointments
CREATE POLICY "appointments_insert"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete appointments
CREATE POLICY "appointments_delete"
  ON appointments FOR DELETE
  USING (get_user_role() = 'admin');

-- ─── 6. Profiles policies ────────────────────────────────────────────────────
-- Any authenticated user can read profiles (needed for doctor dropdown in forms)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin can update any profile; user can update their own
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR get_user_role() = 'admin');

-- Client-side inserts are blocked; trigger + edge function use the service role
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  WITH CHECK (false);

-- Only admins can delete profiles
CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE
  USING (get_user_role() = 'admin');

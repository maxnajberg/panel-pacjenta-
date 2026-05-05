-- Patient master record table (one patient, many appointments)
CREATE TABLE patients (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name         text NOT NULL,
  last_name          text NOT NULL,
  pesel              text UNIQUE,
  date_of_birth      date,
  address            text,
  phone              text,
  email              text,
  allergies          text,
  medications        text,
  chronic_conditions text,
  last_dental_visit  text,
  rodo_consent       boolean NOT NULL DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE appointments ADD COLUMN patient_id uuid REFERENCES patients(id) ON DELETE SET NULL;

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY patients_select ON patients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY patients_update ON patients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY patients_delete ON patients
  FOR DELETE USING (get_user_role() = 'admin');

-- SECURITY DEFINER so the anon role can deduplicate by PESEL without
-- exposing the patients table to unauthenticated SELECT queries.
CREATE OR REPLACE FUNCTION submit_intake_form(
  p_appointment_id    uuid,
  p_first_name        text,
  p_last_name         text,
  p_pesel             text     DEFAULT NULL,
  p_date_of_birth     date     DEFAULT NULL,
  p_address           text     DEFAULT NULL,
  p_phone             text     DEFAULT NULL,
  p_email             text     DEFAULT NULL,
  p_allergies         text     DEFAULT NULL,
  p_medications       text     DEFAULT NULL,
  p_chronic_conditions text    DEFAULT NULL,
  p_last_dental_visit  text    DEFAULT NULL,
  p_rodo_consent      boolean  DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM appointments WHERE id = p_appointment_id) THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  -- Reuse patient already linked to this appointment
  SELECT patient_id INTO v_patient_id
  FROM appointments WHERE id = p_appointment_id;

  -- Cross-appointment dedup: find existing patient by PESEL
  IF v_patient_id IS NULL AND p_pesel IS NOT NULL AND p_pesel != '' THEN
    SELECT id INTO v_patient_id FROM patients WHERE pesel = p_pesel;
  END IF;

  IF v_patient_id IS NULL THEN
    INSERT INTO patients (
      first_name, last_name, pesel,
      date_of_birth, address, phone, email,
      allergies, medications, chronic_conditions, last_dental_visit,
      rodo_consent
    ) VALUES (
      p_first_name, p_last_name, NULLIF(p_pesel, ''),
      p_date_of_birth,
      NULLIF(p_address, ''), NULLIF(p_phone, ''), NULLIF(p_email, ''),
      NULLIF(p_allergies, ''), NULLIF(p_medications, ''),
      NULLIF(p_chronic_conditions, ''), NULLIF(p_last_dental_visit, ''),
      p_rodo_consent
    )
    RETURNING id INTO v_patient_id;
  ELSE
    UPDATE patients SET
      first_name         = p_first_name,
      last_name          = p_last_name,
      date_of_birth      = COALESCE(p_date_of_birth,                  date_of_birth),
      address            = COALESCE(NULLIF(p_address, ''),             address),
      phone              = COALESCE(NULLIF(p_phone, ''),               phone),
      email              = COALESCE(NULLIF(p_email, ''),               email),
      allergies          = COALESCE(NULLIF(p_allergies, ''),           allergies),
      medications        = COALESCE(NULLIF(p_medications, ''),         medications),
      chronic_conditions = COALESCE(NULLIF(p_chronic_conditions, ''),  chronic_conditions),
      last_dental_visit  = COALESCE(NULLIF(p_last_dental_visit, ''),   last_dental_visit),
      rodo_consent       = p_rodo_consent,
      updated_at         = now()
    WHERE id = v_patient_id;
  END IF;

  UPDATE appointments SET patient_id = v_patient_id WHERE id = p_appointment_id;

  RETURN v_patient_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_intake_form TO anon;
GRANT EXECUTE ON FUNCTION submit_intake_form TO authenticated;

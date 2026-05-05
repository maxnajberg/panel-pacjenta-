-- New checkbox-based columns on patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS allergies_list          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergies_other         text,
  ADD COLUMN IF NOT EXISTS chronic_conditions_list text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chronic_conditions_other text,
  ADD COLUMN IF NOT EXISTS last_dental_visit_choice text;

-- Infectious diseases in a separate table so RLS can restrict reads to doctor/admin
CREATE TABLE IF NOT EXISTS patient_infectious_diseases (
  patient_id     uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  diseases       text[] NOT NULL DEFAULT '{}',
  diseases_other text,
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE patient_infectious_diseases ENABLE ROW LEVEL SECURITY;

CREATE POLICY infectious_select ON patient_infectious_diseases
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('doctor', 'admin'));

-- Drop old function signature before replacing with new one
DROP FUNCTION IF EXISTS submit_intake_form(
  uuid, text, text, text, date, text, text, text, text, text, text, text, boolean
);

CREATE OR REPLACE FUNCTION submit_intake_form(
  p_appointment_id           uuid,
  p_first_name               text,
  p_last_name                text,
  p_pesel                    text    DEFAULT NULL,
  p_date_of_birth            date    DEFAULT NULL,
  p_address                  text    DEFAULT NULL,
  p_phone                    text    DEFAULT NULL,
  p_email                    text    DEFAULT NULL,
  p_allergies_list           text[]  DEFAULT '{}',
  p_allergies_other          text    DEFAULT NULL,
  p_medications              text    DEFAULT NULL,
  p_chronic_conditions_list  text[]  DEFAULT '{}',
  p_chronic_conditions_other text    DEFAULT NULL,
  p_infectious_diseases      text[]  DEFAULT '{}',
  p_infectious_diseases_other text   DEFAULT NULL,
  p_last_dental_visit_choice text    DEFAULT NULL,
  p_rodo_consent             boolean DEFAULT false
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

  SELECT patient_id INTO v_patient_id
  FROM appointments WHERE id = p_appointment_id;

  IF v_patient_id IS NULL AND p_pesel IS NOT NULL AND p_pesel != '' THEN
    SELECT id INTO v_patient_id FROM patients WHERE pesel = p_pesel;
  END IF;

  IF v_patient_id IS NULL THEN
    INSERT INTO patients (
      first_name, last_name, pesel,
      date_of_birth, address, phone, email,
      allergies_list, allergies_other,
      medications,
      chronic_conditions_list, chronic_conditions_other,
      last_dental_visit_choice,
      rodo_consent
    ) VALUES (
      p_first_name, p_last_name, NULLIF(p_pesel, ''),
      p_date_of_birth,
      NULLIF(p_address, ''), NULLIF(p_phone, ''), NULLIF(p_email, ''),
      p_allergies_list, NULLIF(p_allergies_other, ''),
      NULLIF(p_medications, ''),
      p_chronic_conditions_list, NULLIF(p_chronic_conditions_other, ''),
      NULLIF(p_last_dental_visit_choice, ''),
      p_rodo_consent
    )
    RETURNING id INTO v_patient_id;
  ELSE
    UPDATE patients SET
      first_name                 = p_first_name,
      last_name                  = p_last_name,
      date_of_birth              = COALESCE(p_date_of_birth,                       date_of_birth),
      address                    = COALESCE(NULLIF(p_address, ''),                  address),
      phone                      = COALESCE(NULLIF(p_phone, ''),                    phone),
      email                      = COALESCE(NULLIF(p_email, ''),                    email),
      allergies_list             = CASE WHEN cardinality(p_allergies_list) > 0
                                     THEN p_allergies_list ELSE allergies_list END,
      allergies_other            = COALESCE(NULLIF(p_allergies_other, ''),           allergies_other),
      medications                = COALESCE(NULLIF(p_medications, ''),               medications),
      chronic_conditions_list    = CASE WHEN cardinality(p_chronic_conditions_list) > 0
                                     THEN p_chronic_conditions_list ELSE chronic_conditions_list END,
      chronic_conditions_other   = COALESCE(NULLIF(p_chronic_conditions_other, ''), chronic_conditions_other),
      last_dental_visit_choice   = COALESCE(NULLIF(p_last_dental_visit_choice, ''), last_dental_visit_choice),
      rodo_consent               = p_rodo_consent,
      updated_at                 = now()
    WHERE id = v_patient_id;
  END IF;

  INSERT INTO patient_infectious_diseases (patient_id, diseases, diseases_other, updated_at)
  VALUES (v_patient_id, p_infectious_diseases, NULLIF(p_infectious_diseases_other, ''), now())
  ON CONFLICT (patient_id) DO UPDATE SET
    diseases       = CASE WHEN cardinality(EXCLUDED.diseases) > 0
                       THEN EXCLUDED.diseases ELSE patient_infectious_diseases.diseases END,
    diseases_other = COALESCE(EXCLUDED.diseases_other, patient_infectious_diseases.diseases_other),
    updated_at     = now();

  UPDATE appointments SET patient_id = v_patient_id WHERE id = p_appointment_id;

  RETURN v_patient_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_intake_form TO anon;
GRANT EXECUTE ON FUNCTION submit_intake_form TO authenticated;

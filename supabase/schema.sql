-- Dental clinic appointments table
CREATE TABLE appointments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name         text NOT NULL,
  phone                text NOT NULL,
  appointment_datetime timestamptz NOT NULL,
  visit_type           text NOT NULL,
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_response')),
  duration_minutes     integer NOT NULL DEFAULT 30,
  created_at           timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (needed for patient confirmation page)
CREATE POLICY "Public read" ON appointments
  FOR SELECT USING (true);

-- Allow anonymous inserts (reception dashboard)
CREATE POLICY "Public insert" ON appointments
  FOR INSERT WITH CHECK (true);

-- Allow anonymous updates (status changes from reception + patient confirm page)
CREATE POLICY "Public update" ON appointments
  FOR UPDATE USING (true);

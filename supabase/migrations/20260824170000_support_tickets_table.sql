-- Support tickets table untuk tracking status tiket
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text UNIQUE NOT NULL,
  subject text NOT NULL,
  category text NOT NULL,
  email text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  screenshot_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index untuk pencarian cepat by ticket_id
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_id ON support_tickets(ticket_id);

-- Index untuk pencarian by email
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(email);

-- RLS policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can insert (submit ticket)
CREATE POLICY "Anyone can submit support ticket"
ON support_tickets FOR INSERT
WITH CHECK (true);

-- Policy: user can read their own tickets by email
CREATE POLICY "Users can read their own tickets"
ON support_tickets FOR SELECT
USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Policy: service role can update (admin/CS)
CREATE POLICY "Service role can update tickets"
ON support_tickets FOR UPDATE
USING (auth.role() = 'service_role');

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_support_tickets_updated_at();

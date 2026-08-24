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

-- ponytail: add indexes when support_tickets > 1000 rows

-- RLS policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit support ticket"
ON support_tickets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can read their own tickets"
ON support_tickets FOR SELECT
USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Service role can update tickets"
ON support_tickets FOR UPDATE
USING (auth.role() = 'service_role');

-- ponytail: add updated_at trigger when write volume justifies

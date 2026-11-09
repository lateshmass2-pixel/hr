-- Announcements Schema
-- HR can create announcements that employees can view

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('HIGH', 'NORMAL', 'LOW')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- HR can do everything with announcements
CREATE POLICY "HR can manage announcements"
    ON announcements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'HR_ADMIN'
        )
    );

-- All authenticated users can read announcements
CREATE POLICY "All users can read announcements"
    ON announcements
    FOR SELECT
    TO authenticated
    USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- ==========================================
-- SilentLink: Optimized Signaling Schema
-- ==========================================

-- 1. Create the signaling table
-- Optimized for fast lookup and minimal storage
CREATE TABLE IF NOT EXISTS public.rooms_signaling (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    passphrase_hash TEXT NOT NULL,
    initiator_id TEXT DEFAULT 'initiator',
    receiver_id TEXT,
    offer TEXT, -- Base64 encoded SDP
    answer TEXT, -- Base64 encoded SDP
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Performance Indices
-- Ensures Room ID lookups are near-instant
CREATE INDEX IF NOT EXISTS idx_rooms_signaling_room_id ON public.rooms_signaling(room_id);
-- Index for cleanup optimization
CREATE INDEX IF NOT EXISTS idx_rooms_signaling_created_at ON public.rooms_signaling(created_at);

-- 3. Supabase Realtime Setup
-- Enable realtime broadcasting for signaling updates
ALTER PUBLICATION supabase_realtime ADD TABLE rooms_signaling;

-- 4. Automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rooms_signaling_updated_at
    BEFORE UPDATE ON rooms_signaling
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. (Optional) Auto-Cleanup Policy
-- To maintain "Zero Metadata", we recommend deleting rows after use.
-- This script ensures indices are hot and storage is minimal.

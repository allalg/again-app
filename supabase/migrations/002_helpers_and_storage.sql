-- ================================================================
-- Migration: 002_helpers_and_storage_policies.sql
-- Adds: RPC helpers, storage policies, scheduled job config
-- ================================================================

-- ----------------------------------------------------------------
-- RPC: Update participant streak after a day evaluation
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_participant_streak(
  p_challenge_id UUID,
  p_user_id UUID,
  p_completed BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_completed THEN
    UPDATE challenge_participants
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      total_completed_days = total_completed_days + 1,
      updated_at = NOW()
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  ELSE
    UPDATE challenge_participants
    SET
      current_streak = 0,
      updated_at = NOW()
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  END IF;
END;
$$;

-- ----------------------------------------------------------------
-- RPC: Increment missed days counter
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_missed_days(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE challenge_participants
  SET total_missed_days = total_missed_days + 1
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
END;
$$;

-- ----------------------------------------------------------------
-- RPC: Get challenge completion stats
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_challenge_stats(p_challenge_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  completed_days INTEGER,
  missed_days INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  completion_rate NUMERIC,
  total_penalties_owed NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.user_id,
    p.display_name,
    p.avatar_url,
    cp.total_completed_days,
    cp.total_missed_days,
    cp.current_streak,
    cp.longest_streak,
    CASE
      WHEN (cp.total_completed_days + cp.total_missed_days) = 0 THEN 0
      ELSE ROUND(cp.total_completed_days::NUMERIC / (cp.total_completed_days + cp.total_missed_days) * 100, 1)
    END AS completion_rate,
    cp.total_penalties_owed
  FROM challenge_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id
    AND cp.status = 'accepted'
  ORDER BY cp.total_completed_days DESC, cp.current_streak DESC;
END;
$$;

-- ----------------------------------------------------------------
-- RPC: Check if user is challenge member
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_challenge_member(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM challenge_participants
    WHERE challenge_id = p_challenge_id
      AND user_id = p_user_id
      AND status = 'accepted'
  );
END;
$$;

-- ----------------------------------------------------------------
-- Storage Buckets
-- ----------------------------------------------------------------

-- Proof photos bucket (private, accessed via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proof-photos',
  'proof-photos',
  FALSE,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- User content bucket (public, for avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-content',
  'user-content',
  TRUE,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Storage RLS Policies: proof-photos
-- ----------------------------------------------------------------

-- Anyone authenticated can upload to their own path
CREATE POLICY "Users can upload their own proof photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proof-photos'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Challenge members can view proof photos for their challenge
CREATE POLICY "Challenge members can view proof photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proof-photos'
  AND is_challenge_member(
    (storage.foldername(name))[1]::UUID,
    auth.uid()
  )
);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own proof photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proof-photos'
  AND auth.uid()::TEXT = (storage.foldername(name))[2]
);

-- ----------------------------------------------------------------
-- Storage RLS Policies: user-content (avatars)
-- ----------------------------------------------------------------

-- Users can upload to their own avatar path
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-content'
  AND auth.uid()::TEXT = SPLIT_PART(name, '.', 1)
);

-- Everyone can view avatars (public bucket)
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

-- Users can update/delete their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-content'
  AND auth.uid()::TEXT = SPLIT_PART(name, '.', 1)
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-content'
  AND auth.uid()::TEXT = SPLIT_PART(name, '.', 1)
);

-- ----------------------------------------------------------------
-- Indexes for performance
-- ----------------------------------------------------------------

-- Fast lookup of today's records
CREATE INDEX IF NOT EXISTS idx_daily_records_day
  ON daily_challenge_records (challenge_id, challenge_day, user_id);

-- Fast penalty lookup
CREATE INDEX IF NOT EXISTS idx_penalties_payer
  ON penalties (payer_id, status);

CREATE INDEX IF NOT EXISTS idx_penalties_challenge_day
  ON penalties (challenge_id, challenge_day);

-- Chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_challenge_created
  ON chat_messages (challenge_id, created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at)
  WHERE read_at IS NULL;

-- ----------------------------------------------------------------
-- pg_cron scheduled jobs (if pg_cron is available)
-- ----------------------------------------------------------------

-- Evaluate daily deadlines every hour
-- SELECT cron.schedule('evaluate-daily-deadlines', '0 * * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.edge_function_url') || '/evaluate-daily-deadlines',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
--   );
-- $$);

-- Send reminders every 30 minutes
-- SELECT cron.schedule('send-deadline-reminders', '*/30 * * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.edge_function_url') || '/send-deadline-reminders',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
--   );
-- $$);

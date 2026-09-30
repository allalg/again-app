-- =====================================================================
-- STREAKPACT Database Migration
-- Migration: 001_initial_schema.sql
-- Description: Complete schema for the STREAKPACT platform
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for username fuzzy search

-- =====================================================================
-- ENUMS
-- =====================================================================

CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE challenge_status AS ENUM ('draft', 'pending_acceptance', 'active', 'paused', 'completed', 'cancelled', 'archived');
CREATE TYPE participant_status AS ENUM ('invited', 'accepted', 'rejected', 'withdrawn', 'removed');
CREATE TYPE daily_status AS ENUM ('pending', 'submitted', 'completed', 'incomplete', 'missed', 'disputed', 'excused');
CREATE TYPE submission_review_verdict AS ENUM ('approved', 'rejected', 'flagged');
CREATE TYPE penalty_status AS ENUM ('pending', 'settled', 'waived', 'disputed');
CREATE TYPE notification_type AS ENUM (
  'challenge_invite', 'invite_accepted', 'invite_rejected',
  'challenge_started', 'challenge_completed', 'challenge_cancelled',
  'daily_reminder', 'deadline_approaching', 'deadline_missed',
  'submission_received', 'submission_disputed', 'submission_approved',
  'new_message', 'friend_request', 'friend_accepted',
  'penalty_created', 'penalty_settled', 'payment_received'
);
CREATE TYPE message_type AS ENUM ('text', 'image', 'system', 'emoji_reaction');
CREATE TYPE activity_category AS ENUM (
  'fitness', 'mindfulness', 'learning', 'health', 'creative',
  'social', 'productivity', 'nutrition', 'sleep', 'custom'
);
CREATE TYPE measurement_type AS ENUM ('duration_minutes', 'distance_km', 'distance_miles', 'count', 'pages', 'custom');

-- =====================================================================
-- PROFILES
-- =====================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_subscription JSONB,
  show_email_to_friends BOOLEAN NOT NULL DEFAULT FALSE,
  account_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 50)
);

CREATE INDEX idx_profiles_username ON profiles USING gin(username gin_trgm_ops);
CREATE INDEX idx_profiles_username_exact ON profiles(username);

-- =====================================================================
-- FRIENDSHIPS
-- =====================================================================

CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);

-- =====================================================================
-- CHALLENGES
-- =====================================================================

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  activity_name TEXT NOT NULL,
  activity_category activity_category NOT NULL DEFAULT 'custom',
  measurement_type measurement_type NOT NULL DEFAULT 'custom',
  custom_measurement_unit TEXT,
  daily_target_value NUMERIC(10, 2) NOT NULL,
  daily_target_unit TEXT NOT NULL,
  start_date DATE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 90,
  end_date DATE GENERATED ALWAYS AS (start_date + (duration_days - 1)) STORED,
  daily_deadline TIME NOT NULL DEFAULT '23:00:00',
  grace_period_minutes INTEGER NOT NULL DEFAULT 30,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  penalty_distribution TEXT NOT NULL DEFAULT 'equal', -- 'equal', 'proportional', 'winner'
  no_recipient_policy TEXT NOT NULL DEFAULT 'carry_forward', -- 'carry_forward', 'charity', 'void'
  max_participants INTEGER NOT NULL DEFAULT 10,
  invitation_link_token TEXT UNIQUE,
  invitation_link_expires_at TIMESTAMPTZ,
  proof_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  min_review_approvals INTEGER NOT NULL DEFAULT 1,
  dispute_window_hours INTEGER NOT NULL DEFAULT 24,
  pause_requires_all_consent BOOLEAN NOT NULL DEFAULT TRUE,
  allow_excused_absences BOOLEAN NOT NULL DEFAULT FALSE,
  max_excused_days INTEGER NOT NULL DEFAULT 3,
  status challenge_status NOT NULL DEFAULT 'draft',
  current_rule_version INTEGER NOT NULL DEFAULT 1,
  paused_at TIMESTAMPTZ,
  paused_reason TEXT,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_duration CHECK (duration_days BETWEEN 1 AND 365),
  CONSTRAINT valid_fine CHECK (fine_amount >= 0),
  CONSTRAINT valid_target CHECK (daily_target_value > 0),
  CONSTRAINT valid_grace CHECK (grace_period_minutes BETWEEN 0 AND 1440),
  CONSTRAINT valid_max_participants CHECK (max_participants BETWEEN 2 AND 100)
);

CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_start_date ON challenges(start_date);
CREATE INDEX idx_challenges_invitation_token ON challenges(invitation_link_token) WHERE invitation_link_token IS NOT NULL;

-- =====================================================================
-- CHALLENGE RULE VERSIONS (immutable rule history)
-- =====================================================================

CREATE TABLE challenge_rule_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  rule_snapshot JSONB NOT NULL, -- full snapshot of challenge rules at this version
  changed_by UUID NOT NULL REFERENCES profiles(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, version)
);

CREATE INDEX idx_rule_versions_challenge ON challenge_rule_versions(challenge_id, version DESC);

-- =====================================================================
-- CHALLENGE PARTICIPANTS
-- =====================================================================

CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status participant_status NOT NULL DEFAULT 'invited',
  rule_version_accepted INTEGER, -- which version they accepted
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  invited_by UUID REFERENCES profiles(id),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_completed_days INTEGER NOT NULL DEFAULT 0,
  total_missed_days INTEGER NOT NULL DEFAULT 0,
  total_penalties_owed NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_penalties_received NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX idx_participants_challenge ON challenge_participants(challenge_id, status);
CREATE INDEX idx_participants_user ON challenge_participants(user_id, status);

-- =====================================================================
-- CHALLENGE INVITATIONS
-- =====================================================================

CREATE TABLE challenge_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invitee_required CHECK (invitee_id IS NOT NULL OR invitee_email IS NOT NULL)
);

CREATE INDEX idx_invitations_challenge ON challenge_invitations(challenge_id);
CREATE INDEX idx_invitations_invitee ON challenge_invitations(invitee_id) WHERE invitee_id IS NOT NULL;
CREATE INDEX idx_invitations_token ON challenge_invitations(token);

-- =====================================================================
-- DAILY CHALLENGE RECORDS (one row per participant per day)
-- =====================================================================

CREATE TABLE daily_challenge_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_day DATE NOT NULL,
  day_number INTEGER NOT NULL, -- 1-based day of challenge
  status daily_status NOT NULL DEFAULT 'pending',
  deadline_utc TIMESTAMPTZ NOT NULL,
  evaluated_at TIMESTAMPTZ,
  excused_by UUID REFERENCES profiles(id),
  excused_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, user_id, challenge_day)
);

CREATE INDEX idx_daily_records_challenge_day ON daily_challenge_records(challenge_id, challenge_day);
CREATE INDEX idx_daily_records_user ON daily_challenge_records(user_id, challenge_day);
CREATE INDEX idx_daily_records_status ON daily_challenge_records(status, deadline_utc) WHERE status IN ('pending', 'submitted');
CREATE INDEX idx_daily_records_evaluation ON daily_challenge_records(deadline_utc, status) WHERE status = 'pending';

-- =====================================================================
-- PROOF SUBMISSIONS
-- =====================================================================

CREATE TABLE proof_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_challenge_records(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measured_value NUMERIC(10, 2) NOT NULL,
  measured_unit TEXT NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meets_target BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- false if superseded by re-submission
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_daily_record ON proof_submissions(daily_record_id);
CREATE INDEX idx_submissions_challenge ON proof_submissions(challenge_id, user_id);
CREATE INDEX idx_submissions_submitted_at ON proof_submissions(submitted_at);

-- =====================================================================
-- PROOF ATTACHMENTS
-- =====================================================================

CREATE TABLE proof_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES proof_submissions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  upload_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_mime CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  CONSTRAINT valid_file_size CHECK (file_size_bytes BETWEEN 1 AND 52428800) -- max 50MB
);

CREATE INDEX idx_attachments_submission ON proof_attachments(submission_id);

-- =====================================================================
-- PROOF REVIEWS AND DISPUTES
-- =====================================================================

CREATE TABLE proof_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES proof_submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verdict submission_review_verdict NOT NULL,
  reason TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, reviewer_id)
);

CREATE INDEX idx_reviews_submission ON proof_reviews(submission_id);
CREATE INDEX idx_reviews_reviewer ON proof_reviews(reviewer_id);

-- =====================================================================
-- CHAT MESSAGES
-- =====================================================================

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  image_url TEXT,
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  system_event JSONB, -- for system messages: { type, metadata }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_challenge ON chat_messages(challenge_id, created_at DESC);
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_reply ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- =====================================================================
-- EMOJI REACTIONS
-- =====================================================================

CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);

-- =====================================================================
-- PENALTIES
-- =====================================================================

CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE RESTRICT,
  daily_record_id UUID NOT NULL REFERENCES daily_challenge_records(id) ON DELETE RESTRICT,
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  challenge_day DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT NOT NULL,
  status penalty_status NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  settlement_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (daily_record_id, payer_id), -- idempotency: one penalty per missed day per payer
  CONSTRAINT valid_amount CHECK (amount > 0)
);

CREATE INDEX idx_penalties_challenge ON penalties(challenge_id, challenge_day);
CREATE INDEX idx_penalties_payer ON penalties(payer_id, status);

-- =====================================================================
-- PENALTY ALLOCATIONS (who receives each penalty)
-- =====================================================================

CREATE TABLE penalty_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  penalty_id UUID NOT NULL REFERENCES penalties(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL,
  status penalty_status NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (penalty_id, recipient_id)
);

CREATE INDEX idx_allocations_penalty ON penalty_allocations(penalty_id);
CREATE INDEX idx_allocations_recipient ON penalty_allocations(recipient_id, status);

-- =====================================================================
-- PAYMENT SETTLEMENTS
-- =====================================================================

CREATE TABLE payment_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE RESTRICT,
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  payment_reference TEXT,
  confirmed_by_payer BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by_recipient BOOLEAN NOT NULL DEFAULT FALSE,
  payer_confirmed_at TIMESTAMPTZ,
  recipient_confirmed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_challenge ON payment_settlements(challenge_id);
CREATE INDEX idx_settlements_payer ON payment_settlements(payer_id);
CREATE INDEX idx_settlements_recipient ON payment_settlements(recipient_id);

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  sent_push BOOLEAN NOT NULL DEFAULT FALSE,
  sent_email BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- =====================================================================
-- AUDIT LOG
-- =====================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE, CUSTOM
  actor_id UUID REFERENCES profiles(id),
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);

-- =====================================================================
-- PAUSE REQUESTS (for challenge pause with all-party consent)
-- =====================================================================

CREATE TABLE challenge_pause_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE challenge_pause_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pause_request_id UUID NOT NULL REFERENCES challenge_pause_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consented BOOLEAN NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pause_request_id, participant_id)
);

-- =====================================================================
-- CHALLENGE AMENDMENT REQUESTS
-- =====================================================================

CREATE TABLE challenge_amendment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_changes JSONB NOT NULL,
  change_reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  applied_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE challenge_amendment_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amendment_request_id UUID NOT NULL REFERENCES challenge_amendment_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consented BOOLEAN NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (amendment_request_id, participant_id)
);

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON challenge_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_daily_records_updated_at BEFORE UPDATE ON daily_challenge_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_penalties_updated_at BEFORE UPDATE ON penalties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_settlements_updated_at BEFORE UPDATE ON payment_settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_friendships_updated_at BEFORE UPDATE ON friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Generate unique clean username
  v_username := LOWER(
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1),
      'user'
    )
  );
  -- Keep only alphanumeric and underscore, limit to 20 chars
  v_username := REGEXP_REPLACE(v_username, '[^a-zA-Z0-9_]', '', 'g');
  IF LENGTH(v_username) < 3 THEN
    v_username := 'user_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8);
  ELSE
    v_username := SUBSTRING(v_username, 1, 18) || '_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 6);
  END IF;

  -- Display name (enforce max 50 chars for check constraint)
  v_display_name := SUBSTRING(
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1),
      'New User'
    ),
    1, 50
  );

  -- Avatar url (Google OAuth uses 'picture')
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to guarantee user creation is never blocked
  BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      NEW.id,
      'user_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 12),
      'New User'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = user_a AND addressee_id = user_b) OR
      (requester_id = user_b AND addressee_id = user_a)
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is challenge member
CREATE OR REPLACE FUNCTION is_challenge_member(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM challenge_participants
    WHERE challenge_id = p_challenge_id
    AND user_id = p_user_id
    AND status = 'accepted'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Trigger to update submission meets_target
CREATE OR REPLACE FUNCTION set_submission_meets_target()
RETURNS TRIGGER AS $$
DECLARE
  v_target NUMERIC(10, 2);
BEGIN
  SELECT daily_target_value INTO v_target
  FROM challenges
  WHERE id = NEW.challenge_id;
  
  NEW.meets_target := NEW.measured_value >= v_target;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submission_meets_target
  BEFORE INSERT OR UPDATE ON proof_submissions
  FOR EACH ROW EXECUTE FUNCTION set_submission_meets_target();

-- Trigger to prevent self-review
CREATE OR REPLACE FUNCTION check_no_self_review()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM proof_submissions
    WHERE id = NEW.submission_id AND user_id = NEW.reviewer_id
  ) THEN
    RAISE EXCEPTION 'Users cannot review their own submissions';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_self_review
  BEFORE INSERT OR UPDATE ON proof_reviews
  FOR EACH ROW EXECUTE FUNCTION check_no_self_review();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_pause_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_pause_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_amendment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_amendment_consents ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (account_deleted_at IS NULL);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- FRIENDSHIPS policies
CREATE POLICY "friendships_select" ON friendships FOR SELECT 
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_insert" ON friendships FOR INSERT 
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "friendships_update" ON friendships FOR UPDATE 
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_delete" ON friendships FOR DELETE 
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- CHALLENGES policies
CREATE POLICY "challenges_select" ON challenges FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "challenges_insert_auth" ON challenges FOR INSERT 
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "challenges_update_creator" ON challenges FOR UPDATE 
  USING (creator_id = auth.uid());
CREATE POLICY "challenges_delete_creator" ON challenges FOR DELETE 
  USING (creator_id = auth.uid());

-- CHALLENGE_RULE_VERSIONS policies
CREATE POLICY "rule_versions_select_member" ON challenge_rule_versions FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "rule_versions_insert_auth" ON challenge_rule_versions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- CHALLENGE_PARTICIPANTS policies
CREATE POLICY "participants_select_member" ON challenge_participants FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "participants_insert_creator" ON challenge_participants FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "participants_update_own" ON challenge_participants FOR UPDATE 
  USING (user_id = auth.uid());
CREATE POLICY "participants_delete_own" ON challenge_participants FOR DELETE 
  USING (user_id = auth.uid());

-- CHALLENGE_INVITATIONS policies
CREATE POLICY "invitations_select" ON challenge_invitations FOR SELECT 
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY "invitations_insert" ON challenge_invitations FOR INSERT 
  WITH CHECK (inviter_id = auth.uid());
CREATE POLICY "invitations_update_invitee" ON challenge_invitations FOR UPDATE 
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

-- DAILY_CHALLENGE_RECORDS policies
CREATE POLICY "daily_records_select_member" ON daily_challenge_records FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "daily_records_insert_auth" ON daily_challenge_records FOR INSERT 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_records_update_own" ON daily_challenge_records FOR UPDATE 
  USING (user_id = auth.uid());

-- PROOF_SUBMISSIONS policies
CREATE POLICY "submissions_select_member" ON proof_submissions FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "submissions_insert_own" ON proof_submissions FOR INSERT 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "submissions_update_own" ON proof_submissions FOR UPDATE 
  USING (user_id = auth.uid());

-- PROOF_ATTACHMENTS policies
CREATE POLICY "attachments_select_member" ON proof_attachments FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "attachments_insert_own" ON proof_attachments FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- PROOF_REVIEWS policies
CREATE POLICY "reviews_select_member" ON proof_reviews FOR SELECT 
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "reviews_insert_member" ON proof_reviews FOR INSERT 
  WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_update_member" ON proof_reviews FOR UPDATE 
  USING (reviewer_id = auth.uid());

-- CHAT_MESSAGES policies
CREATE POLICY "chat_select_member" ON chat_messages FOR SELECT 
  USING (is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "chat_insert_member" ON chat_messages FOR INSERT 
  WITH CHECK (sender_id = auth.uid() AND is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "chat_update_own" ON chat_messages FOR UPDATE 
  USING (sender_id = auth.uid());

-- MESSAGE_REACTIONS policies
CREATE POLICY "reactions_select_member" ON message_reactions FOR SELECT 
  USING (
    is_challenge_member(
      (SELECT challenge_id FROM chat_messages WHERE id = message_id),
      auth.uid()
    )
  );
CREATE POLICY "reactions_insert_member" ON message_reactions FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() AND
    is_challenge_member(
      (SELECT challenge_id FROM chat_messages WHERE id = message_id),
      auth.uid()
    )
  );
CREATE POLICY "reactions_delete_own" ON message_reactions FOR DELETE 
  USING (user_id = auth.uid());

-- PENALTIES policies
CREATE POLICY "penalties_select_member" ON penalties FOR SELECT 
  USING (is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "penalties_update_payer" ON penalties FOR UPDATE 
  USING (payer_id = auth.uid() OR 
         (SELECT creator_id FROM challenges WHERE id = challenge_id) = auth.uid());

-- PENALTY_ALLOCATIONS policies
CREATE POLICY "allocations_select_member" ON penalty_allocations FOR SELECT 
  USING (
    recipient_id = auth.uid() OR
    is_challenge_member(
      (SELECT challenge_id FROM penalties WHERE id = penalty_id),
      auth.uid()
    )
  );

-- PAYMENT_SETTLEMENTS policies
CREATE POLICY "settlements_select" ON payment_settlements FOR SELECT 
  USING (payer_id = auth.uid() OR recipient_id = auth.uid() OR
         is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "settlements_insert" ON payment_settlements FOR INSERT 
  WITH CHECK (payer_id = auth.uid() AND is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "settlements_update" ON payment_settlements FOR UPDATE 
  USING (payer_id = auth.uid() OR recipient_id = auth.uid());

-- NOTIFICATIONS policies
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT 
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_auth" ON notifications FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE 
  USING (user_id = auth.uid());
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE 
  USING (user_id = auth.uid());

-- PAUSE REQUEST policies
CREATE POLICY "pause_requests_select" ON challenge_pause_requests FOR SELECT 
  USING (is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "pause_requests_insert" ON challenge_pause_requests FOR INSERT 
  WITH CHECK (requested_by = auth.uid() AND is_challenge_member(challenge_id, auth.uid()));

CREATE POLICY "pause_consents_select" ON challenge_pause_consents FOR SELECT 
  USING (
    is_challenge_member(
      (SELECT challenge_id FROM challenge_pause_requests WHERE id = pause_request_id),
      auth.uid()
    )
  );
CREATE POLICY "pause_consents_insert" ON challenge_pause_consents FOR INSERT 
  WITH CHECK (participant_id = auth.uid());

-- AMENDMENT REQUEST policies
CREATE POLICY "amendments_select" ON challenge_amendment_requests FOR SELECT 
  USING (is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "amendments_insert" ON challenge_amendment_requests FOR INSERT 
  WITH CHECK (proposed_by = auth.uid() AND is_challenge_member(challenge_id, auth.uid()));

CREATE POLICY "amendment_consents_select" ON challenge_amendment_consents FOR SELECT 
  USING (
    is_challenge_member(
      (SELECT challenge_id FROM challenge_amendment_requests WHERE id = amendment_request_id),
      auth.uid()
    )
  );
CREATE POLICY "amendment_consents_insert" ON challenge_amendment_consents FOR INSERT 
  WITH CHECK (participant_id = auth.uid());

-- =====================================================================
-- STORAGE BUCKETS (run in Supabase Dashboard > Storage)
-- =====================================================================
-- Note: Execute these separately in the Supabase SQL editor with storage admin privileges

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'proof-photos',
--   'proof-photos',
--   FALSE,
--   52428800,  -- 50MB
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
-- );

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'avatars',
--   'avatars',
--   TRUE,
--   5242880,  -- 5MB
--   ARRAY['image/jpeg', 'image/png', 'image/webp']
-- );

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'chat-images',
--   'chat-images',
--   FALSE,
--   20971520,  -- 20MB
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
-- );

-- =====================================================================
-- REALTIME CONFIGURATION
-- =====================================================================
-- Enable realtime on these tables in Supabase Dashboard > Database > Replication
-- or run these:

BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE daily_challenge_records;
  ALTER PUBLICATION supabase_realtime ADD TABLE proof_submissions;
  ALTER PUBLICATION supabase_realtime ADD TABLE penalties;
  ALTER PUBLICATION supabase_realtime ADD TABLE challenge_participants;
COMMIT;

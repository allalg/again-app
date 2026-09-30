// =====================================================================
// STREAKPACT Database Types
// Generated from schema - keep in sync with migrations
// =====================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked'
export type ChallengeStatus = 'draft' | 'pending_acceptance' | 'active' | 'paused' | 'completed' | 'cancelled' | 'archived'
export type ParticipantStatus = 'invited' | 'accepted' | 'rejected' | 'withdrawn' | 'removed'
export type DailyStatus = 'pending' | 'submitted' | 'completed' | 'incomplete' | 'missed' | 'disputed' | 'excused'
export type SubmissionReviewVerdict = 'approved' | 'rejected' | 'flagged'
export type PenaltyStatus = 'pending' | 'settled' | 'waived' | 'disputed'
export type NotificationType =
  | 'challenge_invite' | 'invite_accepted' | 'invite_rejected'
  | 'challenge_started' | 'challenge_completed' | 'challenge_cancelled'
  | 'daily_reminder' | 'deadline_approaching' | 'deadline_missed'
  | 'submission_received' | 'submission_disputed' | 'submission_approved'
  | 'new_message' | 'friend_request' | 'friend_accepted'
  | 'penalty_created' | 'penalty_settled' | 'payment_received'
export type MessageType = 'text' | 'image' | 'system' | 'emoji_reaction'
export type ActivityCategory = 'fitness' | 'mindfulness' | 'learning' | 'health' | 'creative' | 'social' | 'productivity' | 'nutrition' | 'sleep' | 'custom'
export type MeasurementType = 'duration_minutes' | 'distance_km' | 'distance_miles' | 'count' | 'pages' | 'custom'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      friendships: {
        Row: Friendship
        Insert: FriendshipInsert
        Update: FriendshipUpdate
      }
      challenges: {
        Row: Challenge
        Insert: ChallengeInsert
        Update: ChallengeUpdate
      }
      challenge_participants: {
        Row: ChallengeParticipant
        Insert: ChallengeParticipantInsert
        Update: ChallengeParticipantUpdate
      }
      challenge_invitations: {
        Row: ChallengeInvitation
        Insert: ChallengeInvitationInsert
        Update: ChallengeInvitationUpdate
      }
      challenge_rule_versions: {
        Row: ChallengeRuleVersion
        Insert: ChallengeRuleVersionInsert
        Update: ChallengeRuleVersionUpdate
      }
      daily_challenge_records: {
        Row: DailyChallengeRecord
        Insert: DailyChallengeRecordInsert
        Update: DailyChallengeRecordUpdate
      }
      proof_submissions: {
        Row: ProofSubmission
        Insert: ProofSubmissionInsert
        Update: ProofSubmissionUpdate
      }
      proof_attachments: {
        Row: ProofAttachment
        Insert: ProofAttachmentInsert
        Update: ProofAttachmentUpdate
      }
      proof_reviews: {
        Row: ProofReview
        Insert: ProofReviewInsert
        Update: ProofReviewUpdate
      }
      chat_messages: {
        Row: ChatMessage
        Insert: ChatMessageInsert
        Update: ChatMessageUpdate
      }
      message_reactions: {
        Row: MessageReaction
        Insert: MessageReactionInsert
        Update: MessageReactionUpdate
      }
      penalties: {
        Row: Penalty
        Insert: PenaltyInsert
        Update: PenaltyUpdate
      }
      penalty_allocations: {
        Row: PenaltyAllocation
        Insert: PenaltyAllocationInsert
        Update: PenaltyAllocationUpdate
      }
      payment_settlements: {
        Row: PaymentSettlement
        Insert: PaymentSettlementInsert
        Update: PaymentSettlementUpdate
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
      audit_logs: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: AuditLogUpdate
      }
      challenge_pause_requests: {
        Row: ChallengePauseRequest
        Insert: ChallengePauseRequestInsert
        Update: ChallengePauseRequestUpdate
      }
      challenge_pause_consents: {
        Row: ChallengePauseConsent
        Insert: ChallengePauseConsentInsert
        Update: ChallengePauseConsentUpdate
      }
      challenge_amendment_requests: {
        Row: ChallengeAmendmentRequest
        Insert: ChallengeAmendmentRequestInsert
        Update: ChallengeAmendmentRequestUpdate
      }
      challenge_amendment_consents: {
        Row: ChallengeAmendmentConsent
        Insert: ChallengeAmendmentConsentInsert
        Update: ChallengeAmendmentConsentUpdate
      }
    }
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      is_challenge_member: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Views: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =====================================================================
// ENTITY TYPES
// =====================================================================

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  timezone: string
  email_notifications: boolean
  push_notifications: boolean
  push_subscription: Json | null
  show_email_to_friends: boolean
  account_deleted_at: string | null
  created_at: string
  updated_at: string
}
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & Partial<Pick<Profile, 'id' | 'timezone' | 'email_notifications' | 'push_notifications' | 'show_email_to_friends'>>
export type ProfileUpdate = Partial<ProfileInsert>

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
}
export type FriendshipInsert = Omit<Friendship, 'id' | 'created_at' | 'updated_at' | 'status'>
export type FriendshipUpdate = Pick<Friendship, 'status'>

export interface Challenge {
  id: string
  creator_id: string
  title: string
  description: string | null
  activity_name: string
  activity_category: ActivityCategory
  measurement_type: MeasurementType
  custom_measurement_unit: string | null
  daily_target_value: number
  daily_target_unit: string
  start_date: string
  duration_days: number
  end_date: string
  daily_deadline: string
  grace_period_minutes: number
  timezone: string
  fine_amount: number
  currency: string
  penalty_distribution: string
  no_recipient_policy: string
  max_participants: number
  invitation_link_token: string | null
  invitation_link_expires_at: string | null
  proof_review_required: boolean
  min_review_approvals: number
  dispute_window_hours: number
  pause_requires_all_consent: boolean
  allow_excused_absences: boolean
  max_excused_days: number
  status: ChallengeStatus
  current_rule_version: number
  paused_at: string | null
  paused_reason: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancelled_reason: string | null
  created_at: string
  updated_at: string
}
export type ChallengeInsert = Omit<Challenge, 'id' | 'end_date' | 'created_at' | 'updated_at' | 'current_rule_version' | 'status' | 'paused_at' | 'paused_reason' | 'completed_at' | 'cancelled_at' | 'cancelled_reason'>
export type ChallengeUpdate = Partial<ChallengeInsert & Pick<Challenge, 'status' | 'paused_at' | 'paused_reason' | 'completed_at' | 'cancelled_at' | 'cancelled_reason'>>

export interface ChallengeParticipant {
  id: string
  challenge_id: string
  user_id: string
  status: ParticipantStatus
  rule_version_accepted: number | null
  accepted_at: string | null
  rejected_at: string | null
  withdrawn_at: string | null
  withdrawal_reason: string | null
  invited_by: string | null
  current_streak: number
  longest_streak: number
  total_completed_days: number
  total_missed_days: number
  total_penalties_owed: number
  total_penalties_received: number
  created_at: string
  updated_at: string
}
export type ChallengeParticipantInsert = Omit<ChallengeParticipant, 'id' | 'created_at' | 'updated_at' | 'current_streak' | 'longest_streak' | 'total_completed_days' | 'total_missed_days' | 'total_penalties_owed' | 'total_penalties_received'>
export type ChallengeParticipantUpdate = Partial<ChallengeParticipant>

export interface ChallengeInvitation {
  id: string
  challenge_id: string
  inviter_id: string
  invitee_id: string | null
  invitee_email: string | null
  token: string
  expires_at: string
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
}
export type ChallengeInvitationInsert = Omit<ChallengeInvitation, 'id' | 'token' | 'created_at'>
export type ChallengeInvitationUpdate = Partial<Pick<ChallengeInvitation, 'accepted_at' | 'rejected_at'>>

export interface ChallengeRuleVersion {
  id: string
  challenge_id: string
  version: number
  rule_snapshot: Json
  changed_by: string
  change_reason: string | null
  created_at: string
}
export type ChallengeRuleVersionInsert = Omit<ChallengeRuleVersion, 'id' | 'created_at'>
export type ChallengeRuleVersionUpdate = never

export interface DailyChallengeRecord {
  id: string
  challenge_id: string
  participant_id: string
  user_id: string
  challenge_day: string
  day_number: number
  status: DailyStatus
  deadline_utc: string
  evaluated_at: string | null
  excused_by: string | null
  excused_reason: string | null
  created_at: string
  updated_at: string
}
export type DailyChallengeRecordInsert = Omit<DailyChallengeRecord, 'id' | 'created_at' | 'updated_at'>
export type DailyChallengeRecordUpdate = Partial<Pick<DailyChallengeRecord, 'status' | 'evaluated_at' | 'excused_by' | 'excused_reason'>>

export interface ProofSubmission {
  id: string
  daily_record_id: string
  challenge_id: string
  user_id: string
  measured_value: number
  measured_unit: string
  notes: string | null
  submitted_at: string
  meets_target: boolean
  is_active: boolean
  created_at: string
}
export type ProofSubmissionInsert = Omit<ProofSubmission, 'id' | 'created_at' | 'meets_target' | 'submitted_at'>
export type ProofSubmissionUpdate = Partial<Pick<ProofSubmission, 'is_active' | 'notes'>>

export interface ProofAttachment {
  id: string
  submission_id: string
  storage_path: string
  file_name: string
  file_size_bytes: number
  mime_type: string
  upload_order: number
  created_at: string
}
export type ProofAttachmentInsert = Omit<ProofAttachment, 'id' | 'created_at'>
export type ProofAttachmentUpdate = never

export interface ProofReview {
  id: string
  submission_id: string
  reviewer_id: string
  verdict: SubmissionReviewVerdict
  reason: string | null
  reviewed_at: string
}
export type ProofReviewInsert = Omit<ProofReview, 'id' | 'reviewed_at'>
export type ProofReviewUpdate = never

export interface ChatMessage {
  id: string
  challenge_id: string
  sender_id: string | null
  message_type: MessageType
  content: string | null
  image_url: string | null
  reply_to_id: string | null
  is_deleted: boolean
  edited_at: string | null
  system_event: Json | null
  created_at: string
}
export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'created_at' | 'is_deleted'>
export type ChatMessageUpdate = Partial<Pick<ChatMessage, 'content' | 'is_deleted' | 'edited_at'>>

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}
export type MessageReactionInsert = Omit<MessageReaction, 'id' | 'created_at'>
export type MessageReactionUpdate = never

export interface Penalty {
  id: string
  challenge_id: string
  daily_record_id: string
  payer_id: string
  challenge_day: string
  amount: number
  currency: string
  reason: string
  status: PenaltyStatus
  settled_at: string | null
  settlement_note: string | null
  created_at: string
  updated_at: string
}
export type PenaltyInsert = Omit<Penalty, 'id' | 'created_at' | 'updated_at' | 'status'>
export type PenaltyUpdate = Partial<Pick<Penalty, 'status' | 'settled_at' | 'settlement_note'>>

export interface PenaltyAllocation {
  id: string
  penalty_id: string
  recipient_id: string
  amount: number
  status: PenaltyStatus
  settled_at: string | null
  created_at: string
}
export type PenaltyAllocationInsert = Omit<PenaltyAllocation, 'id' | 'created_at' | 'status'>
export type PenaltyAllocationUpdate = Partial<Pick<PenaltyAllocation, 'status' | 'settled_at'>>

export interface PaymentSettlement {
  id: string
  challenge_id: string
  payer_id: string
  recipient_id: string
  amount: number
  currency: string
  payment_method: string | null
  payment_reference: string | null
  confirmed_by_payer: boolean
  confirmed_by_recipient: boolean
  payer_confirmed_at: string | null
  recipient_confirmed_at: string | null
  note: string | null
  created_at: string
  updated_at: string
}
export type PaymentSettlementInsert = Omit<PaymentSettlement, 'id' | 'created_at' | 'updated_at' | 'confirmed_by_payer' | 'confirmed_by_recipient'>
export type PaymentSettlementUpdate = Partial<Pick<PaymentSettlement, 'confirmed_by_payer' | 'confirmed_by_recipient' | 'payer_confirmed_at' | 'recipient_confirmed_at' | 'note'>>

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Json | null
  read_at: string | null
  sent_push: boolean
  sent_email: boolean
  created_at: string
}
export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'read_at' | 'sent_push' | 'sent_email'>
export type NotificationUpdate = Partial<Pick<Notification, 'read_at'>>

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  actor_id: string | null
  old_data: Json | null
  new_data: Json | null
  metadata: Json | null
  created_at: string
}
export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>
export type AuditLogUpdate = never

export interface ChallengePauseRequest {
  id: string
  challenge_id: string
  requested_by: string
  reason: string
  expires_at: string
  created_at: string
}
export type ChallengePauseRequestInsert = Omit<ChallengePauseRequest, 'id' | 'created_at'>
export type ChallengePauseRequestUpdate = never

export interface ChallengePauseConsent {
  id: string
  pause_request_id: string
  participant_id: string
  consented: boolean
  consented_at: string
}
export type ChallengePauseConsentInsert = Omit<ChallengePauseConsent, 'id' | 'consented_at'>
export type ChallengePauseConsentUpdate = never

export interface ChallengeAmendmentRequest {
  id: string
  challenge_id: string
  proposed_by: string
  proposed_changes: Json
  change_reason: string
  expires_at: string
  applied_at: string | null
  rejected_at: string | null
  created_at: string
}
export type ChallengeAmendmentRequestInsert = Omit<ChallengeAmendmentRequest, 'id' | 'created_at' | 'applied_at' | 'rejected_at'>
export type ChallengeAmendmentRequestUpdate = Partial<Pick<ChallengeAmendmentRequest, 'applied_at' | 'rejected_at'>>

export interface ChallengeAmendmentConsent {
  id: string
  amendment_request_id: string
  participant_id: string
  consented: boolean
  consented_at: string
}
export type ChallengeAmendmentConsentInsert = Omit<ChallengeAmendmentConsent, 'id' | 'consented_at'>
export type ChallengeAmendmentConsentUpdate = never

// =====================================================================
// EXTENDED / JOINED TYPES (for UI use)
// =====================================================================

export interface ProfilePublic {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  timezone: string
  created_at: string
}

export interface ChallengeWithParticipants extends Challenge {
  participants: (ChallengeParticipant & { profile: ProfilePublic })[]
  my_participant?: ChallengeParticipant
}

export interface DailyRecordWithSubmission extends DailyChallengeRecord {
  submission?: ProofSubmission & { attachments: ProofAttachment[] }
  profile: ProfilePublic
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: ProfilePublic | null
  reactions: (MessageReaction & { user: ProfilePublic })[]
  reply_to?: ChatMessage & { sender: ProfilePublic | null }
}

export interface PenaltyWithDetails extends Penalty {
  payer: ProfilePublic
  allocations: (PenaltyAllocation & { recipient: ProfilePublic })[]
  daily_record: DailyChallengeRecord
}

export interface NotificationWithData extends Omit<Notification, 'data'> {
  data: {
    challenge_id?: string
    challenge_title?: string
    user_id?: string
    username?: string
    day?: number
    amount?: number
    currency?: string
    [key: string]: unknown
  } | null
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const todayUTC = now.toISOString().split('T')[0]

    // 1. Fetch all active challenges
    const { data: activeChallenges, error: challengesError } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'active')

    if (challengesError) throw challengesError

    let totalProcessed = 0
    let totalMissed = 0
    let totalPenalties = 0

    for (const challenge of activeChallenges ?? []) {
      // Determine which day of the challenge today is
      const challengeStart = new Date(challenge.start_date)
      const dayNumber = Math.floor((now.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

      if (dayNumber < 1 || dayNumber > challenge.duration_days) continue

      // Compute deadline for this challenge day in UTC
      const deadlineLocal = `${todayUTC}T${challenge.daily_deadline}:00`
      const deadline = new Date(`${deadlineLocal} ${challenge.timezone || 'UTC'}`)

      // Only evaluate if deadline has passed
      if (deadline > now) continue

      // Fetch accepted participants
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .eq('challenge_id', challenge.id)
        .eq('status', 'accepted')

      if (!participants || participants.length === 0) continue

      // For each participant, check/create their daily record
      const completedUsers: string[] = []
      const missedUsers: string[] = []

      for (const participant of participants) {
        const { data: record } = await supabase
          .from('daily_challenge_records')
          .select('id, status')
          .eq('challenge_id', challenge.id)
          .eq('user_id', participant.user_id)
          .eq('challenge_day', todayUTC)
          .single()

        if (!record) {
          // Create a missed record
          await supabase.from('daily_challenge_records').insert({
            challenge_id: challenge.id,
            user_id: participant.user_id,
            challenge_day: todayUTC,
            day_number: dayNumber,
            status: 'missed',
            deadline_utc: deadline.toISOString(),
          })
          missedUsers.push(participant.user_id)
        } else if (record.status === 'pending' || record.status === 'submitted') {
          // Still pending or not reviewed — mark as missed
          await supabase.from('daily_challenge_records')
            .update({ status: 'missed' })
            .eq('id', record.id)
          missedUsers.push(participant.user_id)
        } else if (record.status === 'completed') {
          completedUsers.push(participant.user_id)
        }
        // excused and incomplete are already settled
      }

      // Process penalties for missed users
      if (missedUsers.length > 0 && challenge.fine_amount > 0) {
        for (const missedUserId of missedUsers) {
          // Get the daily record to link penalty
          const { data: missedRecord } = await supabase
            .from('daily_challenge_records')
            .select('id')
            .eq('challenge_id', challenge.id)
            .eq('user_id', missedUserId)
            .eq('challenge_day', todayUTC)
            .single()

          // Create penalty
          const { data: penalty } = await supabase.from('penalties').insert({
            challenge_id: challenge.id,
            payer_id: missedUserId,
            daily_record_id: missedRecord?.id,
            challenge_day: todayUTC,
            amount: challenge.fine_amount,
            currency: challenge.currency,
            status: 'pending',
            reason: `Missed daily target on day ${dayNumber}`,
          }).select().single()

          if (!penalty) continue

          // Distribute to completers (or carry forward if no completers)
          if (completedUsers.length > 0) {
            const sharePerUser = challenge.fine_amount / completedUsers.length
            for (const recipientId of completedUsers) {
              await supabase.from('penalty_allocations').insert({
                penalty_id: penalty.id,
                recipient_id: recipientId,
                amount: sharePerUser,
                status: 'pending',
              })
            }
          } else if (challenge.no_recipient_policy === 'void') {
            await supabase.from('penalties').update({ status: 'waived' }).eq('id', penalty.id)
          }
          // carry_forward: allocation created later when someone completes

          totalPenalties++

          // Send notification to payer
          await supabase.from('notifications').insert({
            user_id: missedUserId,
            type: 'penalty_created',
            title: 'Penalty incurred',
            body: `You missed day ${dayNumber} of "${challenge.title}". ${challenge.fine_amount} ${challenge.currency} fine applied.`,
            data: { challenge_id: challenge.id, amount: challenge.fine_amount, currency: challenge.currency },
          })
        }
      }

      // Update streaks for completed users
      for (const completedUserId of completedUsers) {
        await supabase.rpc('update_participant_streak', {
          p_challenge_id: challenge.id,
          p_user_id: completedUserId,
          p_completed: true,
        })
      }

      // Update streaks for missed users
      for (const missedUserId of missedUsers) {
        await supabase.rpc('update_participant_streak', {
          p_challenge_id: challenge.id,
          p_user_id: missedUserId,
          p_completed: false,
        })

        // Update missed day count
        await supabase.rpc('increment_missed_days', {
          p_challenge_id: challenge.id,
          p_user_id: missedUserId,
        })
      }

      totalProcessed++
      totalMissed += missedUsers.length
    }

    // Check for challenges that should end
    const { data: endingChallenges } = await supabase
      .from('challenges')
      .select('id, title')
      .eq('status', 'active')
      .lte('end_date', todayUTC)

    for (const challenge of endingChallenges ?? []) {
      await supabase.from('challenges').update({ status: 'completed' }).eq('id', challenge.id)

      // Notify all participants
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .eq('challenge_id', challenge.id)
        .eq('status', 'accepted')

      for (const p of participants ?? []) {
        await supabase.from('notifications').insert({
          user_id: p.user_id,
          type: 'challenge_completed',
          title: 'Challenge completed! 🏆',
          body: `"${challenge.title}" has ended. Check the final leaderboard!`,
          data: { challenge_id: challenge.id },
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        missed: totalMissed,
        penalties: totalPenalties,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('evaluate-daily-deadlines error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

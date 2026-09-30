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

    // Find all active challenges with deadlines approaching in the next hour
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

    // Fetch active challenges
    const { data: challenges } = await supabase
      .from('challenges')
      .select('*, participants:challenge_participants(user_id)')
      .eq('status', 'active')

    let sentCount = 0

    for (const challenge of challenges ?? []) {
      // Parse deadline for today in the challenge timezone
      const todayDate = new Date().toISOString().split('T')[0]
      const deadlineStr = `${todayDate}T${challenge.daily_deadline}:00`

      // Check if deadline is in the next 60 minutes
      const deadlineUtc = new Date(deadlineStr) // simplified UTC comparison

      if (deadlineUtc > now && deadlineUtc <= oneHourLater) {
        // Send reminders to participants who haven't submitted yet
        for (const participant of (challenge as any).participants ?? []) {
          // Check if already submitted today
          const { data: record } = await supabase
            .from('daily_challenge_records')
            .select('id, status')
            .eq('challenge_id', challenge.id)
            .eq('user_id', participant.user_id)
            .eq('challenge_day', todayDate)
            .single()

          // Only remind if not yet completed/submitted
          if (!record || record.status === 'pending') {
            const minutesLeft = Math.round((deadlineUtc.getTime() - now.getTime()) / 60000)

            await supabase.from('notifications').insert({
              user_id: participant.user_id,
              type: 'deadline_approaching',
              title: '⚡ Deadline approaching!',
              body: `"${challenge.title}" closes in ${minutesLeft} min. Submit your proof now!`,
              data: {
                challenge_id: challenge.id,
                challenge_title: challenge.title,
                minutes_left: minutesLeft,
              },
            })

            sentCount++
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

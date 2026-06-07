import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    const supabase = createAdminSupabase()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId

        if (userId) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'pro' })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.created': {
        const sub = event.data.object
        const uid = sub.metadata?.userId

        if (uid) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'pro' })
            .eq('id', uid)
        }
        break
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const { userId } = subscription.metadata

        if (userId && subscription.status !== 'active' && subscription.status !== 'trialing') {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'free' })
            .eq('id', userId)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}

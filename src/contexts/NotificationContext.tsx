import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import type { NotificationWithData } from '@/lib/database.types'

interface NotificationContextValue {
  requestPushPermission: () => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextValue>({
  requestPushPermission: async () => false,
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()
  const { setNotifications, addNotification } = useNotificationStore()

  useEffect(() => {
    if (!user) return

    // Load initial notifications
    loadNotifications()

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addNotification(payload.new as NotificationWithData)
          // Show browser notification if permitted
          showBrowserNotification(payload.new as NotificationWithData)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const loadNotifications = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setNotifications(data as NotificationWithData[])
    }
  }

  const requestPushPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    // Register push subscription
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
        
        if (!vapidPublicKey) return true // Push registered without VAPID
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })

        // Save subscription to profile
        if (user) {
          await supabase.from('profiles').update({
            push_subscription: subscription.toJSON(),
            push_notifications: true,
          }).eq('id', user.id)
        }

        return true
      } catch (err) {
        console.error('Push subscription failed:', err)
        return false
      }
    }

    return permission === 'granted'
  }

  const showBrowserNotification = (notification: NotificationWithData) => {
    if (Notification.permission === 'granted' && document.hidden) {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: notification.id,
      })
    }
  }

  return (
    <NotificationContext.Provider value={{ requestPushPermission }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}

// Helper: convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

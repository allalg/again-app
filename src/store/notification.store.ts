import { create } from 'zustand'
import type { NotificationWithData } from '@/lib/database.types'

interface NotificationState {
  notifications: NotificationWithData[]
  unreadCount: number
  isOpen: boolean
  setNotifications: (notifications: NotificationWithData[]) => void
  addNotification: (notification: NotificationWithData) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  setIsOpen: (isOpen: boolean) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read_at).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read_at ? 0 : 1),
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    })),

  setIsOpen: (isOpen) => set({ isOpen }),
}))

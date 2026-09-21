import { useOutletContext } from 'react-router-dom'

export type FeedbackType = 'success' | 'error'

export type AdminOutletContext = {
  showFeedback: (message: string, type?: FeedbackType) => void
}

export function useAdminFeedback() {
  return useOutletContext<AdminOutletContext>()
}

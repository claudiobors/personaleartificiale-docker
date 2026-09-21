import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Il sito marketing linka qui con ?plan=...&cycle=... per precompilare PlansView:
    // senza `search` il redirect li perderebbe e l'utente vedrebbe i piani "vuoti".
    throw redirect({
      to: '/dashboard',
      search: (prev) => prev,
    })
  },
})

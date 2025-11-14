import { renderToStaticMarkup } from 'react-dom/server'
import { GuardianInvitationTemplate } from './guardian-invitation-template'
import { GUARDIAN_INVITATION_TEMPLATE_STYLE } from './guardian-invitation-style'
import type { GuardianInvitationData } from './guardian-invitation-template'

export const generateGuardianInvitationHtml = (data: GuardianInvitationData): string => 
  `<!DOCTYPE html><html lang="ar"><head><meta charSet="utf-8" /><title>دعوة ولي الأمر</title><style>${GUARDIAN_INVITATION_TEMPLATE_STYLE}</style></head><body>${renderToStaticMarkup(<GuardianInvitationTemplate data={data} />)}</body></html>`

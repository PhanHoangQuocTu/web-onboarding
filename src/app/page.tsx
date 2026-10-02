'use client'

import { useFlow } from '@/components/FlowProvider'
import { QuestionScreen } from '@/components/QuestionScreen'
import { BreakScreen } from '@/components/BreakScreen'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PlanScreen } from '@/components/PlanScreen'
import { EmailScreen } from '@/components/EmailScreen'
import { OfferScreen } from '@/components/OfferScreen'
import { PricingScreen } from '@/components/PricingScreen'
import { CompleteScreen } from '@/components/CompleteScreen'
import { questions } from '@/lib/quiz'

export default function Home() {
  const { step, ready } = useFlow()
  if (!ready) return null
  const question = questions.find((item) => item.id === step)
  if (question) return <QuestionScreen key={step} question={question} />
  if (step === 'break1' || step === 'break2')
    return <BreakScreen part={step === 'break1' ? 1 : 2} />
  if (step === 'loading') return <LoadingScreen />
  if (step === 'plan') return <PlanScreen />
  if (step === 'email') return <EmailScreen />
  if (step === 'offer') return <OfferScreen />
  if (step === 'pricing') return <PricingScreen />
  if (step === 'complete') return <CompleteScreen />
  return <QuestionScreen question={questions[0]} />
}

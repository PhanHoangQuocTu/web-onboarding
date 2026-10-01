export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim()
export const PROMO_CODE = process.env.NEXT_PUBLIC_PROMO_CODE?.trim()

export const GA_CURRENCY = 'USD'

export const GA_EVENT = {
  SCREEN_VIEW: 'screen_view',
  BACK_CLICK: 'back_click',
  CTA_CLICK: 'cta_click',
  ANSWER_SELECT: 'answer_select',
  OFFER_REVEAL: 'offer_reveal',
  SELECT_PLAN: 'select_plan',
  CHOOSE_PLAN_CLICK: 'choose_plan_click',
  BEGIN_CHECKOUT: 'begin_checkout',
  PREVIEW_NEXT_STEPS_CLICK: 'preview_next_steps_click',
  CHECKOUT_DISMISS: 'checkout_dismiss',
  PAY_GOOGLE_PAY_CLICK: 'pay_google_pay_click',
  PAY_APPLE_PAY_CLICK: 'pay_apple_pay_click',
  PAY_PAYPAL_CLICK: 'pay_paypal_click',
  PAY_SUBMIT_CLICK: 'pay_submit_click',
  CAROUSEL_CLICK: 'template_carousel_click',
} as const

export const GA_PARAM = {
  SCREEN_NAME: 'screen_name',
  BUTTON_TEXT: 'button_text',
  QUESTION_ID: 'question_id',
  ANSWER_VALUE: 'answer_value',
  SELECTED: 'selected',
  PLAN: 'plan',
  CURRENCY: 'currency',
  VALUE: 'value',
  DIRECTION: 'direction',
  METHOD: 'method',
} as const

export const GA_VALUE = {
  STICKY_ACTION: 'sticky_action',
  NEXT: 'next',
  PREVIOUS: 'previous',
  SCRATCH: 'scratch',
  BUTTON: 'button',
} as const

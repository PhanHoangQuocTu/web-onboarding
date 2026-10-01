import { ExpressWalletSlot } from '@/components/ExpressWallet'

function PayPalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M6.48623 19.5589H2.26406C2.17925 19.5589 2.09545 19.5405 2.01842 19.505C1.94139 19.4695 1.87296 19.4177 1.81783 19.3533C1.7627 19.2888 1.72218 19.2132 1.69904 19.1316C1.67591 19.05 1.67071 18.9644 1.68381 18.8806L4.53189 0.825917C4.60706 0.350167 5.01773 0 5.49806 0H12.3364C14.6922 0 16.5329 0.49775 17.5522 1.65917C18.4781 2.71333 18.7476 3.8775 18.4799 5.58892C18.4588 5.72 18.4368 5.85292 18.4093 5.9895C17.5082 10.6187 14.4227 12.2201 10.4829 12.2201H8.47539C7.99506 12.2201 7.58806 12.5703 7.51289 13.0451L6.48623 19.5589ZM19.4534 6.34058C19.2887 6.1533 19.1019 5.98677 18.897 5.84467C18.8851 5.91433 18.8731 6.00508 18.8594 6.0775C18.0069 10.4573 15.1881 12.6784 10.4829 12.6784H8.47539C8.35197 12.6786 8.23269 12.7229 8.13919 12.8035C8.04568 12.8841 7.98414 12.9955 7.96572 13.1175L6.87764 20.0173H6.41381L6.19381 21.4069C6.18228 21.4802 6.18678 21.5552 6.20701 21.6266C6.22724 21.698 6.26272 21.7642 6.31099 21.8205C6.35926 21.8769 6.41918 21.9222 6.48662 21.9531C6.55407 21.9841 6.62742 22.0001 6.70164 22H10.2601C10.6818 22 11.0393 21.6938 11.1053 21.2777C11.1603 21.0393 11.802 16.83 11.8533 16.6118C11.8848 16.4102 11.9875 16.2266 12.1427 16.0941C12.2979 15.9616 12.4953 15.889 12.6994 15.8895H13.2311C16.6777 15.8895 19.3773 14.4888 20.1656 10.439C20.4956 8.74592 20.3251 7.33333 19.4534 6.34058Z"
        fill="#003087"
      />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M16.9587 4.58331H5.04199C3.52321 4.58331 2.29199 5.81453 2.29199 7.33331V14.6666C2.29199 16.1854 3.52321 17.4166 5.04199 17.4166H16.9587C18.4774 17.4166 19.7087 16.1854 19.7087 14.6666V7.33331C19.7087 5.81453 18.4774 4.58331 16.9587 4.58331Z"
        stroke="white"
        strokeWidth="1.83333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.29199 9.16663H19.7087M5.95866 13.75H9.62533"
        stroke="white"
        strokeWidth="1.83333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PaymentActions({
  onPayPalClick,
  onCardClick,
  busy = false,
}: {
  onPayPalClick: () => void
  onCardClick: () => void
  busy?: boolean
}) {
  const button =
    'brand-font flex h-15 w-full items-center justify-center gap-3 rounded-full text-xl font-semibold'

  return (
    <div className="mt-5 space-y-3">
      <ExpressWalletSlot />
      <button
        type="button"
        disabled={busy}
        onClick={onPayPalClick}
        className={`${button} bg-[#ffca3a] text-[#003087] disabled:cursor-wait`}
      >
        <PayPalIcon />
        Pay with PayPal
      </button>
      <button
        type="button"
        onClick={onCardClick}
        disabled={busy}
        className={`primary-button ${button} disabled:cursor-wait`}
      >
        <CardIcon />
        Pay with card
      </button>
    </div>
  )
}

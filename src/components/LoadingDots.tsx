// Three pulsing dots — used inside buttons to show an action is in flight.
export default function LoadingDots({ label }: { label?: string }) {
  return (
    <span className="dots" role="status" aria-label={label || 'Loading'}>
      <span /><span /><span />
    </span>
  )
}

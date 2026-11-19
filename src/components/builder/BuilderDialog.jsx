import { useEffect, useRef } from 'react'

export default function BuilderDialog({ label, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog ref={ref} className="builder-dialog" aria-label={label}
            onCancel={event => { event.preventDefault(); onClose() }}>
      {children}
    </dialog>
  )
}

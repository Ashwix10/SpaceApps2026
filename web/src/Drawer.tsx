import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function Drawer({ title, children, onClose, wide = false }: {
  title: string; children: ReactNode; onClose: () => void; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`drawer ${wide ? 'drawer-wide' : ''}`} aria-labelledby="drawer-title"
    onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="drawer-content"><div className="drawer-header"><h2 id="drawer-title">{title}</h2>
      <button className="icon-button" aria-label="Close panel" onClick={onClose}>×</button></div>
      <div className="drawer-body">{children}</div>
    </div>
  </dialog>;
}

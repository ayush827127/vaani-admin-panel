import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

// Shop status and subscription status changes directly affect a paying
// customer's access to the app and previously fired the instant an admin
// picked a dropdown option, with no confirmation step at all — the same
// class of "did you mean to do that" gap that only record deletes had a
// guard against. One shared dialog for any impactful-but-not-a-delete action.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger', // 'danger' | 'primary'
  onConfirm,
  onClose,
  busy = false,
}) {
  const confirmClasses =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-purple-600 hover:bg-purple-700';

  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'
          }`}
        >
          <AlertTriangle size={18} />
        </div>
        <p className="pt-1.5 text-sm text-gray-600">{message}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${confirmClasses}`}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

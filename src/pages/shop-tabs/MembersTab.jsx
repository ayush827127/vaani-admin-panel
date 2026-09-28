import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as membersApi from '../../api/shopMembers';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import Select from '../../components/Select';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastContext';

const ROLES = ['OWNER', 'MANAGER', 'CASHIER'];

// The new User/ShopUser/Invitation membership system (see shopMembers.js's
// own note on how it differs from the legacy admin-only ShopUser CRUD).
// Admin actions here bypass the in-app "only an owner can invite/promote
// another owner" rule — a platform admin already has full authority — but
// the backend still refuses to remove or demote a shop's last remaining
// owner, since that's a data-integrity rule, not a permission one.
export default function MembersTab({ shopId }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  const membersQuery = useQuery({
    queryKey: ['shop-members', shopId],
    queryFn: () => membersApi.listMembers(shopId),
  });
  const invitationsQuery = useQuery({
    queryKey: ['shop-invitations', shopId],
    queryFn: () => membersApi.listInvitations(shopId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['shop-members', shopId] });
    queryClient.invalidateQueries({ queryKey: ['shop-invitations', shopId] });
  };

  const inviteMutation = useMutation({
    mutationFn: (data) => membersApi.inviteMember(shopId, data),
    onSuccess: () => {
      invalidate();
      setShowInvite(false);
      toast.success('Invitation sent');
    },
    onError: (err) => toast.error(err.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ shopUserId, role }) => membersApi.changeMemberRole(shopId, shopUserId, role),
    onSuccess: () => {
      invalidate();
      setRoleTarget(null);
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (shopUserId) => membersApi.removeMember(shopId, shopUserId),
    onSuccess: () => {
      invalidate();
      setConfirmRemove(null);
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId) => membersApi.revokeInvitation(shopId, invitationId),
    onSuccess: () => {
      invalidate();
      setConfirmRevoke(null);
      toast.success('Invitation revoked');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Members</h3>
          <button
            onClick={() => setShowInvite(true)}
            className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            Invite member
          </button>
        </div>

        {membersQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {membersQuery.error && <p className="text-sm text-red-600">{membersQuery.error.message}</p>}

        {membersQuery.data && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {membersQuery.data.map((m) => (
                  <tr key={m.shopUserId} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{m.phone}</td>
                    <td className="px-4 py-2.5 text-gray-700">{m.role}</td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      <button
                        onClick={() => setRoleTarget(m)}
                        className="mr-3 text-purple-700 hover:underline"
                      >
                        Change role
                      </button>
                      <button
                        onClick={() => setConfirmRemove(m)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {membersQuery.data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No members yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Pending invitations</h3>
        {invitationsQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {invitationsQuery.error && <p className="text-sm text-red-600">{invitationsQuery.error.message}</p>}
        {invitationsQuery.data && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Expires</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitationsQuery.data.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">{inv.invitedPhone}</td>
                    <td className="px-4 py-2.5 text-gray-700">{inv.role}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      <button
                        onClick={() => setConfirmRevoke(inv)}
                        className="text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {invitationsQuery.data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No pending invitations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteMemberModal
          onClose={() => setShowInvite(false)}
          onSubmit={(data) => inviteMutation.mutate(data)}
          submitting={inviteMutation.isPending}
          error={inviteMutation.error}
        />
      )}

      {roleTarget && (
        <ChangeRoleModal
          member={roleTarget}
          onClose={() => setRoleTarget(null)}
          onSubmit={(role) => roleMutation.mutate({ shopUserId: roleTarget.shopUserId, role })}
          submitting={roleMutation.isPending}
          error={roleMutation.error}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove member?"
          message={`${confirmRemove.name} will lose access to this shop immediately. This can't be undone (they'd need a fresh invitation to rejoin).`}
          confirmLabel="Remove"
          busy={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(confirmRemove.shopUserId)}
          onClose={() => setConfirmRemove(null)}
        />
      )}

      {confirmRevoke && (
        <ConfirmDialog
          title="Revoke invitation?"
          message={`The invitation sent to ${confirmRevoke.invitedPhone} will no longer be usable.`}
          confirmLabel="Revoke"
          busy={revokeMutation.isPending}
          onConfirm={() => revokeMutation.mutate(confirmRevoke.id)}
          onClose={() => setConfirmRevoke(null)}
        />
      )}
    </div>
  );
}

function InviteMemberModal({ onClose, onSubmit, submitting, error }) {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CASHIER');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ phone, role });
  }

  return (
    <Modal title="Invite a member" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>}
        <Field
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          maxLength={10}
          placeholder="10-digit mobile number"
        />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send invitation'}
        </button>
      </form>
    </Modal>
  );
}

function ChangeRoleModal({ member, onClose, onSubmit, submitting, error }) {
  const [role, setRole] = useState(member.role);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(role);
  }

  return (
    <Modal title={`Change role — ${member.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>}
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          disabled={submitting || role === member.role}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save role'}
        </button>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '../../api/syncedInvoices';
import * as productsApi from '../../api/syncedProducts';
import * as customersApi from '../../api/syncedCustomers';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';

const LIMIT = 20;
const DISCOUNT_TYPES = ['none', 'percent', 'flat'];
const STATUSES = ['paid', 'partial_paid', 'pending', 'cancelled'];

export default function InvoicesTab({ shopId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const query = useQuery({
    queryKey: ['invoices', shopId, search, page],
    queryFn: () => invoicesApi.listInvoices(shopId, { search, page, limit: LIMIT }),
  });

  const editingInvoiceQuery = useQuery({
    queryKey: ['invoice', shopId, editingId],
    queryFn: () => invoicesApi.getInvoice(shopId, editingId),
    enabled: !!editingId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoices', shopId] });

  const createMutation = useMutation({
    mutationFn: (data) => invoicesApi.createInvoice(shopId, data),
    onSuccess: () => {
      invalidate();
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => invoicesApi.updateInvoice(shopId, editingId, data),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => invoicesApi.deleteInvoice(shopId, id),
    onSuccess: () => {
      invalidate();
      setConfirmDeleteId(null);
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search invoice #, customer…"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          New invoice
        </button>
      </div>

      {query.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}

      {query.data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {query.data.items.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2.5 text-gray-600">{inv.customerName}</td>
                  <td className="px-4 py-2.5 text-gray-700">₹{inv.grandTotal}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(inv.localCreatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    <button
                      onClick={() => setEditingId(inv.id)}
                      className="mr-3 text-purple-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(inv.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {query.data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} limit={LIMIT} total={query.data.total} onPageChange={setPage} />
        </div>
      )}

      {showCreate && (
        <InvoiceFormModal
          shopId={shopId}
          invoice={null}
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          submitting={createMutation.isPending}
          error={createMutation.error}
        />
      )}

      {editingId && editingInvoiceQuery.data && (
        <InvoiceFormModal
          shopId={shopId}
          invoice={editingInvoiceQuery.data}
          onClose={() => setEditingId(null)}
          onSubmit={(data) => updateMutation.mutate(data)}
          submitting={updateMutation.isPending}
          error={updateMutation.error}
        />
      )}

      {confirmDeleteId && (
        <Modal title="Delete invoice?" onClose={() => setConfirmDeleteId(null)}>
          <p className="mb-4 text-sm text-gray-600">
            This will also remove it from the shop's phone the next time it syncs. This cannot
            be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function emptyRow() {
  return { productId: '', productName: '', quantity: 1, sellingPrice: 0, gstRate: 0 };
}

function InvoiceFormModal({ shopId, invoice, onClose, onSubmit, submitting, error }) {
  const productsQuery = useQuery({
    queryKey: ['products', shopId, 'all-for-invoice'],
    queryFn: () => productsApi.listProducts(shopId, { limit: 200 }),
  });
  const customersQuery = useQuery({
    queryKey: ['customers', shopId, 'all-for-invoice'],
    queryFn: () => customersApi.listCustomers(shopId, { limit: 200 }),
  });

  const [customerId, setCustomerId] = useState(invoice?.localCustomerId ?? '');
  const [customerName, setCustomerName] = useState(invoice?.customerName ?? 'Walk-in Customer');
  const [paymentMode, setPaymentMode] = useState(invoice?.paymentMode ?? 'cash');
  const [status, setStatus] = useState(invoice?.status ?? 'paid');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [discountType, setDiscountType] = useState(invoice?.discountType ?? 'none');
  const [discountValue, setDiscountValue] = useState(invoice?.discountValue ?? 0);
  const [receivedAmount, setReceivedAmount] = useState(invoice?.receivedAmount ?? '');
  const [rows, setRows] = useState(
    invoice?.items?.length
      ? invoice.items.map((i) => ({
          productId: i.localProductId,
          productName: i.productName,
          quantity: i.quantity,
          sellingPrice: i.sellingPrice,
          gstRate: i.gstRate,
        }))
      : [emptyRow()]
  );

  function updateRow(index, patch) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleProductSelect(index, productId) {
    const product = productsQuery.data?.items.find((p) => p.localId === Number(productId));
    updateRow(index, {
      productId,
      productName: product?.name ?? '',
      sellingPrice: product?.sellingPrice ?? 0,
      gstRate: product?.gstRate ?? 0,
    });
  }

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }

  function removeRow(index) {
    setRows((r) => r.filter((_, i) => i !== index));
  }

  // Live preview using the same math the backend applies.
  const computedRows = rows.map((r) => {
    const lineTotal = Number(r.quantity || 0) * Number(r.sellingPrice || 0);
    const gstAmount = (lineTotal * Number(r.gstRate || 0)) / 100;
    return { ...r, lineTotal, gstAmount };
  });
  const subtotal = computedRows.reduce((sum, r) => sum + r.lineTotal, 0);
  const gstAmount = computedRows.reduce((sum, r) => sum + r.gstAmount, 0);
  const discountAmount =
    discountType === 'percent' ? (subtotal * Number(discountValue || 0)) / 100 : Number(discountValue || 0);
  const grandTotal = subtotal + gstAmount - discountAmount;

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      customerId: customerId ? Number(customerId) : null,
      customerName,
      paymentMode,
      status,
      notes: notes || null,
      discountType,
      discountValue: Number(discountValue || 0),
      receivedAmount: receivedAmount === '' ? grandTotal : Number(receivedAmount),
      items: rows
        .filter((r) => r.productId)
        .map((r) => ({
          productId: Number(r.productId),
          productName: r.productName,
          quantity: Number(r.quantity),
          sellingPrice: Number(r.sellingPrice),
          gstRate: Number(r.gstRate || 0),
        })),
    });
  }

  return (
    <Modal title={invoice ? 'Edit invoice' : 'New invoice'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Customer</span>
            <select
              value={customerId}
              onChange={(e) => {
                const id = e.target.value;
                setCustomerId(id);
                const c = customersQuery.data?.items.find((x) => x.localId === Number(id));
                if (c) setCustomerName(c.name);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Walk-in / none</option>
              {customersQuery.data?.items.map((c) => (
                <option key={c.localId} value={c.localId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Items</span>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-end gap-2 rounded-md bg-gray-50 p-2">
                <select
                  value={row.productId}
                  onChange={(e) => handleProductSelect(i, e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Select product…</option>
                  {productsQuery.data?.items.map((p) => (
                    <option key={p.localId} value={p.localId}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, { quantity: e.target.value })}
                  className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  title="Quantity"
                />
                <input
                  type="number"
                  step="0.01"
                  value={row.sellingPrice}
                  onChange={(e) => updateRow(i, { sellingPrice: e.target.value })}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  title="Price"
                />
                <span className="w-20 text-right text-sm text-gray-600">
                  ₹{(Number(row.quantity || 0) * Number(row.sellingPrice || 0)).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 text-sm text-purple-700 hover:underline"
          >
            + Add line
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Payment mode</span>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {['cash', 'upi', 'card', 'credit'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Discount type</span>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {DISCOUNT_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Discount value"
            type="number"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
          <Field
            label="Received amount"
            type="number"
            step="0.01"
            placeholder={grandTotal.toFixed(2)}
            value={receivedAmount}
            onChange={(e) => setReceivedAmount(e.target.value)}
          />
        </div>

        <Field label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="rounded-md bg-gray-50 p-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>GST</span>
            <span>₹{gstAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Discount</span>
            <span>−₹{discountAmount.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900">
            <span>Grand total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || rows.every((r) => !r.productId)}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : invoice ? 'Save changes' : 'Create invoice'}
        </button>
      </form>
    </Modal>
  );
}

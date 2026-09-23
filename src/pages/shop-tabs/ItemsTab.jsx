import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as productsApi from '../../api/syncedProducts';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import { useToast } from '../../components/ToastContext';

const LIMIT = 20;

export default function ProductsTab({ shopId }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = create, {...} = edit
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const query = useQuery({
    queryKey: ['products', shopId, search, page],
    queryFn: () => productsApi.listProducts(shopId, { search, page, limit: LIMIT }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products', shopId] });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? productsApi.updateProduct(shopId, id, data) : productsApi.createProduct(shopId, data),
    onSuccess: (_, { id }) => {
      invalidate();
      setModalProduct(null);
      toast.success(id ? 'Product updated' : 'Product created');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.deleteProduct(shopId, id),
    onSuccess: () => {
      invalidate();
      setConfirmDeleteId(null);
      toast.success('Product deleted');
    },
    onError: (err) => toast.error(err.message),
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
          placeholder="Search name, SKU, barcode…"
        />
        <button
          onClick={() => setModalProduct({})}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          New product
        </button>
      </div>

      {query.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}

      {query.data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5"></th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Price</th>
                <th className="px-4 py-2.5">Stock</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {query.data.items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-gray-100" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{p.sku ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{p.category ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">₹{p.sellingPrice}</td>
                  <td className="px-4 py-2.5 text-gray-700">{p.stockQuantity}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {p.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    <button
                      onClick={() => setModalProduct(p)}
                      className="mr-3 text-purple-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {query.data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} limit={LIMIT} total={query.data.total} onPageChange={setPage} />
        </div>
      )}

      {modalProduct && (
        <ProductFormModal
          shopId={shopId}
          product={modalProduct.id ? modalProduct : null}
          onClose={() => setModalProduct(null)}
          onSubmit={(data) => saveMutation.mutate({ id: modalProduct.id, data })}
          submitting={saveMutation.isPending}
          error={saveMutation.error}
          onImageChanged={invalidate}
        />
      )}

      {confirmDeleteId && (
        <Modal title="Delete product?" onClose={() => setConfirmDeleteId(null)}>
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

function ProductFormModal({ shopId, product, onClose, onSubmit, submitting, error, onImageChanged }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    category: product?.category ?? '',
    costPrice: product?.costPrice ?? 0,
    sellingPrice: product?.sellingPrice ?? 0,
    gstRate: product?.gstRate ?? 5,
    stockQuantity: product?.stockQuantity ?? 0,
    reorderLevel: product?.reorderLevel ?? 10,
    isActive: product?.isActive ?? true,
  });
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState(null);

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !product?.id) return;
    setImageBusy(true);
    setImageError(null);
    try {
      const updated = await productsApi.uploadProductImage(shopId, product.id, file);
      setImageUrl(updated.imageUrl);
      onImageChanged?.();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setImageBusy(false);
    }
  }

  async function handleImageRemove() {
    if (!product?.id) return;
    setImageBusy(true);
    setImageError(null);
    try {
      await productsApi.deleteProductImage(shopId, product.id);
      setImageUrl(null);
      onImageChanged?.();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setImageBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      sku: form.sku || null,
      barcode: form.barcode || null,
      category: form.category || null,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      gstRate: Number(form.gstRate),
      stockQuantity: Number(form.stockQuantity),
      reorderLevel: Number(form.reorderLevel),
    });
  }

  return (
    <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        {product && (
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-16 w-16 rounded border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400">
                No image
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="cursor-pointer text-xs font-medium text-purple-700 hover:underline">
                {imageBusy ? 'Working…' : imageUrl ? 'Replace image' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={imageBusy}
                  onChange={handleImageChange}
                />
              </label>
              {imageUrl && !imageBusy && (
                <button
                  type="button"
                  onClick={handleImageRemove}
                  className="text-left text-xs text-red-600 hover:underline"
                >
                  Remove image
                </button>
              )}
              {imageError && <span className="text-xs text-red-600">{imageError}</span>}
            </div>
          </div>
        )}
        <Field label="Name" value={form.name} onChange={handleChange('name')} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU" value={form.sku} onChange={handleChange('sku')} />
          <Field label="Category" value={form.category} onChange={handleChange('category')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Cost price"
            type="number"
            step="0.01"
            value={form.costPrice}
            onChange={handleChange('costPrice')}
          />
          <Field
            label="Selling price"
            type="number"
            step="0.01"
            value={form.sellingPrice}
            onChange={handleChange('sellingPrice')}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="GST %"
            type="number"
            step="0.01"
            value={form.gstRate}
            onChange={handleChange('gstRate')}
          />
          <Field
            label="Stock qty"
            type="number"
            value={form.stockQuantity}
            onChange={handleChange('stockQuantity')}
          />
          <Field
            label="Reorder level"
            type="number"
            value={form.reorderLevel}
            onChange={handleChange('reorderLevel')}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Active
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
      </form>
    </Modal>
  );
}

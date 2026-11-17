import type { InsuranceProduct } from '../types'
import { nowISO } from '../lib/dates'
import { uid } from '../lib/id'
import { commit, requirePermission, store } from './store'
import { diffObjects, makeAudit } from './audit'

export type ProductInput = Omit<InsuranceProduct, 'id' | 'createdAt' | 'updatedAt' | 'archived'>

function validate(input: ProductInput) {
  if (!input.name.trim() || input.name.trim().length < 3) throw new Error('El nombre del seguro es obligatorio.')
  if (!input.shortDescription.trim()) throw new Error('Escribe una descripción corta para el catálogo.')
  if (!input.description.trim() || input.description.trim().length < 20) {
    throw new Error('La descripción debe tener al menos 20 caracteres.')
  }
  if (!Number.isFinite(input.basePrice) || input.basePrice <= 0) {
    throw new Error('El precio debe ser mayor que cero.')
  }
  if (!input.durationMonths || input.durationMonths < 1) throw new Error('La duración debe ser de al menos un mes.')
  if (!input.modalities.length) throw new Error('Debes configurar al menos una modalidad de pago.')
  for (const m of input.modalities) {
    if (!m.label.trim()) throw new Error('Cada modalidad necesita un nombre.')
    if (m.installments < 1) throw new Error('Cada modalidad necesita al menos una cuota.')
  }
  if (!input.coverage.length) throw new Error('Agrega al menos una cobertura.')
  if (!input.benefits.length) throw new Error('Agrega al menos un beneficio.')
}

export async function saveProduct(input: ProductInput, id?: string): Promise<InsuranceProduct> {
  const state = store.getState()
  const actor = requirePermission(state, 'insurances.manage')
  validate(input)
  const now = nowISO()

  if (id) {
    const current = state.products.find((p) => p.id === id)
    if (!current) throw new Error('El seguro no existe.')
    const updated: InsuranceProduct = { ...current, ...input, updatedAt: now }
    const diff = diffObjects(
      {
        name: current.name,
        basePrice: current.basePrice,
        active: current.active,
        featured: current.featured,
        modalities: current.modalities,
        description: current.description,
      },
      {
        name: updated.name,
        basePrice: updated.basePrice,
        active: updated.active,
        featured: updated.featured,
        modalities: updated.modalities,
        description: updated.description,
      },
    )
    const audit = makeAudit(
      actor,
      'insurance.update',
      'Seguro',
      id,
      `Actualizó el seguro ${updated.name}.`,
      diff.before,
      diff.after,
    )
    await commit(['products', 'audit'], async (tx) => {
      await tx.put('products', updated)
      await tx.put('audit', audit)
    })
    await store.refresh()
    return updated
  }

  const product: InsuranceProduct = {
    ...input,
    id: uid('prod'),
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
  const audit = makeAudit(
    actor,
    'insurance.create',
    'Seguro',
    product.id,
    `Creó el seguro ${product.name}.`,
    undefined,
    { name: product.name, price: product.basePrice },
  )
  await commit(['products', 'audit'], async (tx) => {
    await tx.put('products', product)
    await tx.put('audit', audit)
  })
  await store.refresh()
  return product
}

export async function setProductAvailability(
  id: string,
  patch: { active?: boolean; archived?: boolean; featured?: boolean },
): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'insurances.manage')
  const current = state.products.find((p) => p.id === id)
  if (!current) throw new Error('El seguro no existe.')
  const updated: InsuranceProduct = { ...current, ...patch, updatedAt: nowISO() }
  const action = patch.archived ? 'insurance.archive' : 'insurance.update'
  const description = patch.archived
    ? `Archivó el seguro ${current.name}.`
    : `Cambió la disponibilidad de ${current.name}.`
  const audit = makeAudit(actor, action, 'Seguro', id, description, {
    active: current.active,
    archived: current.archived,
    featured: current.featured,
  }, {
    active: updated.active,
    archived: updated.archived,
    featured: updated.featured,
  })
  await commit(['products', 'audit'], async (tx) => {
    await tx.put('products', updated)
    await tx.put('audit', audit)
  })
  await store.refresh()
}

export async function deleteProduct(id: string): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'insurances.manage')
  const product = state.products.find((p) => p.id === id)
  if (!product) throw new Error('El seguro no existe.')
  const hasPolicies = state.policies.some((p) => p.productId === id)
  if (hasPolicies) {
    throw new Error(
      'Este seguro ya tiene pólizas contratadas. Archívalo para retirarlo del catálogo sin afectar a los clientes.',
    )
  }
  const audit = makeAudit(
    actor,
    'insurance.delete',
    'Seguro',
    id,
    `Eliminó el seguro ${product.name}.`,
    { name: product.name, price: product.basePrice },
  )
  await commit(['products', 'audit'], async (tx) => {
    await tx.remove('products', id)
    await tx.put('audit', audit)
  })
  await store.refresh()
}

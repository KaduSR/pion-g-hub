export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export const formatDateTime = (isoStr) => {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export const formatPhone = (value) => {
  if (!value) return ''
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2)  return `(${digits}`
  if (digits.length <= 6)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}

export const formatEmail = (value) => value?.toLowerCase().trim() || ''

export const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const truncate = (str, max = 40) =>
  str && str.length > max ? str.slice(0, max) + '…' : str || '—'

export const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const k = item[key] || 'Não informado'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

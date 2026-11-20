// Cliente HTTP para la API de Spring Boot
const BASE_URL = 'http://localhost:8080/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // Arma un mensaje legible a partir del ErrorResponse del backend
    let msg = data?.mensaje || data?.error || `Error ${res.status}`
    if (data?.detalles) {
      msg += ': ' + Object.values(data.detalles).join(', ')
    }
    throw new Error(msg)
  }
  return data
}

export const productosApi = {
  listar: () => request('/productos'),
  obtener: (id) => request(`/productos/${id}`),
  crear: (producto) => request('/productos', { method: 'POST', body: JSON.stringify(producto) }),
  actualizar: (id, producto) => request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(producto) }),
  eliminar: (id) => request(`/productos/${id}`, { method: 'DELETE' }),
}

export const ventasApi = {
  listar: () => request('/ventas'),
  obtener: (id) => request(`/ventas/${id}`),
  crear: (venta) => request('/ventas', { method: 'POST', body: JSON.stringify(venta) }),
  actualizar: (id, venta) => request(`/ventas/${id}`, { method: 'PUT', body: JSON.stringify(venta) }),
  eliminar: (id) => request(`/ventas/${id}`, { method: 'DELETE' }),
}

export const dinero = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

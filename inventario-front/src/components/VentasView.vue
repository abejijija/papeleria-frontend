<script setup>
import { ref, computed, onMounted } from 'vue'
import { productosApi, ventasApi, dinero } from '../api'

const productos = ref([])
const ventas = ref([])
const mensaje = ref(null) // { tipo: 'ok' | 'error', texto }

// Ticket actual
const ticket = ref([]) // [{ productoId, nombre, precio, cantidad }]
const editandoId = ref(null)
const originales = ref({}) // cantidades de la venta que se está editando (para calcular disponible)

const total = computed(() => ticket.value.reduce((s, i) => s + i.precio * i.cantidad, 0))
const piezas = computed(() => ticket.value.reduce((s, i) => s + i.cantidad, 0))

function avisar(tipo, texto) {
  mensaje.value = { tipo, texto }
  setTimeout(() => (mensaje.value = null), 4000)
}

// Stock que todavía se puede agregar al ticket
function disponible(p) {
  const enTicket = ticket.value.find((i) => i.productoId === p.id)?.cantidad ?? 0
  const devuelto = originales.value[p.id] ?? 0
  return p.stock + devuelto - enTicket
}

async function cargar() {
  try {
    const [p, v] = await Promise.all([productosApi.listar(), ventasApi.listar()])
    productos.value = p
    ventas.value = v
  } catch (e) {
    avisar('error', 'No se pudo conectar con la API: ' + e.message)
  }
}

function agregar(p) {
  if (disponible(p) <= 0) return
  const linea = ticket.value.find((i) => i.productoId === p.id)
  if (linea) linea.cantidad++
  else ticket.value.push({ productoId: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: 1 })
}

function sumar(linea) {
  const p = productos.value.find((x) => x.id === linea.productoId)
  if (!p || disponible(p) > 0) linea.cantidad++
}

function restar(linea) {
  linea.cantidad--
  if (linea.cantidad <= 0) ticket.value = ticket.value.filter((i) => i !== linea)
}

function vaciar() {
  ticket.value = []
  editandoId.value = null
  originales.value = {}
}

function editar(v) {
  editandoId.value = v.id
  originales.value = Object.fromEntries(v.productos.map((d) => [d.productoId, d.cantidad]))
  ticket.value = v.productos.map((d) => ({
    productoId: d.productoId,
    nombre: d.nombreProducto,
    precio: Number(d.precioUnitario),
    cantidad: d.cantidad,
  }))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function cobrar() {
  const body = { productos: ticket.value.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })) }
  try {
    if (editandoId.value) {
      await ventasApi.actualizar(editandoId.value, body)
      avisar('ok', `Venta #${editandoId.value} actualizada`)
    } else {
      const v = await ventasApi.crear(body)
      avisar('ok', `Venta #${v.id} registrada por ${dinero(v.total)}`)
    }
    vaciar()
    await cargar() // stock e historial actualizados
  } catch (e) {
    avisar('error', e.message)
  }
}

async function eliminar(v) {
  if (!confirm(`¿Cancelar la venta #${v.id}? El stock regresará al inventario.`)) return
  try {
    await ventasApi.eliminar(v.id)
    avisar('ok', `Venta #${v.id} cancelada, stock devuelto`)
    if (editandoId.value === v.id) vaciar()
    await cargar()
  } catch (e) {
    avisar('error', e.message)
  }
}

const fecha = (f) =>
  new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

onMounted(cargar)
</script>

<template>
  <header class="encabezado">
    <div>
      <h1>Punto de venta</h1>
      <p class="sub">Toca un producto para agregarlo al ticket</p>
    </div>
  </header>

  <p v-if="mensaje" class="aviso" :class="mensaje.tipo">{{ mensaje.texto }}</p>

  <div class="pos">
    <!-- Catálogo -->
    <section class="catalogo">
      <button
        v-for="p in productos"
        :key="p.id"
        class="producto"
        :disabled="disponible(p) <= 0"
        @click="agregar(p)"
      >
        <span class="nombre">{{ p.nombre }}</span>
        <span class="precio">{{ dinero(p.precio) }}</span>
        <span class="stock">{{ disponible(p) > 0 ? `Quedan ${disponible(p)}` : 'Sin stock' }}</span>
      </button>
      <p v-if="productos.length === 0" class="vacio">No hay productos registrados</p>
    </section>

    <!-- Ticket -->
    <aside class="ticket">
      <h2>{{ editandoId ? `Editando venta #${editandoId}` : 'Ticket' }}</h2>

      <ul v-if="ticket.length" class="lineas">
        <li v-for="linea in ticket" :key="linea.productoId">
          <div>
            <span class="nombre">{{ linea.nombre }}</span>
            <small>{{ dinero(linea.precio) }} c/u</small>
          </div>
          <div class="contador">
            <button @click="restar(linea)">−</button>
            <span>{{ linea.cantidad }}</span>
            <button @click="sumar(linea)">+</button>
          </div>
          <span class="importe">{{ dinero(linea.precio * linea.cantidad) }}</span>
        </li>
      </ul>
      <p v-else class="vacio">El ticket está vacío</p>

      <div class="total">
        <span>Total · {{ piezas }} pzas</span>
        <strong>{{ dinero(total) }}</strong>
      </div>

      <button class="btn principal grande" :disabled="!ticket.length" @click="cobrar">
        {{ editandoId ? 'Guardar cambios' : 'Cobrar' }}
      </button>
      <button v-if="ticket.length || editandoId" class="btn" @click="vaciar">
        {{ editandoId ? 'Cancelar edición' : 'Vaciar ticket' }}
      </button>
    </aside>
  </div>

  <!-- Historial -->
  <section class="historial">
    <h2>Historial de ventas</h2>
    <p v-if="ventas.length === 0" class="vacio">Todavía no hay ventas</p>

    <details v-for="v in ventas" :key="v.id" class="venta">
      <summary>
        <span class="folio">#{{ v.id }}</span>
        <span class="fecha">{{ fecha(v.fecha) }}</span>
        <span class="resumen">{{ v.productos.length }} producto(s)</span>
        <strong>{{ dinero(v.total) }}</strong>
      </summary>

      <table>
        <thead>
          <tr><th>Producto vendido</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in v.productos" :key="d.productoId">
            <td>{{ d.nombreProducto }}</td>
            <td>{{ d.cantidad }}</td>
            <td>{{ dinero(d.precioUnitario) }}</td>
            <td>{{ dinero(d.subtotal) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="venta-acciones">
        <button class="btn" @click="editar(v)">Editar</button>
        <button class="btn texto-peligro" @click="eliminar(v)">Cancelar venta</button>
      </div>
    </details>
  </section>
</template>

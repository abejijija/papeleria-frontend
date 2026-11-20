<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { productosApi, dinero } from '../api'

const productos = ref([])
const busqueda = ref('')
const mensaje = ref(null) // { tipo: 'ok' | 'error', texto }

// Modal de alta / edición
const modalAbierto = ref(false)
const editandoId = ref(null)
const form = reactive({ nombre: '', precio: '', stock: '' })
const errorForm = ref('')

const filtrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return q ? productos.value.filter((p) => p.nombre.toLowerCase().includes(q)) : productos.value
})

function avisar(tipo, texto) {
  mensaje.value = { tipo, texto }
  setTimeout(() => (mensaje.value = null), 3500)
}

function nivelStock(stock) {
  if (stock === 0) return 'agotado'
  if (stock <= 5) return 'bajo'
  return 'ok'
}

async function cargar() {
  try {
    productos.value = await productosApi.listar()
  } catch (e) {
    avisar('error', 'No se pudo conectar con la API: ' + e.message)
  }
}

function abrirNuevo() {
  editandoId.value = null
  Object.assign(form, { nombre: '', precio: '', stock: '' })
  errorForm.value = ''
  modalAbierto.value = true
}

function abrirEditar(p) {
  editandoId.value = p.id
  Object.assign(form, { nombre: p.nombre, precio: p.precio, stock: p.stock })
  errorForm.value = ''
  modalAbierto.value = true
}

async function guardar() {
  errorForm.value = ''
  const datos = {
    nombre: form.nombre,
    precio: form.precio === '' ? null : Number(form.precio),
    stock: form.stock === '' ? null : Number(form.stock),
  }
  try {
    if (editandoId.value) {
      await productosApi.actualizar(editandoId.value, datos)
      avisar('ok', 'Producto actualizado')
    } else {
      await productosApi.crear(datos)
      avisar('ok', 'Producto agregado')
    }
    modalAbierto.value = false
    await cargar()
  } catch (e) {
    errorForm.value = e.message // el error se queda dentro del modal
  }
}

async function eliminar(p) {
  if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
  try {
    await productosApi.eliminar(p.id)
    avisar('ok', 'Producto eliminado')
    await cargar()
  } catch (e) {
    avisar('error', e.message)
  }
}

onMounted(cargar)
</script>

<template>
  <header class="encabezado">
    <div>
      <h1>Productos</h1>
      <p class="sub">{{ productos.length }} productos en catálogo</p>
    </div>
    <button class="btn principal" @click="abrirNuevo">+ Nuevo producto</button>
  </header>

  <p v-if="mensaje" class="aviso" :class="mensaje.tipo">{{ mensaje.texto }}</p>

  <input v-model="busqueda" class="buscador" placeholder="Buscar producto..." />

  <div class="rejilla">
    <article v-for="p in filtrados" :key="p.id" class="tarjeta">
      <div class="tarjeta-top">
        <span class="id">#{{ p.id }}</span>
        <span class="chip" :class="nivelStock(p.stock)">
          {{ p.stock === 0 ? 'Agotado' : `${p.stock} en stock` }}
        </span>
      </div>
      <h3>{{ p.nombre }}</h3>
      <p class="precio">{{ dinero(p.precio) }}</p>
      <div class="tarjeta-acciones">
        <button class="btn" @click="abrirEditar(p)">Editar</button>
        <button class="btn texto-peligro" @click="eliminar(p)">Eliminar</button>
      </div>
    </article>
  </div>

  <p v-if="filtrados.length === 0" class="vacio">
    {{ busqueda ? 'Ningún producto coincide con la búsqueda' : 'Todavía no hay productos' }}
  </p>

  <!-- Modal -->
  <div v-if="modalAbierto" class="fondo-modal" @click.self="modalAbierto = false">
    <form class="modal" @submit.prevent="guardar">
      <h2>{{ editandoId ? 'Editar producto' : 'Nuevo producto' }}</h2>

      <label>
        Nombre
        <input v-model="form.nombre" placeholder="Cuaderno profesional" autofocus />
      </label>
      <div class="dos-columnas">
        <label>
          Precio (MXN)
          <input v-model="form.precio" type="number" step="0.01" placeholder="45.50" />
        </label>
        <label>
          Stock
          <input v-model="form.stock" type="number" step="1" placeholder="60" />
        </label>
      </div>

      <p v-if="errorForm" class="aviso error">{{ errorForm }}</p>

      <div class="modal-acciones">
        <button type="button" class="btn" @click="modalAbierto = false">Cancelar</button>
        <button type="submit" class="btn principal">Guardar</button>
      </div>
    </form>
  </div>
</template>

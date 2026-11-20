<script setup>
import { ref } from 'vue'
import ProductosView from './components/ProductosView.vue'
import VentasView from './components/VentasView.vue'

const vista = ref('ventas')
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="marca">
        <span class="logo">✎</span>
        <div>
          <strong>Papelería</strong>
          <small>Control de inventario</small>
        </div>
      </div>

      <nav class="menu">
        <button :class="{ activo: vista === 'ventas' }" @click="vista = 'ventas'">
          <span class="icono">🛒</span> Punto de venta
        </button>
        <button :class="{ activo: vista === 'productos' }" @click="vista = 'productos'">
          <span class="icono">📦</span> Productos
        </button>
      </nav>
    </aside>

    <main class="pagina">
      <!-- Cada vez que cambias de sección se recargan los datos (stock al día) -->
      <VentasView v-if="vista === 'ventas'" />
      <ProductosView v-else />
    </main>
  </div>
</template>

# 🚀 Plan de Unificación: Central de Gestión D-LI

Este documento detalla la estrategia para centralizar toda la administración de la Heladería en un solo lugar, mejorando la eficiencia sin poner en riesgo lo que ya funciona.

## 🎯 Objetivos Principales
1.  **Centralización:** Unificar `Management.tsx` (Insumos/Personal) e `Inventory.tsx` (Productos).
2.  **Sistema de Recetas:** Permitir que cada helado sepa qué insumos consume.
3.  **Seguridad:** No alterar la lógica de Firebase ni los flujos de compra actuales.

---

## 🛠️ Fases de la Implementación

### Fase 1: Nueva Estructura de Navegación
*   Modificar el diseño de la página de **Gestión** para usar pestañas (Tabs) superiores.
*   Grupos: `[Inventario]` (Insumos + Productos), `[Equipo]` (Personal), `[Operación]` (Mesas + Gastos).

### Fase 2: El Cerebro del Inventario (Recetas)
*   Integrar el listado de productos en la gestión.
*   Añadir el botón **"Configurar Receta"** en cada producto.
*   Crear la interfaz para elegir insumos y cantidades por producto.

### Fase 3: Descuento Automático en Ventas
*   Vincular el botón de "Cobrar" con el sistema de recetas.
*   Cada vez que se venda algo, el sistema restará del stock el insumo correspondiente.

---

## 🛡️ Garantía de Continuidad
> [!IMPORTANT]
> **Tu trabajo está a salvo:**
> *   No se borrará ningún dato de Firestore.
> *   Los modales de compras y personal seguirán funcionando igual.
> *   Las reglas de seguridad se mantienen intactas.

---

## 📋 ¿Cómo empezamos? (Fase 1)
1.  **Refactorizar Management.tsx:** Añadir la nueva pestaña de "Productos".
2.  **Mover Lógica:** Traer la visualización de `Inventory.tsx` al nuevo panel.

---
**¿Me das el "OK" para iniciar con la Fase 1?**

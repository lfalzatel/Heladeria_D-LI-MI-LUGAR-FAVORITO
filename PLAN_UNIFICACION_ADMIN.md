# 🚀 Plan de Unificación: Central de Gestión D-LI

Este documento detalla la estrategia para centralizar toda la administración de la Heladería en un solo lugar, mejorando la eficiencia sin poner en riesgo lo que ya funciona.

## 🎯 Objetivos Principales
1.  **Centralización:** Unificar `Management.tsx` (Insumos/Personal) e `Inventory.tsx` (Productos).
2.  **Sistema de Recetas:** Permitir que cada helado sepa qué insumos consume.
3.  **Seguridad:** No alterar la lógica de Firebase ni los flujos de compra actuales.

---

## 🛠️ Fases de la Implementación

### Fase 1: Nueva Estructura de Navegación (COMPLETADO ✅)
*   Se refactorizó `Management.tsx` para usar pestañas superiores:
    *   **Inventario:** Insumos (Catálogo), Productos y Sabores.
    *   **Equipo:** Gestión de usuarios y sus historiales.
    *   **Operación:** Compras e Historial, Gastos Local (próximamente) y Mesas (próximamente).
*   Se redirigió la ruta `/admin/inventory` a la nueva ubicación.
*   Se eliminaron enlaces redundantes en sidebar y menús.

### Fase 2: El Cerebro del Inventario (Recetas) (SIGUIENTE PASO 🕒)
*   Añadir el botón **"Configurar Receta"** en el modal de edición de productos.
*   Crear la interfaz para elegir insumos y cantidades (porciones) por producto.
*   Calcular el costo de producción sugerido basado en los insumos vinculados.

### Fase 3: Descuento Automático en Ventas
*   Vincular el botón de "Entregar Pedido" con el sistema de recetas.
*   Cada vez que se venda algo, el sistema restará del stock el insumo correspondiente automáticamente.

### Fase 4: Operación Extendida (Gastos y Mesas)
*   **Gastos Local:** Formulario para registrar arriendo, servicios, etc. (Egresos que no son de inventario).
*   **Mesas:** Mapa visual del local para ver disponibilidad y asignar pedidos in-situ.

---

## 🛡️ Garantía de Continuidad
> [!IMPORTANT]
> **Tu trabajo está a salvo:**
> *   No se borró ningún dato de Firestore.
> *   Los modales de compras y personal siguen funcionando igual.
> *   La lógica de negocio se mantiene intacta, solo se movió de "casa".

---

**Última actualización:** 29 de Abril, 2026.

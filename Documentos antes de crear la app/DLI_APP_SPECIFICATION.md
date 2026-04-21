# 🍦 ESPECIFICACIÓN COMPLETA: SISTEMA D'LI — MI LUGAR FAVORITO

> **Documento de referencia para desarrollo de la aplicación de gestión integral para la heladería D'LI.**
> Basado en la carta física, inventario real de insumos y arquitectura probada de VentaÁgil.

---

## 📋 RESUMEN EJECUTIVO

**D'LI App** es una **PWA Full-Stack** para gestión de ventas, pedidos por mesa, inventario de insumos y contabilidad de la heladería D'LI — Mi Lugar Favorito. Permite a los **vendedores** tomar pedidos de manera guiada (con selección de sabores, tamaños y adiciones), y a los **administradores** controlar compras de insumos, ver reportes y gestionar la operación completa.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Firebase (Firestore + Auth + Storage) + Zustand + Tailwind CSS 4

**Paleta de colores:**
- **Primario:** `#E91E8C` (Rosa Fucsia D'LI - Botones, realces, estados activos)
- **Contenedor Primario:** `#FFB6C1` (Rosa Claro - Fondos suaves, hover states)
- **Superficie:** `#FFF0F5` (Rosa Lavanda - Fondo general de la app)
- **Contraste (On Surface):** `#2D2D2D` (Gris Oscuro - Títulos y cuerpos de texto)
- **Énfasis (Outline):** `#F06292` (Rosa Medio - Bordes y separadores)

**Tipografía:**
- **Headline:** `Outfit` (Para títulos y métricas)
- **Body:** `Inter` (Para textos generales y datos)
- **Brand:** `Playball` (Para el logo "D" y eslóganes)

---

## 👥 ROLES Y CREDENCIALES DE PRUEBA

| Rol | Email | Contraseña | Acceso |
|-----|-------|-----------|--------|
| Administrador | `admin@dli.com` | `Admin123#` | Acceso total: POS + Administración |
| Vendedor | `vendedor@dli.com` | `Vendedor123#` | Solo POS (tomar pedidos, ver mesas) |

> **Nota:** Crear estos usuarios en Firebase Authentication y en Firestore con la colección `users` antes de comenzar pruebas. Ver sección "Seed de datos iniciales".

---

## 🗂️ ESTRUCTURA DE RUTAS

```
/                        → Splash + redirect automático por rol
/login                   → Inicio de sesión
/pos                     → POS de ventas (vendedor + admin)
/admin/dashboard         → Panel principal (solo admin)
/admin/inventory         → Gestión de productos del menú (solo admin)
/admin/supplies          → Gestión de insumos y compras (solo admin)
/admin/reports           → Reportes y exportación (solo admin)
/admin/tables            → Estado de las 3 mesas (solo admin)
/admin/seed              → Carga inicial de datos
```

---

## 1. 🔐 AUTENTICACIÓN — `/login`

- Email + cuenta de Google (Firebase Auth + Google OAuth)
- Splash screen premium:
  - Fondo orgánico con blur.
  - Logo "D" central rotado (3deg) con sombra proyectada.
  - Barra de progreso fluida (70% en carga, 100% al finalizar).
  - Tagline animado: "Mi Lugar Favorito" (Playball italic).
- Sincronización automática de `role` desde Firestore.
- Redirección automática por rol.
- RoleGuard y persistencia de sesión.

---

## 2. ✨ EXPERIENCIA DE USUARIO Y ANIMACIONES

La aplicación utiliza un sistema de diseño "Premium & Fluid" basado en micro-animaciones para mejorar la interacción.

### 2.1 Animaciones Globales (CSS + Motion/React)
- **Nav Item Active Pop:** Al seleccionar un ítem en el menú inferior, este realiza un efecto de escala (0.8 -> 1.2 -> 1.1) con `cubic-bezier` y el icono comienza un `micro-bounce` infinito.
- **Glassmorphism:** Paneles con fondo `rgba(255, 255, 255, 0.7)`, `backdrop-blur(12px)` y bordes semi-transparentes.
- **Progress Loading:** Barras de estado con gradientes animados `translateX`.
- **Modales:** Transiciones de escala y opacidad con efecto "Spring" (stiffness: 300, damping: 25).

### 2.2 Componentes Identitarios

#### AppHeader (Header Unificado)
- **Sticky Glass:** Se mantiene fijo al scroll con efecto de desenfoque.
- **Logo Mobile:** Cubo rosa rotado con la letra "D" en fuente Playball blanca.
- **Buscador (Desktop):** Input minimalista en `surface-container` con icono de búsqueda.
- **Campana de Notificaciones:** Animada para llamar la atención sobre nuevos pedidos o alertas.

#### Cápsula de Perfil (Trigger del Menú)
- **Trigger Compacto:** Píldora con borde `white/20` y fondo glass.
- **Avatar:** Imagen circular con borde fucsia y un "punto de rol" (verde para admin, púrpura propietario, azul vendedor, rosa cliente).
- **Nombre:** Muestra solo el primer nombre en fuente `black/extra-bold`.
- **Chevron:** Indicador de apertura con rotación de 180°.

#### UserMenu (Menú Desplegable)
- **Diseño Card:** Aparece con una animación de rebote desde el header.
- **Secciones:**
  - **Card de Usuario:** Nombre completo, email y badge de rol con diseño envolvente.
  - **Ajustes:** Toggle de notificaciones tipo "pill" y acceso a perfil.
  - **Opciones de App:** Botones para instalar PWA y compartir por WhatsApp.
  - **Theme Switcher:** Selector de 3 botones (Claro/Oscuro/Sistema) con iconos integrados.
  - **Cerrar Sesión:** Estilo "danger" con fondo rosa pastel al hover.

#### BottomNav (Navegación Flotante)
- **Layout:** Barra flotante (96% ancho) con bordes ultra-redondeados.
- **Estados:** Los ítems activos se resaltan con un fondo fucsia y el texto en blanco, activando la animación `active-pop`.

---

## 3. 🍦 POS — SISTEMA DE PEDIDOS — `/pos`

Esta es la pantalla principal para vendedores. El flujo de toma de pedido es **guiado en pasos**, ya que los productos de la heladería requieren personalización (sabores, tamaños, adiciones).

### 2.1 Layout General

```
[Header: Logo D'LI + nombre vendedor + turno actual]
[Selector de mesa: Mesa 1 | Mesa 2 | Mesa 3 | Sin mesa (para llevar)]
[Área izquierda: Catálogo de productos por categoría]
[Área derecha: Carrito activo de la mesa seleccionada]
[Botón: Cobrar pedido]
```

### 2.2 Selector de Mesa

- **3 mesas físicas + opción "Para llevar"**
- Cada mesa tiene su propio carrito independiente (persistente en Zustand)
- Indicador visual del estado:
  - 🟢 Verde: Mesa libre
  - 🟡 Amarillo: Mesa con pedido activo
  - 🔴 Rojo: Mesa esperando pago
- Al seleccionar una mesa con pedido activo, carga ese carrito automáticamente

### 2.3 Catálogo de Productos (por categoría)

Pestañas de categorías:

| Categoría | Productos |
|-----------|-----------|
| Helados | Cono/Vaso, Cucurucho, Conchita |
| Ensalada de Frutas | Mini, Pequeña, Mediana, Grande |
| Copas | Copa D'LI, Copa Explosión, Copa de Salpicón (Mango/Fresa) |
| Vaso Salpicón | Pequeño, Mediano, Grande |
| Obleas | Oblea Tradicional, Oblea Cuchareable |
| Adiciones | Queso, Fruta, Helado, Chantilly, Chips, Salsa, Barquillo, Cono/Cucurucho |

Cada producto muestra: nombre, precio en COP, imagen ilustrativa (opcional, desde Firebase Storage).

### 2.4 Flujo Guiado de Configuración de Pedido (OrderConfigModal)

Al tocar un producto, se abre un modal con los pasos específicos de ese producto:

---

#### PRODUCTO: Helado (Cono/Vaso, Cucurucho, Conchita)

**Paso 1 — Presentación:**
- [Cono o Vaso] / [Cucurucho] / [Conchita]

**Paso 2 — Tamaño / Cantidad de bolas:**
- Sencillo (1 bola) / Doble (2 bolas) / Triple (3 bolas) ← Triple solo para Cucurucho y Conchita

**Paso 3 — Selección de sabores (Mimo's):**
- Selector de sabores igual al número de bolas elegidas
- Lista de sabores disponibles (mostrar tachados los que estén sin stock):
  Fresa, Chicle, Brownie, Vainilla, Arequipe, Maracuyá, Chocolate, Mandarina, Nata Maní, Ron Pasas, Mango Biche, Frutos Rojos, Vainilla Chips, Vainilla Pasas, Veteado de Mora, Veteado de Caramelo

**Precio resultante automático:**
- Cono/Vaso Sencillo: $3.500 | Doble: $5.500
- Cucurucho Sencillo: $4.000 | Doble: $6.000 | Triple: $8.000
- Conchita Sencilla: $4.500 | Doble: $6.500 | Triple: $8.500

---

#### PRODUCTO: Ensalada de Frutas

**Componentes fijos** (mostrar al vendedor como recordatorio):
Manzana, mango, fresa, banano, papaya, uvas, kiwi, queso, dos sabores de helado, crema, lechera y barquillo

**Paso 1 — Tamaño:**
- Mini (1 sabor): $10.000
- Pequeña: $17.000
- Mediana: $22.000
- Grande: $27.000

**Paso 2 — Selección de sabores de helado:**
- Mini: 1 sabor
- Pequeña/Mediana/Grande: 2 sabores

---

#### PRODUCTO: Copa de Salpicón

**Paso 1 — Sabor del salpicón:**
- Sabor a Mango ($11.000) → Lleva: Banano, Papaya, Mango
- Sabor a Fresa ($11.000) → Lleva: Banano, Papaya, Fresa

**Paso 2 — Sabor de helado:** (1 sabor incluido)
Seleccionar de la lista de sabores Mimo's

**Componentes mostrados:** Frutas seleccionadas + queso + 1 helado + lechera + barquillo

---

#### PRODUCTO: Vaso de Salpicón con Helado

**Paso 1 — Tamaño:**
- Pequeño: $7.000
- Mediano: $9.000
- Grande: $11.000

**Paso 2 — Sabor de helado:** 1 sabor de la lista Mimo's

**Componentes:** Frutas + helado + lechera + barquillo

---

#### PRODUCTO: Copa D'LI

**Precio fijo:** $13.000
**Componentes fijos** (recordatorio): Arequipe, 3 sabores de helado, queso, chantilly y cucurucho

**Paso 1 — Selección de 3 sabores de helado**

---

#### PRODUCTO: Copa Explosión de Sabores

**Precio fijo:** $16.000
**Componentes fijos** (recordatorio): Arequipe, 7 sabores de helado, chantilly y barquillo

**Paso 1 — Selección de 7 sabores de helado**

---

#### PRODUCTO: Oblea Tradicional

**Paso 1 — Tipo:**
- Arequipe, crema y queso: $6.000
- Arequipe, crema, queso y fruta: $9.000

**Paso 2 (solo si lleva fruta) — Selección de fruta:**
Fresa / Mango / Durazno

---

#### PRODUCTO: Oblea Cuchareable

**Componentes fijos:** Trozos de oblea, arequipe, queso, crema, fruta seleccionada y chantilly

**Paso 1 — ¿Con helado?**
- Sin helado: $13.000
- Con helado: $15.000

**Paso 2 — Fruta:**
Fresa / Mango / Durazno

**Paso 3 (solo si lleva helado) — Sabor de helado:**
Seleccionar 1 sabor de la lista Mimo's

---

#### ADICIONES (productos adicionales que se agregan al carrito)

No requieren configuración extra, se agregan directamente:

| Adición | Precio |
|---------|--------|
| Queso | $4.000 |
| Fruta | $3.500 |
| Helado (bola) | $3.000 |
| Chantilly | $4.000 |
| Chips de chocolate | $3.000 |
| Salsa | $1.000 |
| Barquillo | $500 |
| Cono o Cucurucho | $1.000 |

---

### 2.5 Carrito Activo

- Lista de items configurados con descripción completa (ej: "Cucurucho Triple — Fresa, Brownie, Arequipe")
- Subtotal por ítem
- Total del pedido en COP
- Botón "+" y "−" para cambiar cantidad
- Botón 🗑️ para eliminar ítem
- Nota opcional del pedido (texto libre)

### 2.6 Cobro del Pedido (CheckoutModal)

Al presionar "Cobrar":

**Resumen del pedido:**
- Lista de items con precios
- Total a pagar

**Método de pago:**
- Efectivo 💵
- Transferencia (Nequi/Daviplata) 📱
- Tarjeta 💳

**Si es Efectivo:**
- Campo "Recibido" para calcular cambio automáticamente
- Mostrar: "Cambio: $X.XXX"

**Al confirmar:**
1. Crear documento en colección `sales` (transacción atómica)
2. Descontar unidades de insumos afectados (si está configurado el rendimiento)
3. Marcar mesa como libre
4. Limpiar carrito de esa mesa
5. Mostrar comprobante de venta (modal con opción de imprimir ticket o copiar)
6. Notificación push al admin (FCM)

---

## 3. 🖥️ PANEL ADMINISTRATIVO

### 3.1 Dashboard — `/admin/dashboard`

**Tarjetas de estadísticas en tiempo real:**

| Métrica | Detalle |
|---------|---------|
| Ventas del día | Total en COP + cantidad de transacciones |
| Ventas de la semana | Comparativa con semana anterior |
| Ventas del mes | Total acumulado |
| Método de pago | Efectivo / Transferencia / Tarjeta (donuts o barras) |
| Producto más vendido | Nombre + cantidad vendida hoy |
| Mesa más activa | Número de mesa + total generado |

**Filtro de período:** Hoy / 7 días / 30 días / Rango personalizado

**Gráfico de línea/barras** (Recharts): Ventas por día en el período seleccionado

**Últimas 10 ventas:** Tabla con Hora, Mesa, Vendedor, Ítem(s), Total, Método de pago

**Estado de mesas en tiempo real:** Mini-panel con las 3 mesas y su estado actual

**Alertas de insumos críticos:** Lista de insumos con stock por debajo del mínimo configurado

---

### 3.2 Gestión de Insumos y Compras — `/admin/supplies`

Esta sección es **exclusiva para administradores** y maneja los insumos (materias primas) que son completamente distintos de los productos del menú.

#### 3.2.1 Catálogo de Insumos

Lista completa de insumos (pre-cargada con el inventario real de D'LI):

**Frutas y Lácteos:**
Queso, Mango, Fresa, Uva, Durazno, Banano, Papaya, Kiwi, Manzana, Mora, Crema de Leche (Ensaladas), Crema de Leche (Oblea Cuchareable), Lechera, Arequipe, Chocolate

**Helados Mimo's (por tina/unidad):**
Helado Fresa, Chicle, Brownie, Vainilla, Arequipe, Maracuyá, Chocolate, Mandarina, Nata Maní, Ron Pasas, Mango Biche, Frutos Rojos, Vainilla Chips, Vainilla Pasas, Veteado de Mora, Veteado de Caramelo

**Presentaciones y Desechables:**
Cucuruchos, Conchitas, Conos, Obleas Gruesas, Obleas Delgadas, Barquillos, Vasos 7 oz, Vasos 10 oz, Vasos 13 oz, Vasos 16 oz, Tapas Vaso 13/14/16 oz, Tapas Vaso 7 oz, Tapas Vaso 9/10/12 oz, Desechable Pequeño, Desechable Ens. Pequeña, Desechable Ens. Mediana/Grande, Recipiente Oblea Cuchareable, Tapa Recipiente Oblea Cuchareable, Bolsa Metalizada Oblea

**Otros Insumos:**
Maní, Bolitas de Colores, Chips de Chocolate, Servilletas Mesa, Servilletas Conos, Salero, Azúcar Pulverizada, Polvo Fresa, Polvo Mango, Fresca (Fresa/Mango), Leche en Polvo, Balas Chantillera

**Limpieza y Empaque:**
Bolsas Blanca Pequeña, Bolsa Blanca Grande, Bolsa Basura Negra, Bolsa Basura Verde, Bolsa Basura Pequeña, Guantes de Nitrilo, Guantes Amarillos (Loza), Limpido, Jabón de Loza, Jabón de Manos, Jabón en Polvo, Alcohol, Vinagre, Rollo Caja Registradora, Cuchara Grande, Cuchara Pequeña

#### 3.2.2 Ficha de cada Insumo (SupplyModal)

Campos configurables por el administrador:

```
Nombre del insumo
Categoría (Frutas/Lácteos, Helados, Presentaciones, Limpieza, etc.)
Unidad de compra: (Ej: "Tina", "Caja", "Bolsa", "Kilo", "Unidad", "Rollo")
Precio de compra (última compra en COP)
Stock actual (en unidades de compra)
Stock mínimo de alerta
Rendimiento por unidad de compra:
  - Ej: "1 Tina de Helado = 80 bolas"
  - Ej: "1 Kilo de Queso = 20 porciones"
  - Ej: "1 Mango = 3 porciones"
  - (Este campo es OPCIONAL, el admin lo configura según su experiencia)
Unidad de consumo: (Ej: "bola", "porción", "unidad")
Notas internas
```

> **Lógica de rendimiento:** Si el administrador configura que 1 tina = 80 bolas, el sistema puede calcular cuántas bolas quedan disponibles al vender. Si no está configurado, solo lleva conteo de unidades de compra.

#### 3.2.3 Registro de Compras de Insumos (PurchaseModal)

Al registrar una nueva compra:

1. **Proveedor** (texto libre o seleccionar de lista guardada)
2. **Fecha de compra**
3. **Lista de insumos comprados:**
   - Seleccionar insumo del catálogo
   - Cantidad comprada (en unidades de compra)
   - Precio unitario de compra
   - Subtotal automático
4. **Total de la compra** (calculado automáticamente)
5. **Método de pago:** Efectivo / Transferencia / Crédito (fiar al proveedor)
6. **Notas opcionales**
7. **Al guardar:** Actualiza stock de cada insumo automáticamente

**Historial de compras:** Tabla paginada con filtros por proveedor, fecha y estado. Exportable a CSV.

---

### 3.3 Inventario de Productos del Menú — `/admin/inventory`

Aunque los precios de los productos son relativamente fijos, el admin puede:

- Ver el catálogo completo con sus precios
- Activar/desactivar productos temporalmente (ej: si un sabor se agota)
- Editar precio de un producto
- Gestionar qué sabores de helado están disponibles (checkbox por sabor)
- Subir imagen de cada producto (Firebase Storage)

**Sección especial: Disponibilidad de Sabores**

Panel dedicado para marcar qué sabores de helado Mimo's están disponibles en este momento. Los sabores marcados como no disponibles aparecen tachados y no se pueden seleccionar en el POS.

---

### 3.4 Reportes y Exportación — `/admin/reports`

#### Filtros de período:
- Hoy
- Esta semana (lun–dom)
- Semana pasada
- Este mes
- Mes pasado
- Rango personalizado (calendario)

#### Vistas de reporte:

**Reporte de Ventas:**
Tabla con: ID, Fecha, Hora, Mesa/Para llevar, Vendedor, Items, Total, Método de pago

**Reporte por Producto:**
Qué productos se vendieron más, ingresos por categoría

**Reporte de Compras:**
Historial de insumos comprados: Fecha, Proveedor, Items, Total

**Resumen Contable (P&G simple):**
- Total ingresos del período
- Total gasto en insumos del período
- Utilidad estimada = Ingresos − Gastos
- Desglose por método de pago

#### Exportación:
- **Botón "Descargar CSV"** — Genera archivo con UTF-8 BOM para Excel correcto con tildes
  - `reporte_ventas_DLI_{filtro}_{fecha}.csv`
  - `reporte_compras_DLI_{filtro}_{fecha}.csv`
- **Botón "Descargar PDF"** — Reporte formateado con logo D'LI (jsPDF + autotable)

---

### 3.5 Gestión de Mesas — Vista en Dashboard o Tab en POS

- Vista rápida de las 3 mesas
- Estado: Libre / Ocupada / Esperando pago
- Ver el pedido activo de cada mesa
- Opción de transferir pedido entre mesas
- Tiempo en mesa desde que se abrió el pedido

---

## 4. 💾 ESTRUCTURA FIRESTORE

```
users/
├── {uid}
│   ├── email: string
│   ├── role: "admin" | "propietario" | "vendedor"
│   ├── name: string
│   ├── fcmTokens: string[]
│   └── createdAt: Timestamp

products/ ← Productos del menú (lo que se vende)
├── {id}
│   ├── name: string         // "Cucurucho Triple"
│   ├── category: string     // "helados" | "ensaladas" | "copas" | "salpicon" | "obleas" | "adiciones"
│   ├── basePrice: number    // precio base en COP
│   ├── variants: [          // para productos con tamaños/cantidades
│   │   { label: "Sencillo", price: 4000, scoops: 1 },
│   │   { label: "Doble", price: 6000, scoops: 2 },
│   │   { label: "Triple", price: 8000, scoops: 3 }
│   │ ]
│   ├── requiresFlavors: boolean      // true si requiere selección de sabores
│   ├── requiresFruitChoice: boolean  // true para obleas y salpicones
│   ├── isActive: boolean
│   ├── imageUrl: string (opcional)
│   └── updatedAt: Timestamp

icecreamFlavors/
├── {id}
│   ├── name: string        // "Fresa", "Brownie", etc.
│   ├── isAvailable: boolean
│   └── updatedAt: Timestamp

supplies/ ← Insumos (lo que se compra, no se vende)
├── {id}
│   ├── name: string
│   ├── category: string    // "frutas", "helados", "presentaciones", "limpieza", etc.
│   ├── purchaseUnit: string  // "tina", "kilo", "caja", "unidad"
│   ├── lastPurchasePrice: number
│   ├── stockQuantity: number  // en unidades de compra
│   ├── stockMinimum: number
│   ├── yieldPerUnit: number | null   // rendimiento (ej: 80 bolas por tina)
│   ├── consumptionUnit: string | null  // "bola", "porción", etc.
│   ├── notes: string
│   └── updatedAt: Timestamp

sales/
├── {id}
│   ├── tableNumber: number | null   // 1, 2, 3 ó null = para llevar
│   ├── items: [
│   │   {
│   │     productId: string,
│   │     productName: string,      // "Cucurucho Triple"
│   │     description: string,      // "Fresa, Brownie, Arequipe"
│   │     variant: string,          // "Triple"
│   │     flavors: string[],        // ["Fresa", "Brownie", "Arequipe"]
│   │     fruitChoice: string,      // para salpicones/obleas
│   │     additions: string[],      // adiciones agregadas
│   │     quantity: number,
│   │     unitPrice: number,
│   │     subtotal: number
│   │   }
│   │ ]
│   ├── total: number
│   ├── paymentMethod: "Efectivo" | "Transferencia" | "Tarjeta"
│   ├── cashReceived: number | null    // si fue efectivo
│   ├── change: number | null          // cambio calculado
│   ├── note: string
│   ├── soldBy: uid                    // vendedor
│   ├── soldByName: string
│   ├── createdAt: Timestamp
│   └── status: "completed" | "cancelled"

tables/
├── "1" | "2" | "3"  ← documentos fijos
│   ├── status: "free" | "occupied" | "waiting_payment"
│   ├── openedAt: Timestamp | null
│   └── currentCartSnapshot: object | null  // snapshot del carrito activo

supplyPurchases/ ← Compras de insumos
├── {id}
│   ├── provider: string
│   ├── purchaseDate: Timestamp
│   ├── items: [
│   │   {
│   │     supplyId: string,
│   │     supplyName: string,
│   │     quantity: number,
│   │     unitPrice: number,
│   │     subtotal: number
│   │   }
│   │ ]
│   ├── total: number
│   ├── paymentMethod: "Efectivo" | "Transferencia" | "Crédito"
│   ├── notes: string
│   ├── createdBy: uid
│   └── createdAt: Timestamp

notifications/
├── {id}
│   ├── recipientRole: "admin" | "propietario"
│   ├── title: string
│   ├── body: string
│   ├── type: "new_sale" | "low_stock"
│   ├── read: boolean
│   └── createdAt: Timestamp
```

---

## 5. 🧠 ESTADO GLOBAL (ZUSTAND)

### useAuthStore
```typescript
user: { uid, email, role, name }
isLoading: boolean
setUser(), setLoading()
```

### useTableCartStore *(PERSISTENTE)*
```typescript
// 4 carritos: mesa1, mesa2, mesa3, paraMesa
carts: {
  [tableKey: string]: {
    items: CartItem[],
    openedAt: Date | null,
    note: string
  }
}
activeTable: "mesa1" | "mesa2" | "mesa3" | "paraMesa"

// CartItem
{
  id: string,
  productId: string,
  productName: string,
  variant: string,
  description: string,      // descripción completa para mostrar
  flavors: string[],
  fruitChoice?: string,
  additions: string[],
  quantity: number,
  unitPrice: number,
  subtotal: number
}

setActiveTable(table)
addItem(table, item)
updateQuantity(table, itemId, qty)
removeItem(table, itemId)
clearCart(table)
getTotal(table): number
getItemCount(table): number
```

### useFlavorsStore
```typescript
availableFlavors: IceCreamFlavor[]
loadFlavors()   // escucha Firestore en tiempo real
```

### useSplashStore
```typescript
isVisible: boolean
message: string
progress: number
showSplash(), hideSplash()
```

---

## 6. 🎨 DISEÑO Y ESTILOS

### Identidad visual D'LI
- **Logo:** Letra "D" blanca en Playball sobre fondo fucsia rotado.
- **Gradiente:** `from-primary to-primary-container` (Fucsia a Rosa claro).
- **Fondos:** Uso de "Organic Blobs" y paneles de cristal (glass-panel) para separar contenido.
- **Sombras:** `shadow-2xl shadow-black/12` para modales y menús flotantes.

### Componentes de UI Premium
- **HeaderSearch:** Input estilizado que aparece solo en pantallas medianas.
- **PageTitle:** Título grande en Outfit Bold con subtítulo en mayúsculas espaciadas.
- **MetricCards:** Tarjetas con iconos en contenedores de color suave, tendencia histórica y fuente de métrica extra-negrita.

---

## 7. 💬 CHAT DE PEDIDOS Y SEGUIMIENTO

La app incluye una experiencia de comunicación en tiempo real para cada pedido.

### 7.1 Interfaz de Chat (ClientPedidos Interface)
- **Burbujas de Chat:** Diseño tipo "Messenger" con bordes asimétricos (esquinas redondeadas excepto la de origen).
- **Colores del Chat:** 
  - Mensajes del usuario: Fondo fucsia con texto blanco.
  - Mensajes del soporte: Fondo blanco con texto gris oscuro y borde fino.
- **Metadatos:** Nombre del emisor y hora exacta debajo de cada burbuja.
- **Input Footer:** Campo de texto fijado al fondo del modal con botón de envío animado (icono `Send`).

### 7.2 Detalle de Pedido Premium
- **Modal 90vh:** El detalle se abre en un modal tipo "sheet" que ocupa casi toda la altura.
- **Estatus Dinámico:** Tarjeta superior que cambia de color y mensaje según el estado (Pendiente: "¡Estamos revisando!", Aceptado: "¡Está en camino!").
- **Mapa de Entrega:** Badge con icono de MapPin y dirección en negrita.
- **Desglose de Productos:** Cards internas con detalles de sabores (formato itálico con puntos separadores) y cantidades.

---

## 8. 💾 ESTRUCTURA FIRESTORE

### Proceso de Venta Exitosa
```
1. Leer productos del carrito (validar que sigan activos)
2. Crear documento en `sales`
3. Actualizar `tables/{n}.status` → "free"
4. Si insumos tienen rendimiento configurado → descontar unidades consumidas de `supplies`
5. Verificar si algún insumo cayó por debajo del stock mínimo → crear notification
6. Enviar FCM a administradores: "Nueva venta — Mesa {n} — ${total}"
```

### Proceso de Compra de Insumos
```
1. Crear documento en `supplyPurchases`
2. Para cada ítem: actualizar supplies/{id}.stockQuantity += cantidad
3. Actualizar supplies/{id}.lastPurchasePrice
```

---

## 8. 📱 NOTIFICACIONES PUSH (FCM)

- **Nueva venta completada** → Notificación a administradores con mesa y total
- **Insumo en stock crítico** → Alerta al administrador con nombre del insumo
- Service Worker en `/public/firebase-messaging-sw.js`
- Solicitar permiso desde el panel de admin (botón en dashboard)

---

## 9. 📥 EXPORTACIONES

### CSV (UTF-8 BOM para Excel con tildes)
```
reporte_ventas_DLI_hoy_2026-04-18.csv
reporte_ventas_DLI_semana_2026-04-18.csv
reporte_ventas_DLI_mes_2026-04-18.csv
reporte_compras_insumos_DLI_mes_2026-04-18.csv
```

Columnas ventas: `ID, Fecha, Hora, Mesa, Vendedor, Items, Total, Método de Pago, Nota`

Columnas compras: `ID, Fecha, Proveedor, Insumo, Cantidad, Precio Unit., Subtotal, Total Compra, Método`

### PDF (jsPDF + autotable)
- Encabezado con logo D'LI
- Tabla de ventas o compras
- Resumen al pie: totales por método de pago, utilidad estimada

---

## 10. 🔐 FIRESTORE SECURITY RULES

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Solo usuarios autenticados
    function isAuth() { return request.auth != null; }
    function getRole() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isAdmin() { return getRole() in ["admin", "propietario"]; }
    function isVendedor() { return getRole() in ["admin", "propietario", "vendedor"]; }
    
    match /users/{uid} {
      allow read: if isAuth() && (request.auth.uid == uid || isAdmin());
      allow write: if isAdmin();
    }
    
    match /products/{id} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }
    
    match /icecreamFlavors/{id} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }
    
    match /supplies/{id} {
      allow read, write: if isAdmin();
    }
    
    match /sales/{id} {
      allow read: if isAdmin();
      allow create: if isVendedor();
      allow update, delete: if isAdmin();
    }
    
    match /tables/{id} {
      allow read: if isAuth();
      allow write: if isVendedor();
    }
    
    match /supplyPurchases/{id} {
      allow read, write: if isAdmin();
    }
    
    match /notifications/{id} {
      allow read: if isAdmin();
      allow write: if isAuth();
    }
  }
}
```

---

## 11. 🌱 SEED DE DATOS INICIALES — `/admin/seed`

Al ejecutar el seed, se carga en Firestore:

### Usuarios de prueba (crear manualmente en Firebase Auth + Firestore):

```json
[
  {
    "email": "admin@dli.com",
    "password": "Admin123#",
    "role": "admin",
    "name": "Administrador D'LI"
  },
  {
    "email": "vendedor@dli.com",
    "password": "Vendedor123#",
    "role": "vendedor",
    "name": "Vendedor D'LI"
  }
]
```

### Productos del menú (colección `products`):

```json
[
  { "name": "Cono o Vaso", "category": "helados", "variants": [
    {"label":"Sencillo","price":3500,"scoops":1},
    {"label":"Doble","price":5500,"scoops":2}
  ], "requiresFlavors": true, "isActive": true },

  { "name": "Cucurucho", "category": "helados", "variants": [
    {"label":"Sencillo","price":4000,"scoops":1},
    {"label":"Doble","price":6000,"scoops":2},
    {"label":"Triple","price":8000,"scoops":3}
  ], "requiresFlavors": true, "isActive": true },

  { "name": "Conchita", "category": "helados", "variants": [
    {"label":"Sencilla","price":4500,"scoops":1},
    {"label":"Doble","price":6500,"scoops":2},
    {"label":"Triple","price":8500,"scoops":3}
  ], "requiresFlavors": true, "isActive": true },

  { "name": "Ensalada de Frutas", "category": "ensaladas", "variants": [
    {"label":"Mini","price":10000,"scoops":1},
    {"label":"Pequeña","price":17000,"scoops":2},
    {"label":"Mediana","price":22000,"scoops":2},
    {"label":"Grande","price":27000,"scoops":2}
  ], "requiresFlavors": true, "isActive": true },

  { "name": "Copa de Salpicón", "category": "salpicon", "variants": [
    {"label":"Sabor Mango","price":11000,"fruits":["Banano","Papaya","Mango"]},
    {"label":"Sabor Fresa","price":11000,"fruits":["Banano","Papaya","Fresa"]}
  ], "requiresFlavors": true, "requiresFruitChoice": true, "isActive": true },

  { "name": "Vaso de Salpicón con Helado", "category": "salpicon", "variants": [
    {"label":"Pequeño","price":7000},
    {"label":"Mediano","price":9000},
    {"label":"Grande","price":11000}
  ], "requiresFlavors": true, "isActive": true },

  { "name": "Copa D'LI", "category": "copas", "basePrice": 13000, "requiresFlavors": true, "scoops": 3, "isActive": true },
  { "name": "Copa Explosión de Sabores", "category": "copas", "basePrice": 16000, "requiresFlavors": true, "scoops": 7, "isActive": true },

  { "name": "Oblea Tradicional", "category": "obleas", "variants": [
    {"label":"Arequipe, Crema y Queso","price":6000,"hasFruit":false},
    {"label":"Arequipe, Crema, Queso y Fruta","price":9000,"hasFruit":true}
  ], "requiresFruitChoice": true, "isActive": true },

  { "name": "Oblea Cuchareable", "category": "obleas", "variants": [
    {"label":"Sin Helado","price":13000,"hasIceCream":false},
    {"label":"Con Helado","price":15000,"hasIceCream":true}
  ], "requiresFruitChoice": true, "requiresFlavors": true, "isActive": true },

  { "name": "Adición Queso", "category": "adiciones", "basePrice": 4000, "isActive": true },
  { "name": "Adición Fruta", "category": "adiciones", "basePrice": 3500, "isActive": true },
  { "name": "Adición Helado", "category": "adiciones", "basePrice": 3000, "isActive": true },
  { "name": "Adición Chantilly", "category": "adiciones", "basePrice": 4000, "isActive": true },
  { "name": "Adición Chips de Chocolate", "category": "adiciones", "basePrice": 3000, "isActive": true },
  { "name": "Adición Salsa", "category": "adiciones", "basePrice": 1000, "isActive": true },
  { "name": "Adición Barquillo", "category": "adiciones", "basePrice": 500, "isActive": true },
  { "name": "Adición Cono/Cucurucho", "category": "adiciones", "basePrice": 1000, "isActive": true }
]
```

### Sabores de helado (colección `icecreamFlavors`):
```json
["Fresa", "Chicle", "Brownie", "Vainilla", "Arequipe", "Maracuyá", "Chocolate",
 "Mandarina", "Nata Maní", "Ron Pasas", "Mango Biche", "Frutos Rojos",
 "Vainilla Chips", "Vainilla Pasas", "Veteado de Mora", "Veteado de Caramelo"]
```
Todos con `isAvailable: true` al inicio.

### Mesas (colección `tables`):
```json
[
  {"id": "1", "status": "free", "openedAt": null, "currentCartSnapshot": null},
  {"id": "2", "status": "free", "openedAt": null, "currentCartSnapshot": null},
  {"id": "3", "status": "free", "openedAt": null, "currentCartSnapshot": null}
]
```

### Insumos (colección `supplies`) — Sample:
```json
[
  {"name":"Helado Fresa","category":"helados","purchaseUnit":"tina","stockQuantity":2,"stockMinimum":1,"yieldPerUnit":80,"consumptionUnit":"bola","lastPurchasePrice":null},
  {"name":"Queso","category":"frutas_lacteos","purchaseUnit":"kilo","stockQuantity":3,"stockMinimum":1,"yieldPerUnit":20,"consumptionUnit":"porción","lastPurchasePrice":null},
  {"name":"Cucuruchos","category":"presentaciones","purchaseUnit":"caja","stockQuantity":5,"stockMinimum":2,"yieldPerUnit":50,"consumptionUnit":"unidad","lastPurchasePrice":null}
  // ... resto del inventario
]
```

---

## 12. 📦 DEPENDENCIAS

```json
{
  "next": "16.x",
  "react": "19.x",
  "typescript": "5",
  "firebase": "^12.x",
  "firebase-admin": "^13.x",
  "zustand": "^5.x",
  "tailwindcss": "4",
  "lucide-react": "latest",
  "recharts": "^3.x",
  "jspdf": "^4.x",
  "jspdf-autotable": "^5.x",
  "next-pwa": "^5.6.0",
  "clsx": "^2.x",
  "tailwind-merge": "^3.x"
}
```

---

## 13. ✅ CHECKLIST DE FUNCIONALIDADES

### POS / Ventas
- [x] Selector de 4 destinos (Mesa 1, 2, 3, Para llevar)
- [x] Catálogo por categorías con tabs
- [x] OrderConfigModal con flujo guiado por pasos
- [x] Selección de variante (sencillo/doble/triple)
- [x] Selección de sabores de helado (igual al número de bolas)
- [x] Selección de fruta para salpicones/obleas
- [x] Adición de extras
- [x] Carrito por mesa independiente
- [x] CheckoutModal con métodos de pago
- [x] Cálculo automático de cambio (efectivo)
- [x] Transacción atómica Firestore al vender
- [x] Comprobante de venta en pantalla
- [x] FCM al admin al vender

### Admin — Dashboard
- [x] Stats de ventas (hoy/semana/mes)
- [x] Gráfico de tendencias (Recharts)
- [x] Últimas ventas
- [x] Estado de mesas en tiempo real
- [x] Alertas de stock crítico

### Admin — Inventario del Menú
- [x] Activar/desactivar productos
- [x] Editar precios
- [x] Gestión de disponibilidad de sabores Mimo's
- [x] Upload de imagen por producto

### Admin — Insumos
- [x] Catálogo de insumos con ficha completa
- [x] Campo de rendimiento por unidad (opcional)
- [x] Registro de compras a proveedor
- [x] Actualización automática de stock al comprar
- [x] Alertas de stock mínimo

### Admin — Reportes
- [x] Filtros: Hoy / Semana / Mes / Rango
- [x] Reporte de ventas (tabla + gráfico)
- [x] Reporte de compras de insumos
- [x] Resumen P&G estimado (ingresos − gastos)
- [x] Exportar CSV (ventas y compras)
- [x] Exportar PDF con logo D'LI

### PWA & UX
- [x] Splash screen premium rosa con logo D'LI
- [x] Instalable como PWA
- [x] Funciona offline (ver menú y carrito, sync al reconectar)
- [x] Notificaciones push FCM
- [x] Responsive mobile-first
- [x] Chat de pedidos en tiempo real

---

## 14. 🔄 DIFERENCIAS CLAVE VS. VENTAÁGIL

| Característica | VentaÁgil | D'LI App |
|----------------|-----------|---------|
| Configuración de pedido | Producto → carrito directo | Producto → modal guiado con pasos |
| Gestión de mesas | No tiene | 3 mesas físicas + para llevar |
| Sistema de crédito/deudores | Sí (complejo) | No aplica |
| Panel de cliente | Sí (cliente hace pedidos) | No aplica |
| Insumos vs. productos | Un solo catálogo | Dos catálogos separados |
| Rendimiento de insumos | No aplica | Configurable (tina=80 bolas) |
| Sabores como entidad propia | No aplica | Colección `icecreamFlavors` |
| Paleta de colores | Verde esmeralda | Rosa fucsia D'LI |
| Chat por pedido | No aplica | Incluido (Soporte en tiempo real) |

---

*Documento actualizado: Abril 21, 2026*
*Versión: 2.0 — Especificación detallada con UI/UX Premium y Chat*
*Referencia base: VentaÁgil APP_COMPLETE_SPECIFICATION.md*

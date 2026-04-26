# 🍦 ESPECIFICACIÓN COMPLETA: SISTEMA D'LI — MI LUGAR FAVORITO

> **Documento de referencia para desarrollo de la aplicación de gestión integral para la heladería D'LI.**
> Basado en la carta física, inventario real de insumos y arquitectura probada de VentaÁgil.

---

## 📋 RESUMEN EJECUTIVO

**D'LI App** es una **PWA Full-Stack** para gestión de ventas, pedidos por mesa, inventario de insumos y contabilidad de la heladería D'LI — Mi Lugar Favorito. Permite a los **vendedores** tomar pedidos de manera guiada (con selección de sabores, tamaños y adiciones), y a los **administradores** controlar compras de insumos, ver reportes y gestionar la operación completa.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Firebase (Firestore + Auth + Storage) + Zustand + Tailwind CSS 4

**Paleta de colores:** Rosa fucsia `#b30069`, Rosa medio `#df0e84`, Rosa claro `#FFB6C1`, Rosa muy claro `#ffd9e4`, Blanco `#FFFFFF`, Gris oscuro `#2D2D2D`

> ⚠️ **Nota de color:** Usar `#b30069` como `primary` (no `#E91E8C`). Este valor es el que usan los mockups HTML de referencia y es consistente con el sistema Material Design 3 definido en el Tailwind config.

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

- Email + contraseña (Firebase Auth)
- Sin registro público (solo admin puede crear usuarios)
- Splash screen con barra de progreso animada en rosa al cargar
- Al autenticar, sincroniza `role` desde Firestore (`users/{uid}.role`)
- Redirección automática:
  - `admin` / `propietario` → `/admin/dashboard`
  - `vendedor` → `/pos`
- RoleGuard en todas las rutas protegidas
- Middleware Next.js valida cookie `fb-session` en cada request

---

## 2. 🍦 POS — SISTEMA DE PEDIDOS — `/pos`

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
- **Logo:** Tipografía cursiva para "Mi Lugar Favorito", bold para "D`LI"
- **Colores principales:**
  - Fucsia: `#E91E8C` (botones primarios, headers, badges)
  - Rosa claro: `#FFB6C1` (fondos de cards, fondos de secciones)
  - Rosa muy claro: `#FFF0F5` (fondos de página)
  - Blanco: `#FFFFFF`
  - Gris oscuro: `#2D2D2D` (textos)
- **Gradiente característico:** `from-pink-500 to-rose-400`
- **Elementos decorativos:** Manchas orgánicas en esquinas (como en el menú físico)

### Componentes clave de UI

**ProductCard:** Card con imagen, nombre, precio desde, badge de categoría — animación scale al hover

**OrderConfigModal:** Modal de pantalla completa en mobile, modal centrado en desktop. Navegación por pasos con barra de progreso y botón "Volver"

**FlavorSelector:** Grid de chips con colores pastel, seleccionados = fucsia, no disponibles = gris tachado

**CartSummary:** Panel deslizable desde la derecha en mobile, panel fijo en desktop

**TableSelector:** 4 botones grandes (Mesa 1, Mesa 2, Mesa 3, 🥡 Para llevar) con indicador de color por estado

**CheckoutModal:** Resumen + selector de método de pago + campo de efectivo con cambio en tiempo real

**StatsCard:** Cards con gradiente rosa, cifra grande, icono y comparativa

### Responsividad
- Mobile-first (vendedores usan celular o tablet)
- Breakpoints: sm(640), md(768), lg(1024)
- En tablet/desktop el catálogo y el carrito se muestran lado a lado
- En mobile el carrito es un drawer deslizante desde abajo

---

## 7. 📊 TRANSACCIONES ATÓMICAS FIRESTORE

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

## 8. 📱 NOTIFICACIONES PUSH — IMPLEMENTACIÓN GRATUITA COMPLETA

### 8.1 Dos tipos de notificación

| Tipo | Descripción | Cuándo aparece |
|------|-------------|----------------|
| **Push Notification** | Aparece en la barra superior del celular con sonido y vibración, como WhatsApp o Facebook. Funciona aunque la app esté cerrada. | Siempre que el celular tenga internet |
| **In-App Notification** | Toast o banner interno que aparece solo mientras la app está abierta. Sin sonido si el celular está bloqueado. | Solo con la app en pantalla |

### 8.2 Estrategia 100% gratuita (sin Cloud Functions)

**El problema:** Firebase pide plan Blaze (pago) para usar Cloud Functions, que es la forma "oficial" de enviar push desde el servidor.

**La solución:** Usar **Next.js API Routes en Vercel** como servidor intermediario. Estas rutas llaman directamente a la API HTTP de FCM sin necesidad de Cloud Functions.

```
[Evento en la app]
       ↓
[Next.js API Route /api/notify]   ← corre en Vercel GRATIS
       ↓
[FCM API de Google]               ← GRATIS siempre
       ↓
[Celular del admin]               ← sonido + vibración
```

**Costo total: $0**

| Servicio | Plan | Costo |
|----------|------|-------|
| FCM (Firebase Cloud Messaging) | Spark (gratis) | $0 |
| Vercel API Routes | Hobby (gratis) | $0 |
| Firestore (guardar tokens FCM) | Spark (gratis) | $0 |
| Service Worker en el navegador | Nativo del browser | $0 |

### 8.3 Implementación paso a paso

#### PASO 1 — Activar FCM en Firebase Console
1. Firebase Console → Project Settings → Cloud Messaging
2. Copiar la **Server Key** (clave del servidor)
3. Copiar el **VAPID key** (para web push)
4. Agregar a las variables de entorno de Vercel:
```
FIREBASE_SERVER_KEY=AAAA...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN...
```

#### PASO 2 — Service Worker (`/public/firebase-messaging-sw.js`)
Este archivo corre en el navegador del celular y recibe notificaciones cuando la app está cerrada:

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-messaging-compat.js');

firebase.initializeApp({ /* config */ });
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    sound: 'default',
    data: payload.data
  });
});
```

#### PASO 3 — Solicitar permiso y guardar token (`/lib/notifications.ts`)

```typescript
export async function requestNotificationPermission(userId: string) {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    });
    // Guardar token en Firestore → users/{uid}.fcmTokens
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token)
    });
    return token;
  }
  throw new Error('Permiso denegado');
}
```

#### PASO 4 — API Route para enviar notificaciones (`/app/api/notify/route.ts`)
Esta ruta reemplaza completamente a Cloud Functions. Corre en Vercel gratis:

```typescript
export async function POST(req: NextRequest) {
  const { type, data } = await req.json();

  // Obtener tokens de todos los admins desde Firestore
  const usersSnap = await db.collection('users')
    .where('role', 'in', ['admin', 'propietario']).get();

  const tokens: string[] = [];
  usersSnap.forEach(doc => tokens.push(...(doc.data().fcmTokens || [])));

  const messages: Record<string, { title: string; body: string }> = {
    new_sale: {
      title: "🍦 Nueva venta — D'LI",
      body: `Mesa ${data.table} · $${data.total.toLocaleString('es-CO')} · ${data.paymentMethod}`
    },
    low_stock: {
      title: "⚠️ Stock crítico — D'LI",
      body: `${data.supplyName} está por debajo del mínimo`
    }
  };

  // Llamar a la API HTTP de FCM directamente (sin Cloud Functions)
  await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${process.env.FIREBASE_SERVER_KEY}`
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: messages[type],
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } }
    })
  });

  // Guardar en historial de notificaciones
  await db.collection('notifications').add({
    type, ...messages[type], data,
    recipientRole: 'admin', read: false, createdAt: new Date()
  });

  return NextResponse.json({ sent: tokens.length });
}
```

#### PASO 5 — Disparar desde la app

**Al completar venta:**
```typescript
await fetch('/api/notify', {
  method: 'POST',
  body: JSON.stringify({
    type: 'new_sale',
    data: { table: tableNumber ?? 'Para llevar', total: orderTotal, paymentMethod }
  })
});
```

**Al detectar stock crítico:**
```typescript
if (updatedStock <= supply.stockMinimum) {
  await fetch('/api/notify', {
    method: 'POST',
    body: JSON.stringify({
      type: 'low_stock',
      data: { supplyName: supply.name, currentStock: updatedStock }
    })
  });
}
```

### 8.4 Eventos que disparan notificaciones

| Evento | Destinatario | Ejemplo del mensaje |
|--------|-------------|-------------------|
| Venta completada | Admin / Propietario | "Mesa 2 · $27.000 · Efectivo" |
| Insumo en stock crítico | Admin / Propietario | "Queso crema está por debajo del mínimo" |

### 8.5 Consideraciones por plataforma

- **Android:** Funciona perfectamente con sonido y vibración en Chrome.
- **iPhone (iOS 16.4+):** Requiere que el usuario instale la PWA en la pantalla de inicio. Las notificaciones llegan con sonido. Comunicar esto al usuario al activar.
- **Tokens vencidos:** FCM devuelve error si un token ya no es válido. Implementar limpieza automática de tokens inválidos en Firestore.
- **Sin internet:** FCM acumula las notificaciones y las entrega cuando el celular recupere conexión.

### 8.6 Checklist de notificaciones

- [ ] `firebase-messaging-sw.js` creado en `/public`
- [ ] VAPID key y Server Key en variables de entorno Vercel
- [ ] `requestNotificationPermission` implementado
- [ ] Tokens guardados en `users/{uid}.fcmTokens`
- [ ] API Route `/api/notify` creada y probada
- [ ] Notificación de nueva venta con sonido y vibración
- [ ] Notificación de stock crítico funcionando
- [ ] Limpieza automática de tokens FCM inválidos
- [ ] Badge de notificaciones no leídas en header
- [ ] Panel de historial de notificaciones en dashboard
- [ ] Probado en Android (Chrome)
- [ ] Probado en iPhone (Safari, app instalada en pantalla de inicio)

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
- [ ] Selector de 4 destinos (Mesa 1, 2, 3, Para llevar)
- [ ] Catálogo por categorías con tabs
- [ ] OrderConfigModal con flujo guiado por pasos
- [ ] Selección de variante (sencillo/doble/triple)
- [ ] Selección de sabores de helado (igual al número de bolas)
- [ ] Selección de fruta para salpicones/obleas
- [ ] Adición de extras
- [ ] Carrito por mesa independiente
- [ ] CheckoutModal con métodos de pago
- [ ] Cálculo automático de cambio (efectivo)
- [ ] Transacción atómica Firestore al vender
- [ ] Comprobante de venta en pantalla
- [ ] FCM al admin al vender

### Admin — Dashboard
- [ ] Stats de ventas (hoy/semana/mes)
- [ ] Gráfico de tendencias (Recharts)
- [ ] Últimas ventas
- [ ] Estado de mesas en tiempo real
- [ ] Alertas de stock crítico

### Admin — Inventario del Menú
- [ ] Activar/desactivar productos
- [ ] Editar precios
- [ ] Gestión de disponibilidad de sabores Mimo's
- [ ] Upload de imagen por producto

### Admin — Insumos
- [ ] Catálogo de insumos con ficha completa
- [ ] Campo de rendimiento por unidad (opcional)
- [ ] Registro de compras a proveedor
- [ ] Actualización automática de stock al comprar
- [ ] Alertas de stock mínimo

### Admin — Reportes
- [ ] Filtros: Hoy / Semana / Mes / Rango
- [ ] Reporte de ventas (tabla + gráfico)
- [ ] Reporte de compras de insumos
- [ ] Resumen P&G estimado (ingresos − gastos)
- [ ] Exportar CSV (ventas y compras)
- [ ] Exportar PDF con logo D'LI

### PWA & UX
- [ ] Splash screen rosa con logo D'LI
- [ ] Instalable como PWA
- [ ] Funciona offline (ver menú y carrito, sync al reconectar)
- [ ] Notificaciones push FCM
- [ ] Responsive mobile-first

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
| Chat por pedido | Sí | No aplica |

---

*Documento generado: Abril 18, 2026*
*Versión: 2.0 — Actualizado Abril 25, 2026 con implementación real completa*
*Referencia base: VentaÁgil APP_COMPLETE_SPECIFICATION.md*

---

## 15. 🛠️ DIARIO DE IMPLEMENTACIÓN — ABRIL 25, 2026

> **Este capítulo documenta todo lo que se implementó, cada error encontrado y su solución exacta durante la sesión de desarrollo del 25 de abril de 2026. Sirve como guía de recuperación ante cualquier daño o pérdida.**

### 15.1 Stack real usado (difiere de la spec original)

La app se construyó con **Vite + React** (no Next.js como decía la spec original). Esto es importante porque cambia cómo funcionan las API Routes y el Service Worker.

| Elemento | Spec original | Implementación real |
|----------|--------------|-------------------|
| Framework | Next.js 16 | **Vite 6.4.2 + React** |
| API Routes | Next.js API Routes | **Vercel Serverless Functions** (`/api/`) |
| SW strategy | generateSW simple | **generateSW + SW Firebase dedicado** |
| Deploy | Vercel | **Vercel (conectado a GitHub)** |
| Repo | — | `github.com/lfalzatel/Heladeria_D-LI-MI-LUGAR-FAVORITO` |
| URL producción | — | `heladeria-d-li-mi-lugar-favorito.vercel.app` |
| Firebase proyecto | — | `ruta-comun-4fcaf` |

---

### 15.2 Estructura de archivos real del proyecto

```
proyecto/
├── public/
│   ├── firebase-messaging-sw.js     ← SW de Firebase (background notifications)
│   ├── notification-sound.mp3       ← Sonido personalizado in-app
│   ├── pwa-192x192.png             ← Ícono PWA requerido
│   ├── pwa-512x512.png             ← Ícono PWA requerido
│   ├── favicon.ico
│   └── apple-touch-icon.png
├── api/
│   └── notify.ts                    ← Vercel Serverless Function (envío FCM V1)
├── src/
│   ├── lib/
│   │   ├── firebase.ts              ← Configuración Firebase
│   │   └── notifications.ts        ← Lógica completa de notificaciones
│   ├── pages/
│   │   └── ClientPedidos.tsx       ← Chat cliente-admin con notificaciones
│   └── components/
│       └── UserMenu.tsx             ← Botón instalar PWA + toggle notificaciones
├── index.html                       ← Título y meta tags de D'LI
├── vite.config.ts                   ← Configuración VitePWA
└── .gitignore                       ← Incluye dev-dist/
```

---

### 15.3 Configuración Firebase (proyecto `ruta-comun-4fcaf`)

```json
{
  "projectId": "ruta-comun-4fcaf",
  "appId": "1:764541288248:web:266038ea513e8c13b98bcd",
  "apiKey": "AIzaSyAd8eXIrpn396YOsQwr4M99PaMRBlbse88",
  "authDomain": "ruta-comun-4fcaf.firebaseapp.com",
  "messagingSenderId": "764541288248",
  "storageBucket": "ruta-comun-4fcaf.firebasestorage.app"
}
```

**VAPID Key FCM:**
```
BD23yi5wkKcpl9rTRkvb4ownj-yxzeDF9w69eC7F2J6wNHWJTTy1qA90VU_hjS17VYW2nGX_2YJreL9ayxvaKak
```

**APIs activas en Firebase Console:**
- ✅ Firebase Cloud Messaging V1 — **HABILITADA**
- ❌ Cloud Messaging heredada — **INHABILITADA** (deprecada desde jun/2023)

> ⚠️ **CRÍTICO:** Usar siempre FCM HTTP API V1. La API heredada (`fcm.googleapis.com/fcm/send` con Server Key) ya no funciona. Ver sección 15.7.

---

### 15.4 Variables de entorno en Vercel

| Variable | Valor | Entornos |
|----------|-------|----------|
| `VITE_FIREBASE_VAPID_KEY` | El VAPID key de arriba | Production + Preview |
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo de Service Account | Production + Preview |
| `GEMINI_API_KEY` | Clave de Gemini (ya existía) | Production + Preview |
| `VITE_APP_URL` | URL de Vercel (ya existía) | Production + Preview |

Para obtener `FIREBASE_SERVICE_ACCOUNT`:
Firebase Console → ⚙️ Project Settings → Service accounts → **Generate new private key** → Descargar JSON → Pegar el contenido completo como valor de la variable.

---

### 15.5 `vite.config.ts` — configuración final

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'classic'    // ← CRÍTICO: sin esto falla importScripts en desarrollo
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: "D'LI Boutique — Mi Lugar Favorito",
        short_name: "D'LI",
        description: "Gestión integral para la heladería D'LI",
        theme_color: '#b30069',
        background_color: '#fcf9f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',    // ← REQUERIDO para que el navegador permita instalación
        scope: '/',        // ← REQUERIDO
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

---

### 15.6 `public/firebase-messaging-sw.js` — versión final

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAd8eXIrpn396YOsQwr4M99PaMRBlbse88",
  authDomain: "ruta-comun-4fcaf.firebaseapp.com",
  projectId: "ruta-comun-4fcaf",
  storageBucket: "ruta-comun-4fcaf.firebasestorage.app",
  messagingSenderId: "764541288248",
  appId: "1:764541288248:web:266038ea513e8c13b98bcd"
});

const messaging = firebase.messaging();

// Notificación cuando la app está CERRADA o en SEGUNDO PLANO
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en background:', payload);
  return self.registration.showNotification(
    payload.notification?.title || "D'LI Boutique", {
      body: payload.notification?.body || 'Nueva actualización disponible',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'dli-notification',
      renotify: true,
      data: payload.data || {}
    }
  );
});

// Al tocar la notificación → abrir/enfocar la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('heladeria-d-li') && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('https://heladeria-d-li-mi-lugar-favorito.vercel.app/');
      })
  );
});
```

---

### 15.7 `api/notify.ts` — Vercel Serverless Function (versión final)

> **Por qué existe este archivo:** Firebase exige plan Blaze (pago) para Cloud Functions. Esta función corre en Vercel gratuitamente y llama directamente a la FCM HTTP API V1.

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { tokens, title, body, data } = req.body;
  if (!tokens?.length) return res.json({ sent: 0 });

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });
    const accessToken = await auth.getAccessToken();
    const projectId = serviceAccount.project_id;

    const results = await Promise.allSettled(
      tokens.map((token: string) =>
        fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: data || {},
              android: { priority: 'high' },
              apns: { payload: { aps: { sound: 'default' } } }
            }
          })
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return res.json({ sent });
  } catch (error: any) {
    console.error('Error en /api/notify:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Dependencia requerida:**
```bash
npm install google-auth-library @vercel/node
```

---

### 15.8 `src/lib/notifications.ts` — versión final completa

```typescript
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  "BD23yi5wkKcpl9rTRkvb4ownj-yxzeDF9w69eC7F2J6wNHWJTTy1qA90VU_hjS17VYW2nGX_2YJreL9ayxvaKak";

// ─── ACTIVAR ──────────────────────────────────────────────────────────────────
export async function requestNotificationPermission(userId: string) {
  // FCM no funciona en localhost — saltar silenciosamente
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    toast.info('Notificaciones disponibles solo en producción (Vercel)');
    return null;
  }

  if (!('Notification' in window) || !(await isSupported())) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso denegado');

  const { app } = await import('./firebase');
  const messaging = getMessaging(app);

  // Registrar SW de Firebase con scope EXCLUSIVO — no choca con VitePWA (scope: '/')
  console.log("Registrando Service Worker de Firebase (scope dedicado)...");
  const fcmReg = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/firebase-cloud-messaging-push-scope' }
  );

  // Esperar que esté activo con timeout de seguridad
  await new Promise<void>((resolve) => {
    if (fcmReg.active) { resolve(); return; }
    const sw = fcmReg.installing || fcmReg.waiting;
    sw?.addEventListener('statechange', (e: any) => {
      if (e.target.state === 'activated') resolve();
    });
    setTimeout(resolve, 3000);
  });

  console.log("Service Worker listo en scope:", fcmReg.scope);

  // Limpiar token anterior
  try {
    console.log("Limpiando token antiguo...");
    await deleteToken(messaging);
  } catch (e) {
    console.warn("Error al borrar token antiguo (ignorable):", e);
  }

  console.log("Solicitando nuevo token FCM...");
  const currentToken = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: fcmReg  // ← SIEMPRE pasar el SW explícitamente
  });

  if (currentToken) {
    console.log("Token FCM obtenido con éxito");
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(currentToken)
    });
    return currentToken;
  }
  throw new Error('No se pudo obtener el token FCM');
}

// ─── DESACTIVAR ───────────────────────────────────────────────────────────────
export async function unregisterNotifications(userId: string) {
  if (window.location.hostname === 'localhost') return true;
  if (!(await isSupported())) return;

  const { app } = await import('./firebase');
  const messaging = getMessaging(app);

  const fcmReg = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/firebase-cloud-messaging-push-scope' }
  );

  const currentToken = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: fcmReg  // ← mismo patrón que al activar
  });

  if (currentToken) {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(currentToken)
    });
    await deleteToken(messaging);
    console.log('Notificaciones desactivadas y token eliminado');
  }
  return true;
}

// ─── ESCUCHAR CON APP ABIERTA ─────────────────────────────────────────────────
export async function listenToForegroundMessages() {
  if (!(await isSupported())) return;
  const { app } = await import('./firebase');
  const messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    // 1. Toast visual in-app (Sonner)
    toast.info(payload.notification?.title || 'Nueva notificación', {
      description: payload.notification?.body,
      duration: 5000,
    });

    // 2. Vibración táctil (volumen multimedia del móvil)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // 3. Sonido personalizado (volumen multimedia — limitación del navegador)
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch (_) {}

    // 4. Notificación nativa del sistema (aparece en barra desplegable)
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(swReg => {
        swReg.showNotification(payload.notification?.title || "D'LI Boutique", {
          body: payload.notification?.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          tag: 'dli-notification',
          renotify: true,
        });
      });
    }
  });
}

// ─── ENVIAR A ADMINS (llama a /api/notify en Vercel) ─────────────────────────
export async function notifyAdmins(title: string, body: string, data: any = {}) {
  const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'propietario']));
  const snapshot = await getDocs(q);

  const allTokens: string[] = [];
  snapshot.docs.forEach(d => {
    const tokens = d.data().fcmTokens || [];
    if (Array.isArray(tokens)) allTokens.push(...tokens);
  });

  const uniqueTokens = [...new Set(allTokens)];
  if (uniqueTokens.length === 0) {
    console.log('No hay tokens de administradores registrados');
    return { success: true, sent: 0 };
  }

  const response = await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens: uniqueTokens, title, body, data })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Error al llamar a /api/notify');
  }
  return response.json();
}
```

---

### 15.9 `index.html` — versión final

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#b30069" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="D'LI" />
    <link rel="apple-touch-icon" href="/pwa-192x192.png" />
    <title>D'LI Boutique — Mi Lugar Favorito</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

> ⚠️ El título inicial decía "VentaÁgil" porque el proyecto se originó como copia de esa app. Se corrigió en este archivo.

---

### 15.10 Notificaciones en `ClientPedidos.tsx`

La función `handleSendMessage` debía llamar a `notifyAdmins` cuando un cliente envía un mensaje. Agregar después de `setChatMessage('')`:

```typescript
// En handleSendMessage — después de guardar el mensaje en Firestore
if (!isStaff) {
  // Cliente le escribe al admin → notificar a admins
  const { notifyAdmins } = await import('../lib/notifications');
  await notifyAdmins(
    `💬 Mensaje de ${profile.name}`,
    `Pedido #${selectedPedido.id.slice(-6).toUpperCase()}: "${chatMessage.trim()}"`,
    {
      type: 'chat_message',
      pedidoId: selectedPedido.id,
      fromName: profile.name
    }
  );
}
```

---

### 15.11 `.gitignore` — agregar entradas faltantes

```
# Generado por VitePWA en desarrollo — NO subir al repo
dev-dist/
```

---

### 15.12 Errores encontrados y soluciones exactas

#### ❌ ERROR 1: `Subscription failed - no active Service Worker`
**Cuándo:** Al intentar activar notificaciones la primera vez.
**Causa:** El código llamaba `getToken()` sin pasar el Service Worker registrado.
**Solución:**
```typescript
// ❌ Antes (falla)
const token = await getToken(messaging, { vapidKey: VAPID_KEY });

// ✅ Después (funciona)
const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
  scope: '/firebase-cloud-messaging-push-scope'
});
const token = await getToken(messaging, {
  vapidKey: VAPID_KEY,
  serviceWorkerRegistration: reg  // ← siempre pasar el SW explícitamente
});
```

---

#### ❌ ERROR 2: `Module scripts don't support importScripts()`
**Cuándo:** Al cargar la app en desarrollo (localhost).
**Causa:** VitePWA genera el SW como módulo ES6 en dev, pero `firebase-messaging-sw.js` usa `importScripts()` que solo funciona en SW clásicos.
**Solución en `vite.config.ts`:**
```typescript
devOptions: {
  enabled: true,
  type: 'classic'  // ← esta línea soluciona el conflicto
}
```

---

#### ❌ ERROR 3: `navigator.serviceWorker.ready` — se quedaba colgado indefinidamente
**Cuándo:** Después de aplicar el fix del error 2.
**Causa:** El SW de VitePWA y el de Firebase competían por el scope `/`. VitePWA ganaba y Firebase nunca se activaba.
**Solución:** Usar scope exclusivo para Firebase:
```typescript
await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
  scope: '/firebase-cloud-messaging-push-scope'  // ← scope diferente = sin conflicto
});
```

---

#### ❌ ERROR 4: `Unable to find a place to inject the manifest`
**Cuándo:** Al hacer build en Vercel (error en deploy).
**Causa:** Se intentó usar `strategies: 'injectManifest'` en VitePWA pero el archivo `firebase-messaging-sw.js` no tenía `self.__WB_MANIFEST`.
**Solución:** No usar `injectManifest`. Volver a `generateSW` (estrategia por defecto de VitePWA) y manejar los dos SW con scopes separados.

---

#### ❌ ERROR 5: `Registration failed - push service error` en Vercel (HTTPS)
**Cuándo:** Al probar en producción con HTTPS — el error persistía.
**Causa:** `navigator.serviceWorker.ready` devuelve el SW de VitePWA (scope `/`), no el de Firebase. FCM rechaza ese SW porque no es el correcto.
**Solución:** Registrar explícitamente el SW de Firebase con su scope y pasarlo a `getToken`. No usar `navigator.serviceWorker.ready` para FCM.

---

#### ❌ ERROR 6: FCM API heredada inhabilitada
**Cuándo:** Al intentar enviar notificaciones desde el servidor.
**Causa:** Google deprecó la API heredada (`POST fcm.googleapis.com/fcm/send` con `Authorization: key=SERVER_KEY`) desde junio 2023.
**Solución:** Usar **FCM HTTP API V1** con OAuth2:
```
POST https://fcm.googleapis.com/v1/projects/{projectId}/messages:send
Authorization: Bearer {oauth2_access_token}
```
El access token se obtiene con `google-auth-library` usando el Service Account JSON.

---

#### ❌ ERROR 7: `/api/notify` no existía (es un proyecto Vite, no Next.js)
**Cuándo:** Al intentar enviar notificaciones — la función `notifyAdmins` llamaba a `/api/notify` pero esa ruta no existe en Vite.
**Causa:** La especificación original asumía Next.js. El proyecto real usa Vite.
**Solución:** Crear `/api/notify.ts` en la **raíz del proyecto** (no en `/src/`). Vercel detecta automáticamente los archivos en `/api/` y los despliega como Serverless Functions.

---

#### ❌ ERROR 8: Título "VentaÁgil" en la app instalada
**Cuándo:** Al instalar la PWA en PC — aparecía "VentaÁgil" en la barra de título.
**Causa:** El proyecto se originó como copia de VentaÁgil y el `index.html` original tenía el título de esa app.
**Solución:** Corregir `<title>` en `index.html` + desinstalar la PWA vieja desde `edge://apps/` y reinstalar.

---

#### ❌ ERROR 9: Botón "Instalar app" no hacía nada en móvil
**Cuándo:** Al tocar el botón en el menú de perfil del móvil.
**Causa:** `deferredPrompt` (evento `beforeinstallprompt`) era `null` porque el manifest no tenía `start_url` ni `scope` — el navegador no consideraba la app instalable.
**Solución:** Agregar al manifest en `vite.config.ts`:
```typescript
start_url: '/',
scope: '/',
```

---

#### ❌ ERROR 10: Notificaciones no llegaban al mensaje del chat
**Cuándo:** Cliente enviaba mensaje → admin no recibía notificación.
**Causa:** `handleSendMessage` en `ClientPedidos.tsx` guardaba el mensaje en Firestore pero nunca llamaba a `notifyAdmins`.
**Solución:** Agregar llamada a `notifyAdmins` después de guardar el mensaje, condicionada a que el remitente sea un cliente (no staff).

---

### 15.13 Comportamiento de notificaciones por escenario

| Escenario | App abierta | App minimizada | App cerrada |
|-----------|-------------|----------------|-------------|
| Toast Sonner | ✅ | ❌ | ❌ |
| Sonido MP3 | ✅ (volumen multimedia) | ❌ | ❌ |
| Vibración JS | ✅ | ❌ | ❌ |
| Notif. del sistema (barra) | ✅ (via swReg.showNotification) | ✅ (via SW background) | ✅ (via SW background) |
| Sonido del sistema | ✅ | ✅ (tono del móvil) | ✅ (tono del móvil) |
| Vibración del sistema | ✅ | ✅ | ✅ |

**Limitaciones conocidas y aceptadas:**
- El sonido MP3 personalizado suena con el volumen multimedia, no el de notificaciones. Es una limitación del navegador, no se puede cambiar.
- Cuando la app está cerrada, Android usa el tono configurado en Ajustes → Sonido → Tono de notificación. No se puede personalizar desde código en PWA.
- iPhone requiere iOS 16.4+ y que la app esté instalada en la pantalla de inicio.
- Firefox en Android no soporta FCM push. Usar Chrome o Edge.
- En localhost FCM push no funciona. Solo en HTTPS (Vercel).

---

### 15.14 Dónde se llama `notifyAdmins` en el proyecto

| Archivo | Evento | Mensaje |
|---------|--------|---------|
| `ClientPedidos.tsx` | Cliente envía mensaje en chat | `💬 Mensaje de {nombre}: "{texto}"` |
| *(pendiente)* | Venta completada en POS | `🍦 Nueva venta — Mesa {n} · ${total}` |
| *(pendiente)* | Insumo en stock crítico | `⚠️ Stock crítico — {insumo}` |
| *(pendiente)* | Nuevo pedido online | `🛒 Nuevo pedido de {cliente}` |

---

### 15.15 Flujo completo de deploy

```
1. Cambios en el código local
2. git add .
3. git commit -m "descripción del cambio"
4. git push origin main
5. Vercel detecta el push y hace build automático
6. Si el build falla → revisar logs en vercel.com/dashboard → Deployments
7. Si el build pasa → la app se actualiza en 1-2 minutos
8. En el móvil: cerrar y abrir la app para que el nuevo SW se active
```

**⚠️ Después de cambios en el SW (`firebase-messaging-sw.js`):**
- En el navegador: DevTools → Application → Service Workers → Unregister
- En el móvil: cerrar app completamente → abrir → esperar 10 segundos → cerrar → abrir de nuevo

---

### 15.16 Checklist de funcionalidades implementadas al 25/04/2026

**Notificaciones:**
- [x] Service Worker de Firebase con scope dedicado
- [x] Solicitar permiso y guardar token en Firestore
- [x] Token guardado en `users/{uid}.fcmTokens`
- [x] Desactivar notificaciones y eliminar token
- [x] Toast in-app con Sonner al recibir mensaje
- [x] Sonido MP3 personalizado con app abierta
- [x] Vibración con app abierta
- [x] Notificación nativa del sistema con app abierta
- [x] Notificación nativa del sistema con app cerrada/minimizada
- [x] Toque en notificación abre/enfoca la app
- [x] Vercel Serverless Function `/api/notify`
- [x] FCM HTTP API V1 con OAuth2 (google-auth-library)
- [x] `notifyAdmins` al recibir mensaje de cliente en chat
- [x] Guard para localhost (no falla en desarrollo)

**PWA:**
- [x] Instalable en Android (Chrome/Edge)
- [x] Botón "Instalar app" en menú de perfil
- [x] `start_url` y `scope` en manifest
- [x] Íconos `pwa-192x192.png` y `pwa-512x512.png`
- [x] `apple-touch-icon` apunta a `pwa-192x192.png`
- [x] Título correcto "D'LI Boutique" en `index.html`
- [x] `dev-dist/` en `.gitignore`
- [x] Deploy automático Vercel ← GitHub

**Pendientes:**
- [ ] `notifyAdmins` al completar venta en POS
- [ ] `notifyAdmins` al detectar stock crítico
- [ ] `notifyAdmins` al recibir nuevo pedido online
- [ ] Instalación en iPhone (iOS 16.4+ requerido)
- [ ] Limpieza automática de tokens FCM inválidos

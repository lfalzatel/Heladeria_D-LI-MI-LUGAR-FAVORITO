/**
 * Prueba de humo de la app publicada (producción).
 * Revisa que la página cargue y que los datos privados sigan protegidos.
 * Solo lee: no crea pedidos ni ventas. La cuenta anónima de prueba se borra al final.
 *
 *   node tests/smoke-produccion.mjs
 *
 * En GitHub corre todos los días (.github/workflows/revision-diaria.yml).
 */
import { readFileSync } from 'node:fs';

const SITE = process.env.SITE_URL || 'https://heladeria-d-li-mi-lugar-favorito.vercel.app';
const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const DB = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${encodeURIComponent(config.firestoreDatabaseId || '(default)')}/documents`;

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ ok: true, name });
  } catch (e) {
    results.push({ ok: false, name, error: e.message });
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function get(url, headers = {}) {
  // La red puede fallar a ratos: reintenta antes de dar la prueba por fallida
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, { headers });
    } catch (e) {
      if (i >= 3) throw e;
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

// --- La página ---
await check('La página principal carga', async () => {
  const r = await get(SITE);
  expect(r.status === 200, `respondió ${r.status}`);
  const html = await r.text();
  const js = html.match(/\/assets\/index-[^"]+\.js/)?.[0];
  expect(js, 'no se encontró el archivo principal de la app');
  const rj = await get(SITE + js);
  expect(rj.status === 200, `el archivo de la app respondió ${rj.status}`);
});

await check('El enlace de los QR de mesa abre la app', async () => {
  const r = await get(`${SITE}/mesa/mesa1?k=prueba`);
  expect(r.status === 200, `respondió ${r.status}`);
});

// --- El catálogo debe ser público ---
await check('El catálogo se ve sin iniciar sesión', async () => {
  const r = await get(`${DB}/products?pageSize=1`);
  expect(r.status === 200, `respondió ${r.status}`);
  const j = await r.json();
  expect(j.documents?.length > 0, 'no hay productos');
});

// --- Los datos privados deben estar protegidos, incluso para un anónimo ---
const signUp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${config.apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ returnSecureToken: true }),
}).then(r => r.json());

await check('Se puede crear una sesión anónima (la usan los pedidos de invitados)', async () => {
  expect(signUp.idToken, signUp.error?.message || 'sin token');
});

if (signUp.idToken) {
  const auth = { Authorization: `Bearer ${signUp.idToken}` };
  const privadas = {
    sales: 'ventas',
    abonos: 'abonos',
    supplies: 'insumos y costos',
    providers: 'proveedores',
    expenseCategories: 'categorías de gasto',
    tables: 'mesas y claves de QR',
    tableRequests: 'pedidos de mesa de otros',
    pedidos: 'pedidos a domicilio de otros',
  };
  for (const [col, label] of Object.entries(privadas)) {
    await check(`Un anónimo NO puede leer ${label}`, async () => {
      const r = await get(`${DB}/${col}?pageSize=1`, auth);
      expect(r.status === 403, `respondió ${r.status} (debía ser 403: datos expuestos)`);
    });
    await check(`Sin cuenta NO se puede leer ${label}`, async () => {
      const r = await get(`${DB}/${col}?pageSize=1`);
      expect(r.status === 403, `respondió ${r.status} (debía ser 403: datos expuestos)`);
    });
  }

  // Borrar la cuenta anónima de prueba
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: signUp.idToken }),
  }).catch(() => {});
}

// --- Resultado ---
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : `: ${r.error}`}`);
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} revisiones correctas`);
if (failed.length) process.exit(1);

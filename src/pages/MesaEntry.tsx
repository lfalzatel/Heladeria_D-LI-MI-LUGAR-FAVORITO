import { useEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { saveTableSession } from '../lib/tableOrders';

/** Destino del QR de cada mesa: guarda la mesa y abre el catálogo de siempre en "modo mesa" */
export default function MesaEntry() {
  const { tableId } = useParams();
  const [params] = useSearchParams();
  const key = params.get('k');
  const valid = !!tableId && /^mesa\d+$/.test(tableId) && !!key;

  useEffect(() => {
    if (valid) saveTableSession(tableId!, key!, params.get('n'));
  }, [valid, tableId, key, params]);

  return <Navigate to="/cliente/compras" replace />;
}

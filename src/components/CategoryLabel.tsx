import { useCategoriesStore } from '../stores/useCategoriesStore';

/** Muestra el nombre de la categoría ("Salpicón") en vez de su código interno ("salpic-n"). */
export default function CategoryLabel({ id }: { id?: string }) {
  const categories = useCategoriesStore(s => s.categories);
  return <>{categories.find(c => c.id === id)?.label || id || ''}</>;
}

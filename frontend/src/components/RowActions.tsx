import { Pencil, Trash2 } from "lucide-react";

/** Edit and delete buttons at the end of a list row (the row has the class "group"): shown on hover, and always on
 * touch screens, which have none. */
export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
      <button onClick={onEdit} aria-label="Modifier" title="Modifier" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
        <Pencil size={16} />
      </button>
      <button onClick={onDelete} aria-label="Supprimer" title="Supprimer" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

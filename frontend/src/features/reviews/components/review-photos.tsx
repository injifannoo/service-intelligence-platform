import { useState } from "react";
import { toast } from "sonner";
import type { ReviewPhoto } from "../types";
import { MAX_REVIEW_PHOTOS } from "../types";

export function ReviewPhotoPicker({ files, onChange, existing = 0 }: { files: File[]; onChange: (f: File[]) => void; existing?: number }) {
  const room = MAX_REVIEW_PHOTOS - existing;
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const ok = picked.filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    if (ok.length < picked.length) toast.error("Only images under 10 MB are allowed");
    onChange([...files, ...ok].slice(0, room));
  };
  if (room <= 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <label className="cursor-pointer rounded-md border px-3 py-1.5 hover:bg-muted">
        Add photos ({files.length}/{room})
        <input type="file" accept="image/*" multiple className="sr-only" onChange={onFile} disabled={files.length >= room} />
      </label>
      {files.map((f, i) => (
        <span key={i} className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
          {f.name.slice(0, 20)}
          <button type="button" className="text-destructive" onClick={() => onChange(files.filter((_, j) => j !== i))}>×</button>
        </span>
      ))}
    </div>
  );
}

export function ReviewPhotoStrip({ photos, canDelete, onDelete }: { photos?: ReviewPhoto[] | undefined; canDelete?: boolean; onDelete?: (id: string) => unknown }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!photos?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {photos.map((p) => (
        <div key={p.id} className="relative">
          <button type="button" onClick={() => setOpen(p.image_url)}>
            <img src={p.image_url} alt="Review photo" loading="lazy" className="h-20 w-20 rounded-md border object-cover" />
          </button>
          {canDelete && (
            <button type="button" aria-label="Remove photo" onClick={() => onDelete?.(p.id)} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-xs text-destructive-foreground">×</button>
          )}
        </div>
      ))}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-6" onClick={() => setOpen(null)}>
          <img src={open} alt="Review photo" className="max-h-[85vh] rounded-md object-contain" />
        </div>
      )}
    </div>
  );
}

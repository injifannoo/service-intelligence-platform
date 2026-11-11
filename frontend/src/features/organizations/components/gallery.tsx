/* eslint-disable prettier/prettier */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { btnGhost, inputCls } from "@/components/shared/site";
import { orgPhotosQuery, useGalleryMutations } from "../api/gallery";
import { MAX_PHOTOS } from "../types";

export function toPhotoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function OrgGallery({ orgId }: { orgId: string }) {
  const { data = [] } = useQuery(orgPhotosQuery(orgId));
  const [open, setOpen] = useState<number | null>(null);
  if (!data.length) return null;
  const cur = open !== null ? data[open] : null;
  
  return (
    <section>
      <h2 className="text-3xl">Gallery</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.map((p, i) => (
          <button key={p.id} onClick={() => setOpen(i)} className="group overflow-hidden rounded-md border bg-muted">
            <img src={p.image_url} alt={p.caption || "Gallery photo"} loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" />
          </button>
        ))}
      </div>
      {cur && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-6" onClick={() => setOpen(null)}>
          <figure className="max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={cur.image_url} alt={cur.caption || "Gallery photo"} className="max-h-[80vh] rounded-md object-contain" />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-background">
              <span>{cur.caption}</span>
              <span className="flex gap-2">
                <button className="rounded border border-background/40 px-3 py-1" onClick={() => setOpen((open! - 1 + data.length) % data.length)}>‹ Prev</button>
                <button className="rounded border border-background/40 px-3 py-1" onClick={() => setOpen((open! + 1) % data.length)}>Next ›</button>
                <button className="rounded border border-background/40 px-3 py-1" onClick={() => setOpen(null)}>Close</button>
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}

export function GalleryManager({ orgId }: { orgId: string }) {
  const { data = [] } = useQuery(orgPhotosQuery(orgId));
  const { add, remove } = useGalleryMutations(orgId);
  const [caption, setCaption] = useState("");
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image file");
    if (file.size > 10 * 1024 * 1024) return void toast.error("Image must be under 10 MB");
    add.mutate({ file, caption }, {
      onSuccess: () => { setCaption(""); toast.success("Photo added"); },
      onError: (err) => toast.error((err as Error).message),
    });
  };
  const full = data.length >= MAX_PHOTOS;
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl">Photo gallery</h2>
        <span className="text-sm text-muted-foreground">{data.length}/{MAX_PHOTOS}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Show your office, team and past work on your public profile.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <input className={inputCls + " max-w-sm"} placeholder="Caption (optional)" maxLength={140} value={caption} onChange={(e) => setCaption(e.target.value)} />
        <label className={btnGhost + (full ? " pointer-events-none opacity-50" : " cursor-pointer")}>
          {add.isPending ? "Uploading…" : full ? "Gallery full" : "Add photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={add.isPending || full} />
        </label>
      </div>
      {data.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-md border">
              <img src={p.image_url} alt={p.caption || "Photo"} className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-2 text-xs">
                <span className="truncate text-muted-foreground">{p.caption || "—"}</span>
                <button className="text-destructive hover:underline" onClick={() => remove.mutate(p.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

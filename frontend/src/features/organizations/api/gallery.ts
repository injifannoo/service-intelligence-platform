import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrgPhoto } from "../types";

export const orgPhotosQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["photos", orgId],
    queryFn: async (): Promise<OrgPhoto[]> => {
      const { data, error } = await supabase
        .from("org_photos").select("*").eq("org_id", orgId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

/** Resizes to max 1280px WebP so a photo stays well under the stored size limit. */
export async function toPhotoDataUrl(file: File, max = 1280): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(max / img.width, max / img.height, 1);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/webp", 0.8);
}

export function useGalleryMutations(orgId: string) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["photos", orgId] });
  const add = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      const image_url = await toPhotoDataUrl(file);
      const { error } = await supabase.from("org_photos").insert({ org_id: orgId, image_url, caption: caption.slice(0, 140) });
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  return { add, remove };
}

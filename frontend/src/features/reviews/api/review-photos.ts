import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toPhotoDataUrl } from "@/features/organizations/components/gallery";
import type { ReviewPhoto } from "../types";
import { MAX_REVIEW_PHOTOS } from "../types";

export const reviewPhotosQuery = (reviewIds: string[]) =>
  queryOptions({
    queryKey: ["review-photos", reviewIds.join(",")],
    enabled: reviewIds.length > 0,
    queryFn: async (): Promise<Record<string, ReviewPhoto[]>> => {
      const { data, error } = await supabase
        .from("review_photos")
        .select("*")
        .in("review_id", reviewIds)
        .order("created_at");
      if (error) throw error;
      const out: Record<string, ReviewPhoto[]> = {};
      for (const p of data ?? []) (out[p.review_id] ??= []).push(p);
      return out;
    },
  });

export async function uploadReviewPhotos(reviewId: string, userId: string, files: File[]) {
  for (const f of files.slice(0, MAX_REVIEW_PHOTOS)) {
    const image_url = await toPhotoDataUrl(f);
    const { error } = await supabase
      .from("review_photos")
      .insert({ review_id: reviewId, user_id: userId, image_url });
    if (error) throw error;
  }
}

export async function deleteReviewPhoto(id: string) {
  const { error } = await supabase.from("review_photos").delete().eq("id", id);
  if (error) throw error;
}

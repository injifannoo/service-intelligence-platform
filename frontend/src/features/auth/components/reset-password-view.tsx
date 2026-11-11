"use client";
import {useRouter} from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, inputCls, btnPrimary } from "@/components/shared/site";

export function ResetPasswordView() {
  const [pw, setPw] = useState("");
  const router = useRouter();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    router.push("/");
  };
  return (
    <Page>
      <form onSubmit={submit} className="mx-auto max-w-md space-y-4 px-6 py-20">
        <h1 className="text-4xl">Set a new password</h1>
        <input
          required
          minLength={6}
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="New password"
          className={inputCls}
        />
        <button className={`${btnPrimary} w-full py-2.5`}>Update password</button>
      </form>
    </Page>
  );
}

"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Image
            src="/assets/Resolve_black.png"
            alt=""
            width={650}
            height={282}
            className="mb-2 h-10 w-auto"
            priority
          />
          <CardTitle>Resolve</CardTitle>
          <CardDescription>
            Sign in to create and continue your CCPS problem-solving plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  not_invited:
    "This Google account hasn't been added to a school yet — ask your school administrator to add you, then try again.",
  auth_failed: "Sign-in failed. Please try again.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth_failed) : null;

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
        <CardContent className="space-y-4">
          {errorMessage && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <Button className="w-full" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

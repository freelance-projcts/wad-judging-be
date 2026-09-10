"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/validators";
import { api, ApiClientError } from "@/lib/api-client";
import { useSession } from "@/components/providers/session-provider";
import type { z } from "zod";

type FormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await api.post("/api/auth/register", values);
      await refresh();
      toast.success("Account created. You have been signed in as a judge.");
      router.push("/judge");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground text-sm">Register as a performance judge</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="name" placeholder="Jane Doe" className="pl-9" {...register("name")} />
            </div>
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@example.com" className="pl-9" {...register("email")} />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="••••••••" className="pl-9" {...register("password")} />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

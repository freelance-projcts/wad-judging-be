"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Camera } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/components/providers/session-provider";
import { api, ApiClientError } from "@/lib/api-client";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileView() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [editingMobile, setEditingMobile] = useState(false);
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [savingMobile, setSavingMobile] = useState(false);

  if (!user) return null;

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { url } = await api.upload<{ url: string }>("/api/upload", formData);
      await api.patch("/api/profile", { avatarUrl: url });
      await refresh();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to upload photo");
    }
  }

  async function saveName() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.patch("/api/profile", { name });
      await refresh();
      setEditingName(false);
      toast.success("Name updated");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  }

  async function saveMobileNumber() {
    setSavingMobile(true);
    try {
      await api.patch("/api/profile", { mobileNumber });
      await refresh();
      setEditingMobile(false);
      toast.success("Mobile number updated");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update mobile number");
    } finally {
      setSavingMobile(false);
    }
  }

  async function handleLogout() {
    await api.post("/api/auth/logout");
    await refresh();
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="User Profile" subtitle="Manage your profile details" />

      <Card className="max-w-xl mx-auto">
        <CardContent className="pt-8 space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="size-24">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              >
                <Camera className="size-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="space-y-1 border-b pb-4">
            <p className="text-sm text-muted-foreground">Name</p>
            {editingName ? (
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <Button size="sm" onClick={saveName} disabled={saving}>
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-medium">{user.name}</p>
                <button onClick={() => setEditingName(true)}>
                  <Pencil className="size-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1 border-b pb-4">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>

          <div className="space-y-1 border-b pb-4">
            <p className="text-sm text-muted-foreground">Mobile Number</p>
            {editingMobile ? (
              <div className="flex gap-2">
                <Input
                  type="tel"
                  value={mobileNumber ?? ""}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="07XXXXXXXX"
                />
                <Button size="sm" onClick={saveMobileNumber} disabled={savingMobile}>
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-medium">{user.mobileNumber || "Not set"}</p>
                <button onClick={() => setEditingMobile(true)}>
                  <Pencil className="size-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{user.role === "ADMIN" ? "Admin" : "Judge"}</p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg" className="w-full">
                Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Logout</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to logout?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

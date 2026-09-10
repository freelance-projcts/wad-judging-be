"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { studentSchema, genders, genderLabels, provinces, provinceLabels } from "@/lib/validators";
import { api, ApiClientError } from "@/lib/api-client";
import type { z } from "zod";

type FormValues = z.infer<typeof studentSchema>;

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(studentSchema) });

  useEffect(() => {
    api.get<{ student: FormValues & { photoUrl: string | null } }>(`/api/students/${id}`).then((d) => {
      reset(d.student);
      setPhotoUrl(d.student.photoUrl ?? null);
      setPhotoPreview(d.student.photoUrl ?? null);
      setLoading(false);
    });
  }, [id, reset]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { url } = await api.upload<{ url: string }>("/api/upload", formData);
      setPhotoUrl(url);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await api.patch(`/api/students/${id}`, { ...values, photoUrl });
      toast.success("Student updated successfully");
      router.push("/admin/students");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/api/students/${id}`);
      toast.success("Student deleted");
      router.push("/admin/students");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete student");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Student"
        subtitle="Update student details"
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this student? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 size-32 rounded-full bg-muted hover:bg-muted/70 transition-colors overflow-hidden"
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Student" className="size-full object-cover" />
          ) : (
            <>
              <Camera className="size-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{uploading ? "Uploading…" : "Upload Photo"}</span>
            </>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>

      <Card className="max-w-xl mx-auto">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">ID</Label>
              <Input id="code" {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((g) => (
                        <SelectItem key={g} value={g}>
                          {genderLabels[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Province</Label>
              <Controller
                control={control}
                name="province"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>
                          {provinceLabels[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting || uploading}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

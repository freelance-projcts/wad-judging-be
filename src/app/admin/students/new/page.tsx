"use client";

import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studentSchema, genders, genderLabels, provinces, provinceLabels } from "@/lib/validators";
import { api, ApiClientError } from "@/lib/api-client";
import type { z } from "zod";

type FormValues = z.infer<typeof studentSchema>;

export default function CreateStudentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(studentSchema) });

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
      await api.post("/api/students", { ...values, photoUrl });
      toast.success("Student saved successfully");
      reset();
      setPhotoPreview(null);
      setPhotoUrl(null);
      router.push("/admin/students");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save student");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create Student" subtitle="Add student details here" />

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
              <Input id="code" placeholder="e.g. 01" {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Full Name" {...register("fullName")} />
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
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
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
              {errors.province && <p className="text-xs text-destructive">{errors.province.message}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting || uploading}>
              {submitting ? "Saving…" : "Save Student"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

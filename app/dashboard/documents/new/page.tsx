import { UploadForm } from "@/app/dashboard/upload-form";

export default function NewDocumentPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nuevo documento
        </h1>
        <p className="text-muted-foreground text-sm">
          Sube un archivo o pega un texto. El servidor calculará el SHA-256.
        </p>
      </div>
      <UploadForm />
    </main>
  );
}

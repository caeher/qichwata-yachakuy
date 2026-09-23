import { redirect } from "next/navigation";

export default function LegacyNewDocumentPage() {
  redirect("/dashboard");
}

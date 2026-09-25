import { redirect } from "next/navigation";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function toQueryString(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  const result = query.toString();
  return result ? `?${result}` : "";
}

export default async function LegacyLearnPage({ searchParams }: Props) {
  redirect(`/dashboard${toQueryString(await searchParams)}`);
}

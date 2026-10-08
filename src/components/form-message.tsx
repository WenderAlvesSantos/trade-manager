import type { FormState } from "@/lib/validations";

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p role="status" className="text-sm text-emerald-600">
        {state.success}
      </p>
    );
  }
  return null;
}

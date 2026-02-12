export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || "Something went wrong");
  }

  return res.json();
}

export const RECORD_TYPE_DISPLAY: Record<string, string> = {
  MRI: "MRI",
  XRAY: "X-Ray",
  ULTRASOUND: "Ultrasound",
  CT_SCAN: "CT Scan",
  OTHER: "Other",
};

export const RECORD_TYPE_COLORS: Record<string, string> = {
  XRAY: "primary",
  MRI: "accent",
  CT_SCAN: "warning",
  ULTRASOUND: "success",
  OTHER: "default",
};

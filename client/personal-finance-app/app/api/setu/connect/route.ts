import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { createConsent } from "@/lib/setu/consent";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { vua } = body;

  if (!vua) {
    return Response.json(
      { error: "vua (mobile number) is required" },
      { status: 400 },
    );
  }

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const to = now;

  try {
    const result = await createConsent({
      userId: user.id,
      vua,
      dataRangeFrom: from.toISOString(),
      dataRangeTo: to.toISOString(),
    });

    return Response.json(result);
  } catch (error) {
    const err = error as {
      response?: { status?: number; data?: { errorCode?: string; errorMsg?: string } };
      message?: string;
    };

    const status = err.response?.status ?? 500;
    const errorCode = err.response?.data?.errorCode;
    const errorMsg = err.response?.data?.errorMsg;

    console.error("Setu connect error:", {
      status,
      errorCode,
      errorMsg,
      message: err.message,
    });

    return Response.json(
      { error: errorMsg ?? errorCode ?? "Failed to create consent" },
      { status },
    );
  }
}

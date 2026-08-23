import { setuClient } from "./client";

export interface SetuFip {
  name: string;
  fipId: string;
  fiTypes: string[];
  institutionType: string;
  status: string;
}

export async function getActiveFips(): Promise<SetuFip[]> {
  const { data } = await setuClient.get("/v2/fips", {
    params: { status: "ACTIVE" },
  });
  return data.data ?? data ?? [];
}

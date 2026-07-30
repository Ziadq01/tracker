export type RunStatus = "active" | "paused";
export type CreativeStatus = "active" | "paused";
export type BcAccountType = "owned" | "rented";

export type Offer = {
  id: string;
  glitchy_offer_id: string;
  name: string;
  payout: number | null;
  created_at: string | null;
};

export type BcAccount = {
  id: string;
  name: string;
  tiktok_bc_id: string | null;
  type: BcAccountType | null;
  is_active: boolean | null;
  created_at: string | null;
};

export type Creative = {
  id: string;
  name: string;
  offer_id: string | null;
  bc_account_id: string | null;
  status: CreativeStatus | null;
  created_at: string | null;
};

export type Run = {
  id: string;
  creative_id: string | null;
  run_date: string;
  ad_spend: number | null;
  revenue: number | null;
  tiktok_clicks: number | null;
  network_clicks: number | null;
  status: RunStatus | null;
  created_at: string | null;
};

export type OfferStat = {
  id: string;
  offer_id: string | null;
  stat_date: string;
  revenue: number | null;
  clicks: number | null;
  conversions: number | null;
  epc: number | null;
  created_at: string | null;
};

/** A run joined to the creative (and its offer / BC account) that produced it. */
export type RunWithCreative = Run & {
  creative:
    | (Pick<Creative, "id" | "name" | "status"> & {
        offer: Pick<Offer, "id" | "name" | "glitchy_offer_id"> | null;
        bc_account: Pick<BcAccount, "id" | "name" | "type"> | null;
      })
    | null;
};

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  skills: string[] | null;
  experience_level: string | null;
  hourly_rate: number | null;
  location: string | null;
  portfolio_url: string | null;
  availability: string | null;
  subscription_status: 'free' | 'pro';
  created_at: string;
}

export interface Lead {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  project_type: string | null;
  skills_required: string[] | null;
  client_location: string | null;
  source_url: string | null;
  posted_date: string;
  expiry_date: string | null;
  status: 'active' | 'filled' | 'expired';
}

export interface Application {
  id: string;
  freelancer_id: string;
  lead_id: string;
  status: 'interested' | 'applied' | 'hired';
  created_at: string;
}

export interface PricingTier {
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

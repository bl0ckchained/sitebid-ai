// src/lib/company.ts
export type CompanyProfile = {
  name: string;
  phone: string;
  email: string;
  website?: string;
  addressLines: string[];        // e.g., ["123 Main St", "Springfield, MI 49000"]
  logoUrl?: string;              // e.g., "/logo.png" (put your file in /public)
  license?: string;              // e.g., "MI Contractor #12345"
};

export const COMPANY: CompanyProfile = {
  name: "Your Company Name LLC",
  phone: "(555) 555-5555",
  email: "bids@yourcompany.com",
  website: "https://yourcompany.com",
  addressLines: ["123 Main St", "Yourtown, MI 49000"],
  logoUrl: "/logo.png",
  license: "MI Contractor #12345",
};

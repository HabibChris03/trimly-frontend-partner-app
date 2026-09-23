import { TutorialStep } from "@/components/barber/PageTutorialModal";

export const BARBER_DASHBOARD_TUTORIAL: {
  title: string;
  subtitle: string;
  steps: TutorialStep[];
} = {
  title: "Barber Dashboard Walkthrough",
  subtitle: "Everything you need to run your daily barbershop operations",
  steps: [
    {
      title: "Auto-Confirm Bookings",
      badge: "Automation",
      icon: "flash-outline",
      description:
        "Toggle Auto-Confirm ON for instant bookings, or turn it OFF to review new client appointment requests and manually Accept or Decline.",
      tip: "Turn this ON during your normal busy hours to let clients book seamlessly without waiting for your response.",
    },
    {
      title: "Today's Live Metrics",
      badge: "Real-Time Stats",
      icon: "stats-chart-outline",
      description:
        "Track today's total revenue in FCFA, the number of haircuts completed, and your live verified star rating from client reviews.",
      tip: "Metrics update automatically every time you complete an appointment.",
    },
    {
      title: "Salon Lounge Capacity",
      badge: "Database Synced",
      icon: "business-outline",
      description:
        "Displays your active styling chairs count. This value is stored in the database to allow simultaneous bookings up to your declared capacity.",
      tip: "Tap 'Manage' anytime to adjust chair numbers when you add new stations or expand staff.",
    },
    {
      title: "Today's Agenda & Timeline",
      badge: "Appointments",
      icon: "calendar-outline",
      description:
        "Your chronological daily schedule. See client names, requested cuts, scheduled times, and status badges (Completed, Current, Upcoming).",
      tip: "Tap on any client card to view contact details, phone number, and start the haircut session.",
    },
    {
      title: "Your Services Menu",
      badge: "Quick Management",
      icon: "cut-outline",
      description:
        "Quickly view, edit, or add new haircuts. Tap '+ Add New' to open the full-screen service creator with custom durations, photo showcase, and FCFA prices.",
      tip: "Setting accurate durations ensures calendar booking slots step by your exact service interval.",
    },
  ],
};

export const MANAGE_SERVICES_TUTORIAL: {
  title: string;
  subtitle: string;
  steps: TutorialStep[];
} = {
  title: "Services & Pricing Guide",
  subtitle: "Build your hairstyle menu with custom durations and pricing",
  steps: [
    {
      title: "Hairstyles vs Extra Add-ons",
      badge: "Catalog Organization",
      icon: "layers-outline",
      description:
        "Use the top tabs to separate primary hairstyles (which reserve calendar appointment slots) from quick extra add-ons (beard oil, face scrub).",
      tip: "Extra add-ons won't take up extra calendar time and can be added alongside primary cuts.",
    },
    {
      title: "Categories & Vector Icons",
      badge: "Browsing",
      icon: "pricetags-outline",
      description:
        "Organize cuts into Braids, Fades, Weaves, Silk Press, Beard, and more. Tap '+ Add New Category' to create custom categories that save to the database.",
      tip: "Clients can filter your menu by category when browsing your public profile.",
    },
    {
      title: "Barber-Controlled Duration",
      badge: "Calendar Partitioning",
      icon: "time-outline",
      description:
        "You dictate the duration using 10 quick presets (15m to 4h) or fine-tuning steppers. Client booking slots on the calendar will step by this exact duration!",
      tip: "For long sessions like Knotless Braids, set 120m or 180m so your calendar is never double-booked.",
    },
    {
      title: "FCFA Pricing & Quick Shortcuts",
      badge: "Currency",
      icon: "cash-outline",
      description:
        "Set standard prices in FCFA with one-tap shortcuts (5,000 to 50,000 FCFA) or type any custom amount.",
      tip: "Competitive, transparent pricing increases conversion on the client discovery map.",
    },
    {
      title: "Showcase Design Photos",
      badge: "Visual Lookbook",
      icon: "camera-outline",
      description:
        "Upload high-definition photos of your cuts directly from your phone gallery. Photos are uploaded to Cloudinary and displayed to clients before booking.",
      tip: "Services with HD showcase photos receive significantly higher booking rates.",
    },
  ],
};

export const SALON_MANAGEMENT_TUTORIAL: {
  title: string;
  subtitle: string;
  steps: TutorialStep[];
} = {
  title: "Salon Facilities & Chairs Guide",
  subtitle: "Configure your shop capacity, storefront photos, and branding",
  steps: [
    {
      title: "Multi-Chair Salon Switch",
      badge: "Business Type",
      icon: "business-outline",
      description:
        "Toggle whether you operate as a multi-chair salon lounge or an independent solo barber shop.",
      tip: "Multi-chair salons can have multiple client appointments booked at the exact same hour.",
    },
    {
      title: "Working Chairs / Stations",
      badge: "Capacity Persistence",
      icon: "grid-outline",
      description:
        "Enter your active styling chairs count (e.g. 5). When saved, this persists into the database and syncs live with your Barber Dashboard.",
      tip: "The booking engine uses this capacity number to prevent overbooking your salon.",
    },
    {
      title: "Logo & Storefront Photo",
      badge: "Shop Branding",
      icon: "image-outline",
      description:
        "Upload your official business logo or capture a camera photo of your shop's exterior so clients easily recognize your establishment.",
      tip: "Clean storefront photos build trust with new first-time clients.",
    },
    {
      title: "Amenities & Atmosphere",
      badge: "Client Experience",
      icon: "sparkles-outline",
      description:
        "Describe your salon atmosphere, VIP lounges, air conditioning, complimentary drinks, and parking facilities.",
      tip: "Mentioning perks like free WiFi or VIP seating helps you stand out in search results.",
    },
  ],
};

export const MANAGE_STAFF_TUTORIAL: {
  title: string;
  subtitle: string;
  steps: TutorialStep[];
} = {
  title: "Staff & Stylists Management Guide",
  subtitle: "Build, invite, and manage your salon barber team",
  steps: [
    {
      title: "Search & Official Invites",
      badge: "Recruitment",
      icon: "person-add-outline",
      description:
        "Search registered barbers and stylists by name or phone. Tap 'Send Official Invite Now' to dispatch in-app push notifications and email invitations.",
      tip: "If you're not ready to notify them yet, choose 'Save as Draft (Still to Send)'.",
    },
    {
      title: "Active Stylists Roster",
      badge: "Team Management",
      icon: "people-outline",
      description:
        "Manage registered barbers working under your salon. Toggle their real-time duty status between Active, On Break, or Off Duty.",
      tip: "Barbers set to 'Off Duty' will not appear as available for walk-ins or bookings.",
    },
    {
      title: "Pending Invitations Tab",
      badge: "Tracking",
      icon: "time-outline",
      description:
        "Track invitations awaiting acceptance by stylists. You can revoke any pending invitation with a single tap if plans change.",
      tip: "Stylists receive instant alerts on their phone when an invite is waiting for them.",
    },
    {
      title: "Drafts (Still to Send)",
      badge: "Staging",
      icon: "document-text-outline",
      description:
        "All queued drafts are safely stored in the database. When ready to officially bring them on board, tap 'Send Official Invite'.",
      tip: "Drafts allow you to assemble a team roster before officially launching your salon.",
    },
  ],
};

export const BARBER_EARNINGS_TUTORIAL: {
  title: string;
  subtitle: string;
  steps: TutorialStep[];
} = {
  title: "Earnings & Payouts Guide",
  subtitle: "Track your income and withdraw funds via Mobile Money",
  steps: [
    {
      title: "Gross Revenue Analytics",
      badge: "Analytics",
      icon: "stats-chart-outline",
      description:
        "Filter your cumulative gross revenue by Today, This Week, This Month, and All Time.",
      tip: "Track your busiest days to optimize staff scheduling and chair availability.",
    },
    {
      title: "Available Balance",
      badge: "Funds",
      icon: "wallet-outline",
      description:
        "View your current withdrawal-ready balance in FCFA from confirmed client appointments.",
      tip: "Balances update immediately upon completing client appointments.",
    },
    {
      title: "Mobile Money Withdrawals",
      badge: "Instant Payouts",
      icon: "cash-outline",
      description:
        "Tap 'Request Withdrawal' to transfer funds directly to your MTN Mobile Money, Orange Money, or Direct Bank Transfer account.",
      tip: "Keep your MoMo or Orange Money phone number updated in your profile for swift processing.",
    },
  ],
};

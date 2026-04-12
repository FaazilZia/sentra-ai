import {
  Lock,
  Globe,
  ShieldCheck,
  Settings,
  Zap,
  BarChart3,
  Cpu
} from "lucide-react";

export const siteContent = {
  nav: {
    logo: "Sentra AI",
    links: [
      { label: "Product", href: "#product" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Security", href: "#security" },
    ],
  },
  hero: {
    badge: "SENTRA AI V2.0",
    badgeText: "The Future of Workflow Automation",
    headline: "Automate Your Workflow with AI",
    subheadline: "Deploy powerful AI agents in minutes. No coding required. The unified platform for enterprise-grade safety and observability.",
    ctas: {
      primary: "Get Started",
      secondary: "Watch Demo",
    },
  },
  features: {
    label: "CAPABILITIES",
    heading: "Smarter workflows, zero friction.",
    items: [
      {
        icon: Zap,
        title: "AI Automation",
        description: "Transform manual tasks into autonomous workflows with our lightweight, intelligent agent SDK.",
      },
      {
        icon: BarChart3,
        title: "Real-time Analytics",
        description: "Track Latencies, token usage, and model performance metrics across all pipelines instantly.",
      },
      {
        icon: ShieldCheck,
        title: "Secure Infrastructure",
        description: "Your data never leaves your VPC. DPDP compliant and built with privacy-first architecture.",
      },
      {
        icon: Cpu,
        title: "Easy Integration",
        description: "Connect your existing LLM providers and tools with a single line of code. No complex setup.",
      },
    ],
  },
  howItWorks: {
    label: "THE PROCESS",
    heading: "Deploy in three steps.",
    steps: [
      {
        icon: Settings,
        title: "Connect tools",
        desc: "Plug in your LLM providers, databases, and third-party APIs through our secure gateway.",
      },
      {
        icon: Zap,
        title: "Configure AI workflows",
        desc: "Define your agent's behavior, guardrails, and decision logic using our intuitive dashboard.",
      },
      {
        icon: Globe,
        title: "Deploy instantly",
        desc: "Launch your workflows to production with a single click. Monitor and scale as you grow.",
      },
    ],
  },
  pricing: {
    label: "PRICING",
    heading: "Simple, transparent pricing.",
    tiers: [
      {
        name: "Starter",
        price: { monthly: "0", yearly: "0" },
        desc: "For individuals exploring AI.",
        features: ["1 Model integration", "Basic risk detection", "7-day log retention", "Community support"],
        cta: "Get Started",
        highlighted: false
      },
      {
        name: "Pro",
        price: { monthly: "199", yearly: "149" },
        desc: "For growing teams and startups.",
        features: ["Unlimited integrations", "1M tokens/mo included", "Advanced PII masking", "30-day log retention", "Priority support"],
        cta: "Go Pro",
        highlighted: true
      },
      {
        name: "Enterprise",
        price: { monthly: "Custom", yearly: "Custom" },
        desc: "For security-first organizations.",
        features: ["On-prem deployments", "Unlimited token volume", "SSO & Custom RBAC", "Lifetime log retention", "Dedicated support"],
        cta: "Contact Sales",
        highlighted: false
      }
    ]
  },
  security: {
    label: "SECURITY",
    heading: "Enterprise-grade trust.",
    items: [
      {
        title: "End-to-End Encryption",
        desc: "All data is encrypted in transit and at rest using DPDP.",
        icon: Lock
      },
      {
        title: "DPDP Compliance",
        desc: "Our infrastructure and processes are fully aligned with the Digital Personal Data Protection Act.",
        icon: ShieldCheck
      }
    ]
  },
  testimonials: [
    {
      quote: "Sentra AI's automation tools saved us 40+ hours a week in manual coordination. It's built for scale.",
      author: "Sarah Chen",
      role: "CTO at Nexus AI",
      avatar: "https://i.pravatar.cc/150?u=sarah"
    },
    {
      quote: "The security layer is what convinced us. We catch hallucinations and data leaks in real-time.",
      author: "Marcus Thorne",
      role: "Security Lead at GlobalFlow",
      avatar: "https://i.pravatar.cc/150?u=marcus"
    },
    {
      quote: "Finally, an AI platform that prioritizes readability and user experience over visual noise.",
      author: "Elena Rodriguez",
      role: "VP of Product at SecureTech",
      avatar: "https://i.pravatar.cc/150?u=elena"
    }
  ],
  cta: {
    heading: "Start building with Sentra AI today",
    subheading: "Join 1,000+ companies securing and automating their AI futures.",
    primary: "Get Started",
    secondary: "Contact Sales"
  },
  footer: {
    description: "The Trust Layer for Autonomous Enterprise AI. Securing the agentic future.",
    columns: [
      { 
        title: "Product", 
        links: [
          { label: "Features", href: "#product" },
          { label: "How It Works", href: "#how-it-works" },
          { label: "Security", href: "#security" },
          { label: "Documentation", href: "#" },
        ]
      },
      { 
        title: "Company", 
        links: [
          { label: "About", href: "#" },
          { label: "Careers", href: "#" },
          { label: "Contact", href: "#" },
          { label: "Privacy", href: "#" },
        ]
      },
      { 
        title: "Legal", 
        links: [
          { label: "Privacy Policy", href: "#" },
          { label: "Terms of Service", href: "#" },
          { label: "Cookie Policy", href: "#" },
          { label: "Trademark Guidelines", href: "#" },
        ]
      },
    ],
    socials: [
      { name: "Twitter", href: "#" },
      { name: "GitHub", href: "#" },
      { name: "LinkedIn", href: "#" }
    ],
    copyright: "© 2025 Sentra AI. All rights reserved. Sentra AI and the Sentra Logo are trademarks of Sentra AI Inc."
  },
  faq: {
    heading: "Frequently Asked Questions",
    items: [
      { q: "Is Sentra DPDP compliant?", a: "Yes, we are fully DPDP compliant and adhere to all regulatory requirements for data processing and protection." },
      { q: "Which LLM providers do you support?", a: "We support OpenAI, Anthropic, Mistral, Google Gemini, and any OpenAI-compatible custom endpoint." },
      { q: "Can I self-host?", a: "Yes, our Enterprise plan includes Docker and Kubernetes deployment options for your VPC." },
      { q: "What is prompt injection?", a: "Prompt injection is when a user maliciously attempts to bypass your LLM's guardrails. Sentra AI blocks this in real-time." },
      { q: "Do you store my prompts?", a: "We employ strict zero-data-retention policies by default, meaning prompts are analyzed in-memory and discarded." }
    ]
  },
    ],
  },
  problemSection: {
    label: "THE CHALLENGE",
    heading: "AI is moving fast. Security is lagging.",
    problems: [
      {
        title: "DATA LEAKAGE",
        desc: "Sensitive credentials and PII accidentally leak into model prompts or responses."
      },
      {
        title: "MODEL DRIFT",
        desc: "Autonomous agents making unpredictable decisions outside their original guardrails."
      },
      {
        title: "COMPLIANCE GAPS",
        desc: "Missing audit trails and policy enforcement in rapidly scaling AI systems."
      }
    ],
    solution: {
      title: "The Secure Gateway",
      desc: "Sentra AI acts as the trust layer, intercepting every token to ensure compliance, safety, and operational excellence."
    }
  },
  useCases: {
    label: "ONE PLATFORM",
    heading: "One Platform. Infinite Protection.",
    items: [
      {
        title: "Enterprise SaaS",
        desc: "Secure customer-facing AI features from prompt injection and data exfiltration."
      },
      {
        title: "Banking & FinTech",
        desc: "Enforce strict DPDP and PCI compliance across every autonomous financial agent."
      },
      {
        title: "Healthcare",
        desc: "Mask PHI in real-time while maintaining model accuracy for clinical decision support."
      }
    ]
  }
};

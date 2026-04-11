import { Activity, ShieldAlert, FileSignature } from 'lucide-react';

export const siteContent = {
  nav: {
    logo: "Sentra AI",
    links: [
      { label: "Product", href: "#product" },
      { label: "Security", href: "#security" },
      { label: "Use Cases", href: "#use-cases" },
      { label: "How it Works", href: "#how-it-works" }
    ]
  },
  hero: {
    badgeText: "Enterprise AI Governance v2.0",
    ctas: {
      primary: "Get Started"
    }
  },
  cta: {
    primary: "Get Started",
    secondary: "Watch Demo",
    heading: "Ready to secure your AI?",
    subheading: "Join 500+ enterprises using Sentra to observe and protect their LLM workloads."
  },
  features: {
    label: "Core Protocols",
    heading: "Universal AI Protection",
    items: [
      {
        title: "Real-time Monitoring",
        description: "Zero-latency observation of every inference request and response.",
        icon: Activity
      },
      {
        title: "Automated Guardrails",
        description: "Instant blocking of PII, prompt injection, and toxic content.",
        icon: ShieldAlert
      },
      {
        title: "Compliance Sync",
        description: "Auto-sync policies with SOC2, GDPR, and HIPAA frameworks.",
        icon: FileSignature
      }
    ]
  },
  howItWorks: {
    label: "Implementation",
    heading: "Safe in 3 Minutes",
    steps: [
      { title: "Connect", desc: "Install our sub-millisecond SDK or use our secure proxy." },
      { title: "Monitor", desc: "Get instant visibility into every token flowing through your models." },
      { title: "Enforce", desc: "Activate automated guardrails to block security threats in real-time." }
    ]
  },
  problemSection: {
    label: "The Gap",
    heading: "Current AI is a black box.",
    problems: [
      { title: "Hidden Risks", desc: "You can't see what your agents are outputting until it's too late." },
      { title: "Manual Review", desc: "reviewing logs is slow, expensive, and error-prone." }
    ],
    solution: {
      title: "The Sentra Shield",
      desc: "Sentra acts as a sub-millisecond intelligent proxy that protects your data and your reputation."
    }
  },
  useCases: {
    label: "Verticals",
    heading: "Designed for Scale",
    items: [
      { title: "Healthcare", desc: "Strict PII redaction and HIPAA compliance for patient-facing agents." },
      { title: "Fintech", desc: "Fraud detection and regulatory oversight for automated advisors." },
      { title: "SaaS", desc: "Multi-tenant monitoring and security for AI-powered feature sets." }
    ]
  },
  security: {
    heading: "Enterprise Grade Safety",
    badges: [
      { title: "Privacy First", desc: "We never store your prompt data. Processing happens in-flight." },
      { title: "SOC2 Type II", desc: "Built with the highest standards of organizational security." },
      { title: "99.99% Uptime", desc: "Deployed on global edge infrastructure for maximum reliability." }
    ]
  },
  footer: {
    description: "The intelligent safety layer for production LLMs.",
    columns: [
      { title: "Company", links: ["About", "Careers", "News"] },
      { title: "Product", links: ["Features", "Security", "Pricing"] },
      { title: "Resources", links: ["Docs", "Blog", "Support"] }
    ],
    copyright: `© ${new Date().getFullYear()} Sentra AI. All rights reserved.`
  }
};

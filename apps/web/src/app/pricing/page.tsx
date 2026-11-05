'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, Zap, Sparkles, ArrowRight, Building } from 'lucide-react';

export default function PricingPage() {
  const [annualBilling, setAnnualBilling] = useState(false);

  const plans = [
    {
      name: 'Free Trial',
      priceMonthly: 0,
      priceAnnual: 0,
      description: 'Perfect for exploring TimeFlow ERP during your initial 14-day trial.',
      features: [
        '14 Days Full Access',
        'Up to 3 Team Members',
        'Basic Time Tracking & Timers',
        'Standard Reports',
        'Community Support',
      ],
      cta: 'Get Started Free',
      highlighted: false,
      badge: '14 Days Free',
    },
    {
      name: 'Starter Plan',
      priceMonthly: 499,
      priceAnnual: 399,
      description: 'Ideal for small agencies and clinics needing structured budgeting.',
      features: [
        'Everything in Free',
        'Up to 15 Team Members',
        'Auto-Budget Sync Engine',
        'Advanced CSV Exports',
        'Email Support & Audit Logs',
      ],
      cta: 'Choose Starter',
      highlighted: false,
      badge: 'Popular',
    },
    {
      name: 'Pro Healthcare',
      priceMonthly: 699,
      priceAnnual: 579,
      description: 'Tailored for medical practices with strict compliance needs.',
      features: [
        'Everything in Starter',
        'Unlimited Team Members',
        'Clinical Compliance (CNR & Attendance)',
        'Extra Hours & Overage Approvals',
        'Permanent Lock & Hard Rejections',
        'Priority 24/7 Support',
      ],
      cta: 'Choose Pro',
      highlighted: true,
      badge: 'Best Value',
    },
    {
      name: 'Enterprise',
      priceMonthly: 999,
      priceAnnual: 849,
      description: 'Maximum security, custom workflows and dedicated infrastructure.',
      features: [
        'Everything in Pro',
        'Dedicated Database Instance',
        'Custom Domain & Branding',
        'Advanced Role-Based Permissions',
        'Dedicated Account Manager',
      ],
      cta: 'Contact Sales',
      highlighted: false,
      badge: 'Custom',
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#070D1F] text-slate-100 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Ambient Glows */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-info/10 blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#111B36] px-4 py-1.5 border border-white/10 shadow-[inset_2px_2px_5px_rgba(4,8,18,0.8)]">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
              Transparent Pricing & Plans
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Invest in Speed, Precision & Compliance
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Choose the perfect tier for your organization. Unlock advanced billing, budgeting, and healthcare workflows after your trial.
          </p>

          {/* Billing Toggle */}
          <div className="pt-4 flex items-center justify-center gap-4">
            <span className={`text-sm font-bold ${!annualBilling ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
            <button
              onClick={() => setAnnualBilling(!annualBilling)}
              className="relative h-7 w-14 rounded-full bg-[#111B36] border border-white/15 p-1 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.8)] transition-colors cursor-pointer"
            >
              <div
                className={`h-5 w-5 rounded-full bg-primary shadow-[0_0_10px_rgba(57,255,136,0.6)] transition-transform duration-300 ${
                  annualBilling ? 'translate-x-7 bg-[#38BDF8]' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-bold flex items-center gap-1.5 ${annualBilling ? 'text-white' : 'text-slate-400'}`}>
              Annual <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {plans.map((plan, idx) => {
            const price = annualBilling ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={idx}
                className={`relative flex flex-col justify-between rounded-[24px] p-6 transition-all duration-300 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-[#16254E] to-[#0D152F] border-2 border-primary shadow-[0_0_35px_rgba(57,255,136,0.25),inset_1px_1px_2px_rgba(255,255,255,0.2)] scale-105 z-20'
                    : 'bg-[#111B36]/80 backdrop-blur-xl border border-white/10 shadow-[10px_10px_30px_rgba(3,6,15,0.8),inset_1px_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25'
                }`}
              >
                {/* Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-md ${
                    plan.highlighted 
                      ? 'bg-primary text-[#0B132B] shadow-[0_0_15px_rgba(57,255,136,0.5)]' 
                      : 'bg-[#0B132B] text-white border border-white/15'
                  }`}>
                    {plan.badge}
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{plan.description}</p>

                  <div className="flex items-baseline gap-1 py-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">${price}</span>
                    <span className="text-xs text-slate-400 font-medium">/ month + taxes</span>
                  </div>

                  <div className="h-[1px] w-full bg-white/10 my-4" />

                  {/* Features List */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-200">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="pt-8">
                  <Link
                    href="/register"
                    className={`group flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                      plan.highlighted
                        ? 'bg-gradient-to-b from-[#52FF9A] to-[#2CE576] text-[#0B132B] shadow-[0_4px_20px_rgba(57,255,136,0.4)] hover:brightness-105 active:scale-95'
                        : 'bg-[#0B132B] text-white border border-white/15 hover:border-primary/50 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]'
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Guarantee */}
        <div className="rounded-[20px] bg-[#111B36]/60 backdrop-blur-md p-6 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-[14px] bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Need a Custom Enterprise Setup?</h4>
              <p className="text-xs text-slate-300 mt-0.5">We offer on-premise deployment, HIPAA compliance agreements, and custom integrations.</p>
            </div>
          </div>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-[12px] bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all whitespace-nowrap"
          >
            Talk to Engineering
          </Link>
        </div>

      </div>
    </div>
  );
}

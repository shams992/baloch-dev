import { Hero } from './Hero'
import { Packing } from './Packing'
import { Mission, StatsStrip, WhatIs, WhoCanSell } from './SectionsA'
import { CategoriesSection, HowItWorks } from './SectionsB'
import { CommunicationSection, CreateStoreCTA, DeliverySection, TrustSection } from './SectionsC'
import { BenefitsSection, CommissionSection, FinalCTA } from './SectionsD'

/**
 * The public landing page — informational & promotional by design.
 * No product grids, no seller profiles: those live in the marketplace
 * (/products, /sellers, /search, /category/:slug) after users navigate.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Packing />
      <WhatIs />
      <StatsStrip />
      <Mission />
      <WhoCanSell />
      <CategoriesSection />
      <HowItWorks />
      <CreateStoreCTA />
      <TrustSection />
      <DeliverySection />
      <CommunicationSection />
      <BenefitsSection />
      <CommissionSection />
      <FinalCTA />
    </>
  )
}

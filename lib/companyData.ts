// lib/companyData.ts
//
// EQR fundamental reference data for agent prompts.
// This is NOT hardcoded truth for all time — it is the most recent verified
// data point. Agents must base projections on this; they must not invent figures.
//
// Data source: EQR H1 FY2026 Half Year Report (published 13 March 2026)
//              Euroz Hartleys Investor Presentation (18 March 2026)

export const EQR_COMPANY_DATA = `
DATA SOURCE: EQR H1 FY2026 Half Year Report (13 March 2026) and Euroz Hartleys Investor Presentation (18 March 2026).

The following is the most recent verified company data for EQ Resources Limited (ASX:EQR). Use these figures as your baseline. You may project forward from them with clear reasoning, but never invent financial data without basis in this reference.

=== COMPANY OVERVIEW ===
EQ Resources Limited (ASX:EQR) is the largest non-Chinese tungsten producer globally, operating two mines: Barruecopardo (Spain) and Mt Carbine (Australia).

=== PRODUCTION (H1 FY2026, period ending 31 Dec 2025) ===
- Group total: 67,126 mtu WO3 (H1 FY2026)
- Barruecopardo (Spain): 56,633 mtu
- Mt Carbine (Australia): 10,493 mtu — constrained by waste stripping to access Iolanthe vein
- Q2 FY2026 alone: 38,292 mtu (+33% QoQ) — strong production ramp visible
- Current group run-rate capacity: >200,000 mtu/year
- Target capacity: 400,000 mtu/year
- Barruecopardo target installed capacity: ~14,000 mtu/month
- Mt Carbine: first access to high-grade Iolanthe vein expected Q3 FY2026
- ~650,000 tonnes of waste remaining to unlock Stage II ore (as of end Dec 2025)

=== COSTS (reference points from BFS — costs do NOT move with tungsten price) ===
- Barruecopardo historical cash cost: ~€99/mtu (~US$125/mtu) per BFS
- Mt Carbine C1 cash cost: ~US$113/mtu per BFS
- CRITICAL: Mining costs do not scale with commodity price. Higher APT prices flow predominantly to margin. Cost increases arise from inflation, energy, and labor — not from tungsten price itself. Agents must not assume costs rise proportionally with APT.

=== FINANCIAL (H1 FY2026) ===
- H1 FY2026 revenue: A$43.96M (vs A$34.84M prior year H1)
- Q2 FY2026 cash receipts from sales: A$21.8M (+49% QoQ)
- Q2 FY2026 positive operating cash flow: A$1.15M (Group level) — first positive operating cashflow milestone
- Barruecopardo generated A$14.2M operating cash flow in Q2 FY2026
- Cash on hand 31 Dec 2025: A$22.0M + A$3.2M available facilities
- Current liabilities reduced by A$24.45M in Q2 FY2026
- CEO guidance (Bradshaw): at US$700/mtu APT and full production → group EBITDA ~A$150M/year; scales roughly linearly with APT price

=== CAPITAL STRUCTURE ===
- Shares on issue: ~4.88 billion
- Major shareholder: Oaktree Capital Management
- A$56.5M additional capital raised in H1 FY2026
- Traxys €15M prepayment facility (3-year term, EURIBOR+5.5%, 6-month grace period)
- Traxys 5-year offtake agreement: minimum 3,500 tonnes WO3, index-priced at market
- Oaktree pre-royalty loan ~A$7.25M converting to equity (EGM approved 16 March 2026)
- US EXIM Bank Letter of Interest: US$34M for Mt Carbine expansion financing
- ASX All Ordinaries index inclusion: effective 24 March 2026

=== MANAGEMENT ===
- MD/CEO: Craig Bradshaw (effective 1 Oct 2025)
- Background: ex-CEO Masan High-Tech Materials (Nui Phao mine, Vietnam), ex-MD H.C. Starck (major tungsten processor)
- Deep industry expertise — operational and downstream market knowledge

=== ASSETS ===
Mt Carbine (Queensland, Australia):
- Only operational tungsten mine in Australia
- Open pit mining + 9.4M tonne low-grade historical stockpile
- Total resource: 41.36 Mt @ 0.23% WO3 (9.38M mtu contained)
- Reserve: 14.80 Mt @ 0.147% WO3 (2.18M mtu contained)
- South Wall cutback advancing toward Iolanthe high-grade vein
- Wolfram Camp exploration project (regional hub strategy)

Barruecopardo / Saloro (Salamanca, Spain):
- Largest tungsten mine in Europe
- Reserve: 13.63 Mt @ 0.136% WO3 (1.85M mtu) + surface stockpile
- Ore Reserves increased 39% (announced Oct 2025)
- 3rd ore sorter installed and commissioned in H1 FY2026
- Saturno and Valdegallegos exploration extensions underway

=== MARKET POSITION ===
- Largest non-Chinese tungsten producer globally (already in production — key differentiator vs peers)
- China controls 85%+ of global tungsten supply; export restrictions in place since Aug 2023, tightened Feb 2025
- Peer comparison: Almonty Industries (~US$2.4B market cap) still in development; EQR is producing now
- Western government tailwinds: US EXIM Bank interest, Project Vault strategic stockpiling, EU critical raw materials policy
- Traxys 5-year offtake: ~A$678M estimated value at current spot prices

=== APT PRICE HISTORY (for calibrating current environment) ===
- Jun 2025: ~US$463/mtu
- Sep 2025: ~US$615/mtu
- Dec 2025: >US$1,320/mtu
- Current price: see CURRENT MARKET DATA above (fetched live)
- Context: price has risen >300% from Feb 2025 lows driven by China export restrictions and Western supply security demand
`.trim()

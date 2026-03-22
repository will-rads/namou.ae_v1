// Full spreadsheet data from Google Sheets
// Source: https://docs.google.com/spreadsheets/d/1LINJWklrDjCwBT48dt09SGZwpATeaaEXSaRS0TwSYTI

import { type Plot, type LandCategory } from "./mock";

export interface SpreadsheetColumn {
  key: string;
  label: string;
  width: string;
}

export const SPREADSHEET_COLUMNS: SpreadsheetColumn[] = [
  { key: "plotName", label: "Plot Name", width: "min-w-[300px]" },
  { key: "area", label: "Area", width: "min-w-[200px]" },
  { key: "landUse", label: "Land Use", width: "min-w-[150px]" },
  { key: "jv", label: "JV", width: "min-w-[120px]" },
  { key: "plotArea", label: "Plot Area", width: "min-w-[120px]" },
  { key: "plotType", label: "Plot Type", width: "min-w-[200px]" },
  { key: "askingPrice", label: "Asking Price", width: "min-w-[150px]" },
  { key: "pricePerSqFt", label: "Price / sq ft", width: "min-w-[120px]" },
  { key: "gfa", label: "GFA", width: "min-w-[120px]" },
  { key: "far", label: "FAR", width: "min-w-[80px]" },
  { key: "maxHeight", label: "Max Height", width: "min-w-[200px]" },
  { key: "zoning", label: "Zoning", width: "min-w-[250px]" },
  { key: "infrastructure", label: "Infrastructure", width: "min-w-[200px]" },
  { key: "locationPin", label: "Location Pin", width: "min-w-[250px]" },
  { key: "costPerGfaSqFt", label: "Cost / GFA sq ft", width: "min-w-[130px]" },
  { key: "sellingPricePerNsa", label: "Selling Price / NSA", width: "min-w-[150px]" },
  { key: "paymentPlan", label: "Payment Plan", width: "min-w-[350px]" },
  { key: "bookingAed", label: "Booking (AED)", width: "min-w-[150px]" },
  { key: "bookingPct", label: "Booking Percentage", width: "min-w-[110px]" },
  { key: "spa", label: "SPA", width: "min-w-[200px]" },
  { key: "spaPct", label: "SPA Percentage", width: "min-w-[100px]" },
  { key: "balanceInstallments", label: "Balance & Installments", width: "min-w-[160px]" },
  { key: "balanceInstallmentsPct", label: "Balance & Installments %", width: "min-w-[110px]" },
  { key: "balanceInstallmentsMethod", label: "Balance & Installments Method", width: "min-w-[260px]" },
  { key: "landRegFee", label: "Land Registration Fee", width: "min-w-[210px]" },
  { key: "landRegFeePct", label: "Land Reg. Fee %", width: "min-w-[100px]" },
  { key: "commissionFee", label: "Commission Fee", width: "min-w-[140px]" },
  { key: "commissionFeePct", label: "Commission Fee %", width: "min-w-[110px]" },
  { key: "adminFee", label: "Admin Fee", width: "min-w-[130px]" },
  { key: "adminFeePct", label: "Admin Fee %", width: "min-w-[100px]" },
  { key: "annualServiceCharge", label: "Annual Service/Community Charge", width: "min-w-[180px]" },
  // ── Site-essential fields (used by the frontend Plot model) ──
  { key: "category", label: "Category", width: "min-w-[140px]" },
];

export type SpreadsheetRow = Record<string, string>;

const KEYS = SPREADSHEET_COLUMNS.map(c => c.key);
// Keys present in the RAW arrays (excludes columns added after initial data import)
const RAW_KEYS = KEYS.filter(k => k !== "jv");

function emptyRow(): SpreadsheetRow {
  const r: SpreadsheetRow = {};
  for (const k of KEYS) r[k] = "";
  return r;
}

export function newSpreadsheetRow(): SpreadsheetRow {
  return emptyRow();
}

// Data extracted from the Google Sheet (30 rows, 30 columns)
// Each inner array follows the KEYS order above
const RAW: string[][] = [
  // Row 1: Al Maireed Mixed-Use
  [
    "L-COM-F-20034-Al Mairid-309010475-309010476", "Al Maireed", "C+R (Mixed-Use)", "20,034.20 sq.ft", "Mixed-Use Freehold Plot",
    "7,200,000 AED", "350 AED", "60,102.60 sq.ft", "3", "Basement + Ground + 4 Floors",
    "Mixed-use (Commercial + Residential)", "Fully serviced urban plot", "https://maps.app.goo.gl/vPwinu7hV9rF8MkE9",
    "", "",
    "100% Payable immediately", "7,200,000.00", "100%", "0.00", "0%",
    "0.00", "0%", "No installments \u2013 payable upon booking",
    "288,000", "4%", "144,000", "2%", "0", "0%", "0",
  ],
  // Row 2: Al Maireed Residential
  [
    "L-RES-F-110100-Al Maireed-RP-22_ RP-44", "Al Maireed", "Residential", "110,100 sq.ft", "Master Residential Plot",
    "38,500,000 AED", "350 AED", "302,775 sq.ft", "2.75", "Basement + Ground + 1 + Roof",
    "Residential (Townhouses / Villas)", "Fully serviced plot", "https://maps.app.goo.gl/sM9dApPNbQnR1RtC6",
    "", "",
    "10% Booking/ 10% within 30 days SPA-15 instalment payment every 3 months", "7,700,000", "20%", "0", "0%",
    "30,800,000", "80%", "15 quarterly installments (~4 years)",
    "770,000", "2%", "770,000", "2%", "0", "0%", "0",
  ],
  // Row 3: D01-009
  [
    "L-RES-F-116065.95-Al Marjan Beach District-D01-009", "Al Marjan Beach District", "Residential", "116,066 sq.ft", "Inner Plot",
    "274,177,955 AED", "500 AED", "548,356 sq.ft", "4.72", "2B + G + 19",
    "Residential High-Rise Zoning", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/RAeiRMiTebWebxHV6",
    "", "",
    "5% Booking/15% within 30 days SPA/ 20%End of each year 1,2,3 & 4 from signing SPA", "13,708,898", "5%", "41,126,693", "15%",
    "219,342,364", "80%", "4 annual installments (48 months)",
    "5,483,559", "2%", "5,483,559", "2%", "1,370,890", "0.50%", "1,370,890",
  ],
  // Row 4: D02-014
  [
    "L-RES-F-121550.8-Al Marjan Beach District-D02-014", "Al Marjan Beach District", "Residential", "121,551 sq.ft", "Beachfront Residential Plot",
    "264,981,275 AED", "500 AED", "529,963 sq.ft", "4.36", "2B + G + 19",
    "Residential High-Rise Zoning", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/RAeiRMiTebWebxHV6",
    "", "",
    "5% Booking/15% within 30 days SPA/ 20%End of each year 1,2,3 & 4 from signing SPA", "13,249,064", "5%", "39,747,191", "15%",
    "211,985,020", "80%", "4 annual installments (48 months)",
    "5,299,625", "2%", "5,299,625", "2%", "3,974,719", "1.50%", "1,324,908",
  ],
  // Row 5: D02-016
  [
    "L-RES-F-124861.99-Al Marjan Beach District-D02-016", "Al Marjan Beach District", "Residential", "124,862 sq.ft", "Inner Plot",
    "AED 223,892,065", "500 AED", "447,964 sq.ft", "3.59", "2B + G + 11",
    "Residential High-Rise Zoning", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/RAeiRMiTebWebxHV6",
    "", "",
    "5% Booking/15% within 30 days SPA/ 20%End of each year 1,2,3 & 4 from signing SPA", "11,194,603", "5%", "33,583,810", "15%",
    "179,113,652", "80%", "4 annual installments (48 months)",
    "4,477,841", "2%", "4,477,841", "2%", "3,358,381", "1.50%", "1,119,910",
  ],
  // Row 6: D02-015
  [
    "L-RES-F-128225.2-Al Marjan Beach District-D02-015", "Al Marjan Beach District", "Residential", "128,225 sq.ft", "Inner Plot",
    "224,480,000", "500 AED", "448,959 sq.ft", "3.5", "2B + G + 11",
    "Residential High-Rise Zoning", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/RAeiRMiTebWebxHV6",
    "", "",
    "5% Booking/15% within 30 days SPA/ 20%End of each year 1,2,3 & 4 from signing SPA", "11,224,000", "5%", "33,672,000", "15%",
    "179,584,000", "80%", "4 annual installments (48 months)",
    "4,489,600", "2%", "4,489,600", "2%", "3,367,200", "1.50%", "1,122,398",
  ],
  // Row 7: D02-017
  [
    "L-RES-F-129827.27-Al Marjan Beach District-D02-017", "Al Marjan Beach District", "Residential", "129,287 sq.ft", "Inner Plot",
    "AED 232,793,930", "500 AED", "465,588 sq.ft", "3.59", "2B + G + 11",
    "Residential High-Rise Zoning", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/RAeiRMiTebWebxHV6",
    "", "",
    "5% Booking/15% within 30 days SPA/ 20%End of each year 1,2,3 & 4 from signing SPA", "11,639,697", "5%", "34,919,089", "15%",
    "186,235,144", "80%", "4 annual installments (48 months)",
    "4,655,879", "2%", "4,655,879", "2%", "3,491,909", "1.50%", "1,163,970",
  ],
  // Row 8: D01-010
  [
    "L-RES-F-140848.54-Al Marjan Beach District-D01-010", "Al Marjan Beach District", "Residential", "140,848.54", "Inner Plot",
    "270,268,395", "500 AED", "540,536.79", "3.84", "2B + G + 11",
    "Residential High-Rise Zoning", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/RAeiRMiTebWebxHV6",
    "", "",
    "5% Booking/15% within 30 days SPA/ 20%End of each year 1,2,3 & 4 from signing SPA", "13,513,420", "5%", "40,540,259", "15%",
    "216,214,716", "80%", "4 annual installments (48 months)",
    "5,405,368", "2%", "5,405,368", "2%", "4,054,026", "1.50%", "1,351,342",
  ],
  // Row 9: D03-001-002 Hospitality
  [
    "RAK-COM-NF-L-428,634-RAK BEACH DISTRICT-D03-001-002", "Al Marjan Beach District", "Hospitality", "428,634.84", "Hospitality Plot",
    "1,392,868,560", "1000 AED", "692,040.83", "3.2", "2B + G + 29",
    "Hospitality (hotel / branded hospitality development)", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/abZacusdbfBoV9PYA",
    "", "",
    "The Sales price shall be exclusive of VAT and other taxes, as may be applicable, which shall be charged extra on actual basis. Installment 1: 5.0% On Reservation (AED 118,136,105), Installment 2: 15.0% On SPA Signing (AED 354,408,313), Installment 3: 20.0% end of 1 year from SPA signing (AED 472,544,418), Installment 4: 20.0% end of 2 years from SPA signing (AED 472,544,418), Installment 5: 20.0% end of 3 years from SPA signing (AED 472,544,418), Installment 6: 20.0% end of 4 years from SPA signing (AED 472,544,418). Total: 100% (AED 2,362,722,090).",
    "69,643,428", "5%", "208,930,284", "15%",
    "1,114,294,848", "80%", "4 annual installments (48 months)",
    "27,857,371", "2%", "27,857,371", "2%", "20,893,028", "1.50%", "3,482,171",
  ],
  // Row 10: D10-002-015 Hospitality
  [
    "RAK-C-FH-L-660,774-RAK BEACH DISTRICT-D10-002-015", "Al Marjan Beach District", "Hospitality", "660,744", "Hospitality Plot",
    "573,718,880", "1000 AED", "744,177.72", "4.75", "2B + G + 19",
    "Retail & Convention Hotel / Hospitality Development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/khYWFNE4mAzD1wej6",
    "", "",
    "5% Booking / 15% SPA within 30 days / 80% balance over 4 years (20% annually)",
    "28,685,944", "5%", "86,057,832", "15%",
    "458,975,104", "80%", "4 annual installments (48 months)",
    "11,474,377", "2%", "11,474,377", "2%", "8,606,663", "1.50%", "4,380,820",
  ],
  // Row 11: OP-7 Mixed Use
  [
    "L-RES-F-636807.72-Al Marjan Island-OP-7", "Al Marjan Beach District", "Mixed Use", "636,807.72", "Waterfront Plot",
    "1,592,019,300", "1000 AED", "1,592,019.30", "2.5", "2B + G + 8",
    "Residential / Mixed Use Development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/riqob5Gi94PtmHkr9",
    "", "",
    "100% Payable immediately",
    "1,592,019,300", "100%", "To be signed and delivered within 30 days", "N/A",
    "N/A", "N/A", "Upfront payment (100% at booking)",
    "31,840,386", "2%", "31,840,386", "2%", "23,880,290", "1.50%", "3,980,048",
  ],
  // Row 12: D08-001 Hospitality Beachfront
  [
    "L-HOS-F-1402702.9-Ras al Khaimah-D08-001", "Al Marjan Beach District", "Hospitality", "1,402,703", "Beachfront",
    "2,805,405,800", "1000 AED", "2,805,405", "2", "2B + G + 7",
    "Hospitality Development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/NKxDnTc9cTqZer8H7",
    "", "",
    "5% Booking / 15% SPA within 30 days / 80% over 4 years (20% annually)",
    "140,270,290", "5%", "420,810,870", "15%",
    "561,081,160", "80%", "Annually for 4 years",
    "56,108,116", "2%", "56,108,116", "2%", "42,081,087", "1.50%", "7,013,515",
  ],
  // Row 13: RAK Central Commercial
  [
    "L-COM-F-134548.75-Ras al Khaimah-C-03 and C-04", "RAK Central", "Commercial", "134,548.75", "Commercial (Offices / Retail)",
    "541,343,600", "700 AED", "Plot C-03: 386,424 sq.ft / Plot C-04: 386,924 sq.ft", "Plot C-03: 5.20 / Plot C-04: 5.10", "Plot C-03: 386,424 sq.ft / Plot C-04: 386,924 sq.ft",
    "Commercial / Offices / Retail", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/ufdYaZDxBmtDvYEg8",
    "", "",
    "5% Booking / 15% SPA within 30 days / 80% over 4 years (20% annually)",
    "27,067,180", "5%", "81,201,540", "15%",
    "432,794,880", "80%", "Annually for 4 years",
    "10,826,872", "2%", "10,826,872", "2%", "8,120,154", "1.50%", "1,933,370",
  ],
  // Row 14: Al Qasimiyah 2 - Industrial 89
  [
    "L-IND-F-8072.932812532501-Bawabat Al Qasimiyah - 3-89", "Al Qasimiyah 2", "Industrial", "8,072.93", "Industrial Plot",
    "1,350,000", "167 AED", "16,145.86", "2", "G + Mezzanine + 1",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/gTZvGKwurvzrFw1K8",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 135,000 / Option 2: 270,000 / Option 3: 405,000", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 1,215,000 / Option 2: 1,080,000 / Option 3: 945,000", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 15: Al Qasimiyah 2 - Commercial 19
  [
    "L-COM-F-8072.932812532501-Bawabat Al Qasimiyah - 3-19", "Al Qasimiyah 2", "Commercial", "8,072.93", "Commercial Plot",
    "1,450,000", "179 AED", "16,145.86", "2", "G + Mezzanine + 1",
    "Commercial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/R2ybkxnradSzyrPUA",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 145,000 / Option 2: 290,000 / Option 3: 435,000", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 1,305,000 / Option 2: 1,160,000 / Option 3: 1,015,000", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 16: Al Qasimiyah 2 - Industrial 742
  [
    "L-IND-F-9687.519375039-Bawabat Al Qasimiyah - 3-742", "Al Qasimiyah 2", "Industrial", "9,687.52", "Industrial Plot",
    "1,745,000", "180 AED", "18,890.68", "2", "G + Mezzanine + 1",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/vtJstHfUZupxpVUq9",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 174,500 / Option 2: 349,000 / Option 3: 523,500", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 1,570,500 / Option 2: 1,396,000 / Option 3: 1,221,500", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 17: Al Qasimiyah 2 - Commercial 1622
  [
    "L-COM-F-7900.710245865141-Bawabat Al Qasimiyah - 2-1622", "Al Qasimiyah 2", "Commercial", "15,952.12", "Industrial Plot",
    "2,690,000", "168 AED", "31,106.33", "2", "G + Mezzanine + 1",
    "Commercial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/6EdvXei2fo3NQx3RA",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 269,000 / Option 2: 538,000 / Option 3: 807,000", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 2,421,000 / Option 2: 2,152,000 / Option 3: 1,883,000", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 18: Al Qasimiyah 2 - Commercial 735
  [
    "L-COM-F-15909.05959589738-Bawabat Al Qasimiyah - 3-735", "Al Qasimiyah 2", "Commercial", "15,909.06", "Commercial Plot",
    "2,860,000", "179 AED", "31,022.67", "2", "G + Mezzanine + 1",
    "Commercial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/u8uKNe6AirHU7MbcA",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 286,000 / Option 2: 572,000 / Option 3: 858,000", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 2,574,000 / Option 2: 2,288,000 / Option 3: 2,002,000", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 19: Al Qasimiyah 6 - Industrial 142
  [
    "L-IND-F-8072.932812532501-Bawabat Al Qasimiyah - 3-142", "Al Qasimiyah 6", "Industrial", "7,669.28", "Industrial Plot",
    "1,112,828", "145.10 AED", "15,338.56", "2", "G + Mezzanine",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/VD4UwzJ19xDBZ7kNA",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 111,282.80 / Option 2: 222,565.60 / Option 3: 333,848.40", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 1,001,545.20 / Option 2: 890,262.40 / Option 3: 778,979.60", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 20: Al Qasimiyah 6 - Industrial 300
  [
    "L-IND-F-8072.932812532501-Bawabat Al Qasimiyah - 3-300", "Al Qasimiyah 6", "Industrial", "7,871.64", "Industrial Plot",
    "1,141,828", "145.06 AED", "15,743.28", "2", "G + Mezzanine",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/nQoo6yyejomYH4by6",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 114,182.80 / Option 2: 228,365.60 / Option 3: 342,548.40", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 1,027,645.20 / Option 2: 913,462.40 / Option 3: 799,279.60", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 21: Al Qasimiyah 6 - Industrial 229
  [
    "L-COM-F-9435.63-Al Qasimiya City, Sharjah-229", "Al Qasimiyah 6", "Industrial", "9,435.63", "Industrial Plot",
    "1,363,828", "144.54 AED", "18,871.26", "2", "G + Mezzanine",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/u6bM12RoepRbik8s7",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 136,382.80 / Option 2: 272,765.60 / Option 3: 409,148.40", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 1,227,445.20 / Option 2: 1,091,062.40 / Option 3: 954,679.60", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 22: Al Qasimiyah 6 - Industrial 30
  [
    "L-COM-F-19,373.94-Al Qasimiya City, Sharjah-30", "Al Qasimiyah 6", "Industrial", "19,373.94", "Industrial Plot",
    "3,196,828", "165.01 AED", "38,747.88", "2", "G + Mezzanine",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/Y78mMJdYmQ177FX76",
    "", "",
    "Option 1: 10% down \u2013 balance over 1 year (monthly/quarterly). Option 2: 20% down \u2013 balance over 2 years (monthly/quarterly). Option 3: 30% down \u2013 balance over 3 years (monthly/quarterly).",
    "Option 1: 319,682.80 / Option 2: 639,365.60 / Option 3: 959,048.40", "Option 1: 10% / Option 2: 20% / Option 3: 30%", "Included in down payment (due at booking)", "Included in booking",
    "Option 1: 2,877,145.20 / Option 2: 2,557,462.40 / Option 3: 2,237,779.60", "Option 1: 90% / Option 2: 80% / Option 3: 70%", "Option 1: Over 12 months / Option 2: Over 24 months / Option 3: Over 36 months",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 23: Sajaa Namuzajiah - Industrial 20897
  [
    "L-IND-F-11764.95408546403-Al Sajaa Namuzajiyah-20897", "Sajaa Namuzajiah", "Industrial", "11,764.95", "Industrial Plot",
    "2,490,000", "211 AED", "15,294.44", "2", "G + Mezzanine",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/v4BndhFxPhr75Y3bA",
    "", "",
    "20% Down Payment / 80% in Installments per year (Monthly or Quarterly options)",
    "498,000", "20%", "N/A", "N/A",
    "1,992,000", "80%", "12 months",
    "Monthly Payment: AED 166,000 / Quarterly Payment: AED 498,000", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 24: Sajaa Namuzajiah - Commercial 20811
  [
    "L-COM-F-16145.865625065002-Al Sajaa Namuzajiyah-20811", "Sajaa Namuzajiah", "Commercial", "16,145.87", "Commercial Plot",
    "3,390,000", "210 AED", "20,989.63", "2", "G + Mezzanine",
    "Commercial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/7DA4FVkgtZydCM196",
    "", "",
    "20% Down Payment / 80% in Installments per year (Monthly or Quarterly options)",
    "678,000", "20%", "N/A", "N/A",
    "2,712,000", "80%", "12 months",
    "Monthly Payment: AED 226,000 / Quarterly Payment: AED 678,000", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 25: Sajaa Namuzajiah - Industrial 20895
  [
    "L-COM-F-2125-Al Sajaa Namuzajiyah-20895", "Sajaa Namuzajiah", "Industrial", "23,411.51", "Industrial Plot",
    "5,020,000", "214 AED", "30,434.96", "2", "G + Mezzanine",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/6yhPYL6urqD9ffjk6",
    "", "",
    "20% Down Payment / 80% in Installments per year (Monthly or Quarterly options)",
    "1,004,000", "20%", "N/A", "N/A",
    "4,016,000", "80%", "12 months",
    "Monthly Payment: AED 334,666.67 / Quarterly Payment: AED 1,004,000", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 26: Sajaa Namuzajiah - Commercial 20959
  [
    "L-COM-F-2175-Al Sajaa Namuzajiyah-20959", "Sajaa Namuzajiah", "Commercial", "22,873.31", "Commercial Plot",
    "4,840,000", "211 AED", "29,735.30", "2", "G + Mezzanine",
    "Commercial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/XtJWRFH79YKBAiEW9",
    "", "",
    "20% Down Payment / 80% in Installments per year (Monthly or Quarterly options)",
    "4,840,000", "20%", "N/A", "N/A",
    "3,872,000", "80%", "12 months",
    "Monthly Payment: AED 322,666.67 / Quarterly Payment: AED 968,000", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 27: Sajaa Line - Industrial 20648
  [
    "L-COM-F-16114.19-Al Sajaa Line-20648", "Sajaa Line", "Industrial", "16,114.19", "Industrial Plot",
    "4,840,000", "300 AED", "10,474.22", "2", "Ground floor only",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/VEFPGenqGgcjVK4S6",
    "", "",
    "100% Upfront Payment (No Down Payment Required)",
    "4,840,000", "100%", "included in booking", "0%",
    "N/A", "0%", "Full upfront payment",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 28: Sajaa Line - Industrial 20727
  [
    "L-COM-F-17103.11-Al Sajaa Line-20727", "Sajaa Line", "Industrial", "17,103.11", "Industrial Plot",
    "5,135,000", "300 AED", "11,116.00", "2", "Ground floor only",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/Voyp1kRJ4ZKJkUn17",
    "", "",
    "100% Upfront Payment (No Down Payment Required)",
    "5,135,000", "100%", "included in booking", "0%",
    "N/A", "0%", "Full upfront payment",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 29: Sajaa Line - Industrial 20789
  [
    "L-COM-F-23239.52-Al Sajaa Line-20789", "Sajaa Line", "Industrial", "23,239.52", "Industrial Plot",
    "7,975,000", "343 AED", "15,105.69", "2", "Ground floor only",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/RAb3Vabv2pNu4PBY8",
    "", "",
    "100% Upfront Payment (No Down Payment Required)",
    "7,975,000", "100%", "included in booking", "0%",
    "N/A", "0%", "Full upfront payment",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
  // Row 30: Sajaa Line - Industrial 20786
  [
    "L-COM-F-23746.06-Al Sajaa Line-20786", "Sajaa Line", "Industrial", "23,746.06", "Industrial Plot",
    "8,140,000", "343 AED", "15,434.94", "2", "Ground floor only",
    "Industrial development", "Fully Serviced Infrastructure", "https://maps.app.goo.gl/HqjyFFc3PU1HuH1s9",
    "", "",
    "100% Upfront Payment (No Down Payment Required)",
    "8,140,000", "100%", "included in booking", "0%",
    "N/A", "0%", "Full upfront payment",
    "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A",
  ],
];

// Convert raw arrays to keyed objects
export const ORIGINAL_SPREADSHEET_ROWS: SpreadsheetRow[] = RAW.map(row => {
  const obj: SpreadsheetRow = {};
  RAW_KEYS.forEach((key, i) => { obj[key] = row[i] ?? ""; });
  for (const k of KEYS) if (!(k in obj)) obj[k] = "";
  return obj;
});

// ── Derive defaults for the new site-essential columns ──────────────────────

const AREA_ETAS: Record<string, { airport: string; casino: string }> = {
  "Al Marjan Beach District": { airport: "~20 min", casino: "~5 min" },
  "Al Maireed": { airport: "~10 min", casino: "~20 min" },
  "Al Nakheel": { airport: "~15 min", casino: "~15 min" },
  "RAK Central": { airport: "~15 min", casino: "~15 min" },
};

function deriveCategoryFromLandUse(landUse: string): LandCategory {
  const lu = landUse.toLowerCase();
  if (lu.includes("industrial")) return "industrial";
  if (lu.includes("mixed") || lu.includes("c+r") || lu.includes("c + r")) return "mixed-use";
  if (lu.includes("hospitality")) return "commercial";
  if (lu.includes("commercial") && lu.includes("residential")) return "mixed-use";
  if (lu.includes("residential") && lu.includes("commercial")) return "mixed-use";
  if (lu.includes("commercial") || lu.includes("retail") || lu.includes("hotel")) return "commercial";
  if (lu.includes("residential")) return "residential";
  return "mixed-use";
}

for (const row of ORIGINAL_SPREADSHEET_ROWS) {
  if (!row.category) row.category = deriveCategoryFromLandUse(row.landUse || "");
  const etas = AREA_ETAS[row.area];
  if (etas) {
    if (!row.airportEta) row.airportEta = etas.airport;
    if (!row.casinoEta) row.casinoEta = etas.casino;
  }
}

// ── Derive map coordinates from Google Maps location URLs ─────────────────────

// Pre-resolved coordinates from shortened Google Maps URLs (maps.app.goo.gl).
// Each key is the short code at the end of the URL; value is [lat, lng].
const URL_COORDS: Record<string, [number, number]> = {
  "vPwinu7hV9rF8MkE9": [25.823206, 55.968924],
  "sM9dApPNbQnR1RtC6": [25.829107, 55.972191],
  "RAeiRMiTebWebxHV6": [25.665357, 55.760766],
  "abZacusdbfBoV9PYA": [25.6653611, 55.7607778],
  "khYWFNE4mAzD1wej6": [25.6653611, 55.7607778],
  "riqob5Gi94PtmHkr9": [25.661685, 55.750762],
  "NKxDnTc9cTqZer8H7": [25.681053, 55.767013],
  "ufdYaZDxBmtDvYEg8": [25.6870833, 55.7964444],
  "gTZvGKwurvzrFw1K8": [24.93988, 55.687134],
  "R2ybkxnradSzyrPUA": [24.93988, 55.687134],
  "vtJstHfUZupxpVUq9": [24.93988, 55.687134],
  "6EdvXei2fo3NQx3RA": [24.93988, 55.687134],
  "u8uKNe6AirHU7MbcA": [24.93988, 55.687134],
  "VD4UwzJ19xDBZ7kNA": [24.93988, 55.687134],
  "nQoo6yyejomYH4by6": [24.93988, 55.687134],
  "u6bM12RoepRbik8s7": [24.93988, 55.687134],
  "Y78mMJdYmQ177FX76": [24.93988, 55.687134],
  "v4BndhFxPhr75Y3bA": [25.359556, 55.6687485],
  "7DA4FVkgtZydCM196": [25.359556, 55.6687485],
  "6yhPYL6urqD9ffjk6": [25.359556, 55.6687485],
  "XtJWRFH79YKBAiEW9": [25.359556, 55.6687485],
  "VEFPGenqGgcjVK4S6": [25.344303, 55.638806],
  "Voyp1kRJ4ZKJkUn17": [25.344303, 55.638806],
  "RAb3Vabv2pNu4PBY8": [25.344303, 55.638806],
  "HqjyFFc3PU1HuH1s9": [25.344303, 55.638806],
};

/** Try to extract lat/lng from a Google Maps URL.
 *  Supports full URLs (@lat,lng or !3d/!4d patterns) and
 *  falls back to the pre-resolved lookup for shortened maps.app.goo.gl links. */
function coordsFromUrl(url: string): [number, number] | null {
  if (!url) return null;
  // Full URL: @lat,lng pattern
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  // Full URL: !3d...!4d... pattern
  const d3 = url.match(/!3d(-?\d+\.?\d*)/);
  const d4 = url.match(/!4d(-?\d+\.?\d*)/);
  if (d3 && d4) {
    const lat = parseFloat(d3[1]);
    const lng = parseFloat(d4[1]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  // Shortened URL: look up by short code
  const shortMatch = url.match(/maps\.app\.goo\.gl\/([A-Za-z0-9]+)/);
  if (shortMatch && URL_COORDS[shortMatch[1]]) return URL_COORDS[shortMatch[1]];
  return null;
}

// ── Convert spreadsheet rows → Plot[] for the rest of the site ──────────────

function parseNum(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;
}

const VALID_CATEGORIES = new Set<string>(["residential", "commercial", "industrial", "mixed-use"]);

export function spreadsheetRowsToPlots(rows: SpreadsheetRow[]): Plot[] {
  const seenIds = new Set<string>();
  return rows
    .filter((row) => row.plotName?.trim())
    .map((row, index) => {
      // Stable ID from plot name
      let id = row.plotName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60);
      if (!id) id = `plot-${index}`;
      if (seenIds.has(id)) id = `${id}-${index}`;
      seenIds.add(id);

      // Category: explicit column first, fallback to derivation from landUse
      const catRaw = (row.category || "").toLowerCase().trim();
      const category: LandCategory = VALID_CATEGORIES.has(catRaw)
        ? (catRaw as LandCategory)
        : deriveCategoryFromLandUse(row.landUse || "");

      const farVal = row.far ? parseNum(row.far) : undefined;
      const gfaVal = row.gfa ? parseNum(row.gfa) : undefined;
      // Derive coordinates from Location Pin (single source of truth)
      let latVal: number | undefined;
      let lngVal: number | undefined;
      if (row.locationPin) {
        const coords = coordsFromUrl(row.locationPin);
        if (coords) { latVal = coords[0]; lngVal = coords[1]; }
      }

      return {
        id,
        name: row.plotName.trim(),
        area: row.area || "Unknown",
        category,
        plotArea: parseNum(row.plotArea),
        askingPrice: parseNum(row.askingPrice),
        pricePerSqFt: parseNum(row.pricePerSqFt),
        landUse: row.landUse || "",
        location: row.area ? `${row.area}, Ras Al Khaimah` : "Ras Al Khaimah",
        plotType: row.plotType || "",
        airportEta: row.airportEta || "",
        casinoEta: row.casinoEta || "",
        ...(row.maxHeight ? { maxHeight: row.maxHeight } : {}),
        ...(farVal != null ? { far: farVal } : {}),
        ...(gfaVal != null ? { gfa: gfaVal } : {}),
        ...(row.zoning ? { zoning: row.zoning } : {}),
        ...(row.infrastructure ? { infrastructure: row.infrastructure } : {}),
        ...(row.paymentPlan ? { paymentPlan: row.paymentPlan } : {}),
        ...(latVal != null ? { lat: latVal } : {}),
        ...(lngVal != null ? { lng: lngVal } : {}),
        ...(row.locationPin ? { googleMapsUrl: row.locationPin } : {}),
      } satisfies Plot;
    });
}

// ── localStorage persistence ────────────────────────────────────────────────

const STORAGE_KEY = "namou_spreadsheet_override";

export function saveSpreadsheetRows(data: SpreadsheetRow[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — silently ignore */ }
}

export function loadSpreadsheetRows(): SpreadsheetRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* parse error */ }
  return null;
}

export function clearSpreadsheetRows(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

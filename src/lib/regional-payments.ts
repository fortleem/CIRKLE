export interface RegionalPayment { id: string; name: string; type: string; icon: string; description: string; checkoutUrl?: string; }
export interface RegionalService { id: string; name: string; type: string; icon: string; description: string; widget: string; }
const GLOBAL: RegionalPayment[] = [
  { id: "apple-pay", name: "Apple Pay", type: "digital_wallet", icon: "🍎", description: "Tap-to-pay with Apple", checkoutUrl: "https://apple.com/apple-pay" },
  { id: "google-pay", name: "Google Pay", type: "digital_wallet", icon: "💳", description: "Google mobile payment", checkoutUrl: "https://pay.google.com" },
  { id: "paypal", name: "PayPal", type: "digital_wallet", icon: "💳", description: "Global digital wallet", checkoutUrl: "https://paypal.com" },
  { id: "visa", name: "Visa", type: "card", icon: "💳", description: "Global card network", checkoutUrl: "https://visa.com" },
  { id: "mastercard", name: "Mastercard", type: "card", icon: "💳", description: "Global card network", checkoutUrl: "https://mastercard.com" },
  { id: "wise", name: "Wise", type: "bank_transfer", icon: "💸", description: "Low-cost international transfer", checkoutUrl: "https://wise.com" },
];
const REGIONAL: Record<string, RegionalPayment[]> = {
  SA: [{ id: "mada", name: "Mada", type: "card", icon: "💳", description: "Saudi national debit" }, { id: "stc-pay", name: "STC Pay", type: "mobile_wallet", icon: "📱", description: "STC mobile wallet" }, { id: "tabby", name: "Tabby", type: "bnpl", icon: "🛍", description: "Buy now, pay later" }, { id: "tamara", name: "Tamara", type: "bnpl", icon: "🛒", description: "BNPL for Saudi" }],
  EG: [{ id: "instapay", name: "InstaPay", type: "bank_transfer", icon: "⚡", description: "Instant bank transfers" }, { id: "vodafone-cash", name: "Vodafone Cash", type: "mobile_wallet", icon: "📱", description: "Vodafone wallet" }, { id: "fawry", name: "Fawry", type: "cash_voucher", icon: "🏪", description: "25,000+ locations" }],
  AE: [{ id: "careem-pay", name: "Careem Pay", type: "mobile_wallet", icon: "🚗", description: "Careem wallet" }, { id: "tabby-ae", name: "Tabby", type: "bnpl", icon: "🛍", description: "BNPL UAE" }],
  CN: [{ id: "alipay", name: "Alipay", type: "digital_wallet", icon: "💳", description: "Alipay H5 widget" }, { id: "wechat-pay", name: "WeChat Pay", type: "digital_wallet", icon: "💬", description: "WeChat Pay H5" }],
  IN: [{ id: "upi", name: "UPI", type: "qr", icon: "📱", description: "Instant bank transfer" }, { id: "phonepe", name: "PhonePe", type: "qr", icon: "📲", description: "India UPI app" }, { id: "paytm", name: "Paytm", type: "digital_wallet", icon: "💳", description: "India wallet" }],
  TR: [{ id: "papara", name: "Papara", type: "digital_wallet", icon: "💳", description: "Turkey digital wallet" }],
  US: [{ id: "venmo", name: "Venmo", type: "mobile_wallet", icon: "💳", description: "P2P payment" }, { id: "zelle", name: "Zelle", type: "bank_transfer", icon: "🏦", description: "US bank transfer" }, { id: "cash-app", name: "Cash App", type: "mobile_wallet", icon: "💲", description: "Block P2P" }],
  GB: [{ id: "faster-payments", name: "Faster Payments", type: "bank_transfer", icon: "🏦", description: "UK instant transfer" }, { id: "revolut", name: "Revolut", type: "digital_wallet", icon: "💳", description: "Multi-currency" }, { id: "klarna", name: "Klarna", type: "bnpl", icon: "🛍", description: "BNPL" }],
  BR: [{ id: "pix", name: "Pix", type: "qr", icon: "📱", description: "Brazil instant payment" }],
  NG: [{ id: "paystack", name: "Paystack", type: "card", icon: "💳", description: "Nigeria gateway" }, { id: "flutterwave", name: "Flutterwave", type: "card", icon: "💳", description: "Africa processor" }],
  KE: [{ id: "mpesa", name: "M-Pesa", type: "mobile_wallet", icon: "📱", description: "Kenya mobile wallet" }],
};
const SERVICES: Record<string, RegionalService[]> = {
  SA: [{ id: "careem", name: "Careem", type: "ride_hail", icon: "🚗", description: "Ride-hailing", widget: "https://careem.com" }, { id: "hungerstation", name: "HungerStation", type: "food_delivery", icon: "🍔", description: "Food delivery", widget: "https://hungerstation.com" }, { id: "noon", name: "Noon", type: "marketplace", icon: "🛍️", description: "Marketplace", widget: "https://noon.com" }, { id: "jahez", name: "Jahez", type: "food_delivery", icon: "🍽️", description: "Food delivery", widget: "https://jahez.net" }],
  EG: [{ id: "careem-eg", name: "Careem", type: "ride_hail", icon: "🚗", description: "Careem Egypt", widget: "https://careem.com" }, { id: "talabat-eg", name: "Talabat", type: "food_delivery", icon: "🍔", description: "Egypt delivery", widget: "https://talabat.com" }],
  AE: [{ id: "careem-ae", name: "Careem", type: "ride_hail", icon: "🚗", description: "Careem UAE", widget: "https://careem.com" }, { id: "talabat-ae", name: "Talabat", type: "food_delivery", icon: "🍔", description: "UAE delivery", widget: "https://talabat.com" }, { id: "noon-ae", name: "Noon", type: "marketplace", icon: "🛍️", description: "UAE marketplace", widget: "https://noon.com" }],
  CN: [{ id: "amap", name: "Amap", type: "maps", icon: "🗺️", description: "China maps", widget: "https://uri.amap.com" }, { id: "taobao", name: "Taobao", type: "marketplace", icon: "🛍️", description: "China marketplace", widget: "https://h5.m.taobao.com" }, { id: "meituan", name: "Meituan", type: "food_delivery", icon: "🍜", description: "China food delivery", widget: "https://h5.meituan.com" }],
  IN: [{ id: "swiggy", name: "Swiggy", type: "food_delivery", icon: "🍔", description: "India food delivery", widget: "https://swiggy.com" }, { id: "zomato", name: "Zomato", type: "food_delivery", icon: "🍽️", description: "Restaurant discovery", widget: "https://zomato.com" }, { id: "ola", name: "Ola", type: "ride_hail", icon: "🚗", description: "India rides", widget: "https://olacabs.com" }],
  US: [{ id: "uber", name: "Uber", type: "ride_hail", icon: "🚗", description: "Uber USA", widget: "https://uber.com" }, { id: "doordash", name: "DoorDash", type: "food_delivery", icon: "🍔", description: "US delivery", widget: "https://doordash.com" }, { id: "amazon", name: "Amazon", type: "marketplace", icon: "🛍️", description: "US marketplace", widget: "https://amazon.com" }],
  GB: [{ id: "uber-gb", name: "Uber", type: "ride_hail", icon: "🚗", description: "Uber UK", widget: "https://uber.com/gb" }, { id: "deliveroo", name: "Deliveroo", type: "food_delivery", icon: "🛵", description: "UK delivery", widget: "https://deliveroo.co.uk" }],
  TR: [{ id: "trendyol", name: "Trendyol", type: "marketplace", icon: "🛍️", description: "Turkey marketplace", widget: "https://trendyol.com" }, { id: "getir", name: "Getir", type: "food_delivery", icon: "🍔", description: "Turkey delivery", widget: "https://getir.com" }],
  BR: [{ id: "ifood", name: "iFood", type: "food_delivery", icon: "🍔", description: "Brazil delivery", widget: "https://ifood.com.br" }, { id: "99", name: "99", type: "ride_hail", icon: "🚗", description: "Brazil rides", widget: "https://99app.com" }],
  NG: [{ id: "bolt-ng", name: "Bolt", type: "ride_hail", icon: "🚗", description: "Nigeria rides", widget: "https://bolt.eu/ng" }, { id: "jumia", name: "Jumia", type: "marketplace", icon: "🛍️", description: "Africa marketplace", widget: "https://jumia.com.ng" }],
  KE: [{ id: "bolt-ke", name: "Bolt", type: "ride_hail", icon: "🚗", description: "Kenya rides", widget: "https://bolt.eu/ke" }, { id: "jumia-ke", name: "Jumia", type: "marketplace", icon: "🛍️", description: "Kenya marketplace", widget: "https://jumia.co.ke" }],
};
// Global fallback services — available in 100+ countries worldwide.
// Used when a country has no native SERVICES entry, so no country is ever empty.
const GLOBAL_SERVICES: RegionalService[] = [
  { id: "uber-global", name: "Uber", type: "ride_hail", icon: "🚗", description: "Ride-hailing (80+ countries)", widget: "https://m.uber.com" },
  { id: "uber-eats-global", name: "Uber Eats", type: "food_delivery", icon: "🍔", description: "Food delivery (45+ countries)", widget: "https://ubereats.com" },
  { id: "amazon-global", name: "Amazon", type: "marketplace", icon: "🛍️", description: "Global marketplace", widget: "https://amazon.com" },
  { id: "airbnb-global", name: "Airbnb", type: "marketplace", icon: "🏠", description: "Stays & experiences", widget: "https://airbnb.com" },
  { id: "booking-global", name: "Booking.com", type: "marketplace", icon: "🏨", description: "Hotels worldwide", widget: "https://booking.com" },
];
export function getRegionalPayments(cc: string): RegionalPayment[] { return [...(REGIONAL[cc.toUpperCase()] || []), ...GLOBAL]; }
export function getRegionalServices(cc: string): RegionalService[] {
  const upper = cc.toUpperCase();
  const native = SERVICES[upper] || [];
  // Every country gets native services (if defined) PLUS the global fallback set.
  // This ensures all 246 countries have at least 5 services available.
  return [...native, ...GLOBAL_SERVICES];
}

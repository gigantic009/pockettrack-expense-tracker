export const money = value => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(value) || 0);

export const todayInIndia = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());

export const monthOf = date => String(date).slice(0,7);

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;',"'":"&#39;"
}[char]));

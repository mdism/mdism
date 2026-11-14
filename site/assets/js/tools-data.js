/* =========================================================
   FREE TOOLS DATA: the one place to edit.
   Used by the "Free Tools" menu on every page and by /tools.

   INDUSTRIES: headings in the menu and filter chips on /tools.
     Add, rename, reorder or remove a line here. "id" is used in
     links (tools/?industry=<id>), so keep it short and lowercase.
     An industry with no tools is hidden automatically.

   INDUSTRY_TOOLS: software listed under one or more industries.
     industries: list of INDUSTRIES ids it belongs to.
     type: short label shown next to the name.

   TOOLS: small browser tools at tools.shaikhismail.com.
     status: "live" shows a link, "soon" shows a placeholder.
     repo: optional GitHub link, shown as "Source" on live tools.
   ========================================================= */
window.INDUSTRIES = [
  { id: "manufacturing", name: "Manufacturing" },
  { id: "wholesale",     name: "Wholesale" },
  { id: "healthcare",    name: "Healthcare" },
  { id: "construction",  name: "Construction" },
];

window.INDUSTRY_TOOLS = [
  { name: "Roofing ERP", type: "ERP", icon: "Rf", desc: "ERP for roofing solution providers.", url: "https://roofingerp.demo.shaikhismail.com", industries: ["construction", "manufacturing", "wholesale"] },
  { name: "ShifaCare", type: "Clinic management", icon: "Sc", desc: "Clinic management system.", url: "https://shifacare.shaikhismail.com/", industries: ["healthcare"] },
];

window.TOOLS = [
  { name: "Image Compressor", icon: "Im", desc: "Shrink JPG and PNG files right in your browser. Nothing is uploaded.", url: "https://tools.shaikhismail.com/image-compressor/", repo: "https://github.com/mdism/image-compressor", status: "live" },
  { name: "PDF Merge", icon: "Mg", desc: "Combine PDFs into one file, and compress or enhance the result. Scanned or digital.", url: "https://tools.shaikhismail.com/pdf-merge/", repo: "https://github.com/mdism/pdf-merge", status: "live" },
  { name: "PDF Split", icon: "Sp", desc: "Split a PDF into pages or ranges, and compress or enhance the result. Scanned or digital.", url: "https://tools.shaikhismail.com/pdf-split/", repo: "https://github.com/mdism/pdf-split", status: "live" },
  { name: "PDF to Image", icon: "P→", desc: "Turn every page of a PDF into a JPG or PNG image, right in your browser.", url: "https://tools.shaikhismail.com/pdf-to-image/", repo: "https://github.com/mdism/pdf-to-image", status: "live" },
  { name: "Image to PDF", icon: "→P", desc: "Turn photos and scans into a PDF. Arrange and rotate them first, all in your browser.", url: "https://tools.shaikhismail.com/image-to-pdf/", repo: "https://github.com/mdism/image-to-pdf", status: "live" },
  { name: "PDF Merge & Split", icon: "Pd", desc: "Combine PDFs into one, or pull out the pages you need.", url: "https://tools.shaikhismail.com/pdf-merge-split/", repo: "https://github.com/mdism/pdf-merge-split", status: "live" },
  { name: "Exam Photo Resizer", icon: "Ph", desc: "Resize photos and signatures to exact KB and pixel sizes for exam forms.", url: "https://tools.shaikhismail.com/exam-photo-resizer/", repo: "https://github.com/mdism/exam-photo-resizer", status: "live" },
  { name: "GST & EMI Calculator", icon: "₹", desc: "Quick GST, EMI and SIP calculations with clear breakdowns.", url: "https://tools.shaikhismail.com/gst-emi-calculator/", repo: "https://github.com/mdism/gst-emi-calculator", status: "live" },
  { name: "Age Calculator", icon: "Ag", desc: "Find your exact age in years, months, days, hours, minutes and seconds.", url: "https://tools.shaikhismail.com/age-calculator/", repo: "https://github.com/mdism/age-calculator", status: "live" },
];

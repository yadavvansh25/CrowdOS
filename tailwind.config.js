/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "#10131a", "on-surface": "#e1e2ec",
        "surface-container": "#1d2027", "surface-container-lowest": "#0b0e15",
        "surface-container-low": "#191b23", "surface-container-high": "#272a31",
        "surface-container-highest": "#32353c", "surface": "#10131a",
        "surface-dim": "#10131a", "surface-bright": "#363941",
        "surface-variant": "#32353c", "on-surface-variant": "#c2c6d6",
        "outline": "#8c909f", "outline-variant": "#424754",
        "primary": "#adc6ff", "on-primary": "#002e6a",
        "primary-container": "#4d8eff", "on-primary-container": "#00285d",
        "secondary": "#b7c8e1", "on-secondary": "#213145",
        "secondary-container": "#3a4a5f", "on-secondary-container": "#a9bad3",
        "tertiary": "#ffb786", "on-tertiary": "#502400",
        "tertiary-container": "#df7412", "on-tertiary-container": "#461f00",
        "error": "#ffb4ab", "on-error": "#690005",
        "error-container": "#93000a", "on-error-container": "#ffdad6",
        "inverse-surface": "#e1e2ec", "inverse-on-surface": "#2e3038",
        "surface-tint": "#adc6ff", "inverse-primary": "#005ac2",
        "on-background": "#e1e2ec",
      },
      borderRadius: { "DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "2xl": "0.75rem", "full": "9999px" },
      spacing: { "unit": "4px", "stack-sm": "8px", "stack-md": "16px", "stack-lg": "24px", "gutter": "16px", "cell-padding-v": "8px", "cell-padding-h": "12px" },
      fontFamily: { "mono-data": ["JetBrains Mono"] },
      fontSize: {
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "title-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "mono-data": ["13px", { lineHeight: "18px", fontWeight: "500" }],
      }
    }
  },
  plugins: [],
}

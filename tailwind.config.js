/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f2f6ff",
        ink: "#020712",
        blue: "#0047ff",
        electric: "#0bff8a",
        mist: "#c9d9ff"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "Clash Display", "Plus Jakarta Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        halo: "0 24px 80px rgba(0, 71, 255, 0.34)",
        plate: "0 34px 120px rgba(1, 19, 56, 0.18)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.32,0.72,0,1)"
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(circle at 76% 18%, rgba(0,71,255,0.52), transparent 32%), linear-gradient(135deg, #020712 0%, #06173d 54%, #0047ff 100%)",
        "shine-text": "linear-gradient(110deg, #020712 8%, #0039ff 46%, #020712 86%)"
      }
    }
  },
  plugins: []
};

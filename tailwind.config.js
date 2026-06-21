/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#eef4ff",
        ink: "#05060b",
        blue: "#0347ff",
        electric: "#7da2ff",
        mist: "#d8e4ff"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "Clash Display", "Plus Jakarta Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        halo: "0 26px 90px rgba(3, 71, 255, 0.38)",
        plate: "0 34px 120px rgba(5, 6, 11, 0.22)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.32,0.72,0,1)"
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(circle at 76% 18%, rgba(3,71,255,0.58), transparent 32%), linear-gradient(135deg, #05060b 0%, #071131 52%, #0347ff 100%)",
        "shine-text": "linear-gradient(110deg, #05060b 8%, #0347ff 46%, #05060b 86%)"
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f4f7fb",
        ink: "#020712",
        blue: "#0039ff",
        electric: "#4f7dff",
        mist: "#dfe7f5"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "Clash Display", "Plus Jakarta Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        halo: "0 24px 80px rgba(0, 57, 255, 0.18)",
        plate: "0 30px 110px rgba(1, 19, 56, 0.12)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.32,0.72,0,1)"
      },
      backgroundImage: {
        "hero-mesh":
          "linear-gradient(135deg, rgba(0,57,255,0.12), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.78), transparent 45%)",
        "shine-text": "linear-gradient(110deg, #020712 8%, #0039ff 46%, #020712 86%)"
      }
    }
  },
  plugins: []
};

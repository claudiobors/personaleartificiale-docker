/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#050506",
        graphite: "#0b0d10",
        vapor: "#f5f8ff",
        mercury: "#9aa4b2",
        plasma: "#7c5cff",
        cyan: "#39e7f5",
        aurora: "#2df8a2",
        ember: "#ff8a4c"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "Clash Display", "Plus Jakarta Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        halo: "0 0 54px rgba(57, 231, 245, 0.22)",
        plasma: "0 0 80px rgba(124, 92, 255, 0.28)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.32,0.72,0,1)"
      },
      backgroundImage: {
        "hero-mesh":
          "linear-gradient(118deg, rgba(124,92,255,0.22), transparent 34%), linear-gradient(242deg, rgba(45,248,162,0.14), transparent 30%), linear-gradient(180deg, rgba(57,231,245,0.12), transparent 36%)",
        "shine-text": "linear-gradient(110deg, #ffffff 8%, #9defff 34%, #9b87ff 58%, #ffffff 86%)"
      }
    }
  },
  plugins: []
};

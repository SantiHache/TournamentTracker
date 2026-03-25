export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brandGreen: "#18a558",
        brandViolet: "#7b3fe4",
        ink: "#1f1d2e",
        sky: "#f4fbff",
      },
      fontFamily: {
        display: ["Poppins", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 14px 42px rgba(31, 29, 46, 0.12)",
      },
    },
  },
  plugins: [],
};

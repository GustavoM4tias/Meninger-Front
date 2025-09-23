module.exports = {
  darkMode: 'class', // ativar dark mode via classe
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js",
    "./node_modules/flowbite-vue/**/*.{js,vue,ts}"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("flowbite/plugin")
  ]
}

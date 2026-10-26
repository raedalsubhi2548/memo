// A soft placeholder in the store's colours with the logo, shown until the owner uploads a real product photo.
export function coverFor() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs><radialGradient id="b" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#fffaf8"/><stop offset="1" stop-color="#f0dcd8"/></radialGradient></defs>
<rect width="400" height="400" fill="url(#b)"/>
<circle cx="200" cy="190" r="78" fill="none" stroke="#c9a08f" stroke-width="2"/>
<image href="/logo-300.png" x="126" y="116" width="148" height="148"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

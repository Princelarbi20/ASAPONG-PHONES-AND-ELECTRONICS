import React, { useLayoutEffect, useRef, useState } from 'react'

// Fonts (Google Fonts). The browser only downloads the ones that are actually used.
// If they can't load, the system fonts are used instead.
const titleFontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&family=Sora:wght@500;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600;1,800&family=Space+Grotesk:wght@500;700&family=Outfit:wght@500;800&family=Manrope:wght@500;800&family=Syne:wght@500;800&family=Poppins:wght@500;800&display=swap');
  .pl-font-jakarta { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-sora { font-family: 'Sora', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-playfair { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
  .pl-font-grotesk { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-outfit { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-manrope { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-syne { font-family: 'Syne', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-poppins { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }
`

// Same 8 title styles used by ProductList. Full class strings so Tailwind can detect them.
export const TITLE_THEMES = [
  { // 0 - rose, clean sans
    font: 'pl-font-jakarta',
    size: 'text-3xl sm:text-4xl lg:text-5xl',
    heading: 'font-extrabold tracking-tight',
    accent: 'bg-gradient-to-r from-red-600 to-rose-500',
    accentExtra: '',
    band: 'via-rose-100/60',
    bar: 'h-1 w-12 rounded-full bg-gradient-to-r from-red-600 to-rose-400',
  },
  { // 1 - indigo to sky, geometric sans
    font: 'pl-font-sora',
    size: 'text-3xl sm:text-4xl lg:text-5xl',
    heading: 'font-extrabold tracking-tight',
    accent: 'bg-gradient-to-r from-indigo-600 to-sky-500',
    accentExtra: '',
    band: 'via-indigo-100/60',
    bar: 'h-1 w-16 rounded-full bg-gradient-to-r from-indigo-600 to-sky-400',
  },
  { // 2 - emerald, editorial serif
    font: 'pl-font-playfair',
    size: 'text-3xl sm:text-4xl lg:text-5xl',
    heading: 'font-bold tracking-tight',
    accent: 'bg-gradient-to-r from-emerald-600 to-teal-500',
    accentExtra: 'italic',
    band: 'via-emerald-100/60',
    bar: 'h-px w-20 bg-gradient-to-r from-transparent via-emerald-600 to-transparent',
  },
  { // 3 - amber to orange, uppercase grotesk
    font: 'pl-font-grotesk',
    size: 'text-2xl sm:text-3xl lg:text-4xl',
    heading: 'font-bold uppercase tracking-wide',
    accent: 'bg-gradient-to-r from-amber-500 to-orange-600',
    accentExtra: '',
    band: 'via-amber-100/70',
    bar: 'h-1.5 w-10 rounded-sm bg-gradient-to-r from-amber-500 to-orange-600',
  },
  { // 4 - violet to fuchsia, rounded sans with italic accent
    font: 'pl-font-outfit',
    size: 'text-3xl sm:text-4xl lg:text-5xl',
    heading: 'font-extrabold tracking-tighter',
    accent: 'bg-gradient-to-r from-violet-600 to-fuchsia-500',
    accentExtra: 'italic',
    band: 'via-violet-100/60',
    bar: 'h-1 w-14 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400',
  },
  { // 5 - cyan to blue, modern sans
    font: 'pl-font-manrope',
    size: 'text-3xl sm:text-4xl lg:text-5xl',
    heading: 'font-extrabold tracking-tight',
    accent: 'bg-gradient-to-r from-cyan-600 to-blue-500',
    accentExtra: '',
    band: 'via-cyan-100/60',
    bar: 'h-1 w-10 rounded-full bg-gradient-to-r from-cyan-600 to-blue-500',
  },
  { // 6 - graphite, bold display
    font: 'pl-font-syne',
    size: 'text-3xl sm:text-4xl lg:text-5xl',
    heading: 'font-extrabold tracking-tight',
    accent: 'bg-gradient-to-r from-slate-900 to-slate-500',
    accentExtra: '',
    band: 'via-slate-200/70',
    bar: 'h-1 w-12 rounded-full bg-slate-900',
  },
  { // 7 - pink to purple, friendly sans
    font: 'pl-font-poppins',
    size: 'text-3xl sm:text-4xl lg:text-5xl',
    heading: 'font-extrabold tracking-tight',
    accent: 'bg-gradient-to-r from-pink-600 to-purple-600',
    accentExtra: '',
    band: 'via-pink-100/60',
    bar: 'h-1 w-12 rounded-full bg-gradient-to-r from-pink-600 to-purple-500',
  },
]

const mod = (n, m) => ((n % m) + m) % m

const hashIndex = (text) => {
  let hash = 0
  for (const ch of String(text || '').toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % TITLE_THEMES.length
}

/**
 * Centered section title on a soft fading gradient.
 *
 * Which style it uses:
 *   1. `position` prop (0, 1, 2 ...)   - you choose the slot explicitly
 *   2. otherwise `category` prop       - a stable style picked from the category name
 *   3. otherwise automatic position    - the order of this title among all <SectionTitle />
 *                                        elements in the page, top to bottom
 *
 * `children` is an optional action (e.g. a "View All" link) pinned to the right on large screens.
 */
const SectionTitle = ({ lead, accent, subtitle, position, category, children, className = '' }) => {
  const rootRef = useRef(null)
  const [autoPosition, setAutoPosition] = useState(0)

  // Automatic position = where this title sits among all titles on the page.
  useLayoutEffect(() => {
    if (position != null || category) return
    const all = document.querySelectorAll('[data-section-title]')
    const found = Array.prototype.indexOf.call(all, rootRef.current)
    setAutoPosition(found < 0 ? 0 : found)
  }, [position, category])

  const themeIndex =
    position != null ? mod(position, TITLE_THEMES.length)
    : category ? hashIndex(category)
    : mod(autoPosition, TITLE_THEMES.length)

  const theme = TITLE_THEMES[themeIndex]

  return (
    <div
      ref={rootRef}
      data-section-title=""
      className={`relative w-full overflow-hidden rounded-3xl bg-gradient-to-r from-transparent ${theme.band} to-transparent px-4 py-7 text-center md:py-10 ${className}`}
    >
      <style dangerouslySetInnerHTML={{ __html: titleFontStyle }} />

      <h2 className={`${theme.font} ${theme.size} ${theme.heading} leading-[1.1] text-slate-900`}>
        {lead}
        {accent && (
          <>
            {' '}
            <span className={`${theme.accent} ${theme.accentExtra} bg-clip-text pr-1 text-transparent`}>
              {accent}
            </span>
          </>
        )}
      </h2>

      {subtitle && (
        <p className={`${theme.font} mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-500 md:text-base`}>
          {subtitle}
        </p>
      )}

      <span aria-hidden="true" className={`mx-auto mt-5 block ${theme.bar}`} />

      {children && (
        <div className="mt-5 lg:absolute lg:right-6 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">{children}</div>
      )}
    </div>
  )
}

export default SectionTitle
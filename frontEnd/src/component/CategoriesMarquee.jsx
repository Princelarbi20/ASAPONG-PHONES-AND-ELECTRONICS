import React from 'react'
import { AdvertData } from '../Data/Data'

export const CategoriesMarquee = () => {
  return (
    <div className="w-full bg-indigo-950 py-3 overflow-hidden relative">
      <div className="flex animate-marquee whitespace-nowrap gap-12 text-sm font-semibold text-indigo-200 tracking-widest uppercase">
        {[...AdvertData, ...AdvertData].map((item, index) => (
          <span key={index} className="mx-6">{item.name}</span>
        ))}
      </div>
    </div>
  )
}

export default CategoriesMarquee
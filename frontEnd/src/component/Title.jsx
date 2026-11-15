import React from 'react'

const Title = ({ text1, text2, text1className = '', text2className = '', className = '' }) => {
  return (
    <div className={`w-full flex items-center gap-2 py-8 text-xl md:text-2xl ${className}`}>
      <h2 className="uppercase tracking-wide">
        <span className={text1className}>
          {text1}{' '}
        </span>
        <span className={`prata-regular font-semibold normal-case ${text2className}`}>
          {text2}
        </span>
      </h2>
      <p className="w-8 sm:w-12 h-[2px] bg-gray-700 shrink-0 mt-1"></p>
    </div>
  )
}

export default Title
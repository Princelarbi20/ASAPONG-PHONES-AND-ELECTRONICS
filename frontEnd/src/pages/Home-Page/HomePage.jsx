import React, { useState } from 'react'
import Navbar from '../../component/NavBar'
import { Outlet } from 'react-router-dom'
import CategoriesMarquee from '@/component/CategoriesMarquee'
export const HomePage = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')

  return (
    <div className='screen w-full'>
      <Navbar globalSearchQuery={globalSearchQuery} setGlobalSearchQuery={setGlobalSearchQuery} />
      <main>
       <CategoriesMarquee />
        <div className='w-full'>
         <Outlet />
        </div>
         
      </main>
    </div>
  )
}

export default HomePage

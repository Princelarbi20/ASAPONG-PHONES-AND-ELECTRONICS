import React from 'react'
import Hero from '../../component/Hero'
import OurPolicy from '../../component/OurPolicy'
import DestopCategrory from '@/component/DestopCategrory'
import NewArrivals from './NewArrivals'
import BestSellers from './BestSellers'
import ProductList from '../../component/ProductList'
import PosterDisplay from '@/component/PosterDisplay'
import Footer from '@/component/Footer'
const LandingPage = () => {
  return (
    <div className="w-full">
      <Hero />
      <div className='pl-4 pr-4'>
         <DestopCategrory />
         <NewArrivals />
         <PosterDisplay category='Television' />
         <BestSellers />
         <ProductList category="phones" linkTo="/phones" />
         <PosterDisplay category="Speakers" />
         <ProductList category="fridge" linkTo="/fridge" />
         <PosterDisplay category='Accessories'/>
         <ProductList category="washing machine" linkTo="/washing-machines" />
         <PosterDisplay category='washing machine' />
         <ProductList category="laptops" linkTo="/laptops"/>
         <ProductList category="television" linkTo="/television"/>
         <ProductList category="Accessories " linkTo="/accessories" />
         <ProductList category="Speakers" linkTo="/speakers"/>
        <OurPolicy />
       
      </div>
      <div>
         <Footer/>
      </div>
    </div>
  )
}

export default LandingPage


import React from 'react'
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

      {/* Hero Poster */}
      <div className="mb-10">
        <PosterDisplay category="all" />
      </div>

      {/* Homepage Sections */}
      <div className="px-2 space-y-10">

        <DestopCategrory />

        <NewArrivals />

        <PosterDisplay category="Television" />


        <ProductList category="phones" linkTo="/phones" />

         <BestSellers />

        <PosterDisplay category="Speakers" />

        <ProductList category="fridge" linkTo="/fridge" />

        <PosterDisplay category="Accessories" />

        <ProductList
          category="washing machine" linkTo="/washing-machines"
        />

        <PosterDisplay category="washing machine" />

        <ProductList category="laptops" linkTo="/laptops" />

        <ProductList category="television" linkTo="/television" />

        <ProductList category="Accessories" linkTo="/accessories" />

        <ProductList category="Speakers" linkTo="/speakers" />

        <OurPolicy />

      </div>

      {/* Footer */}
      <Footer />

    </div>
  )
}

export default LandingPage

import React from 'react'
import Title from './Title'
import { ShieldCheck, Truck, RefreshCw, Headphones, Star, CreditCard } from 'lucide-react'

const ourSpecsData = [
  { title: 'Secure Payments', description: 'All transactions are encrypted and fully protected.', accent: '#4f46e5', icon: ShieldCheck },
  { title: 'Fast Delivery', description: 'Get your products delivered swiftly to your doorstep.', accent: '#0891b2', icon: Truck },
  { title: '7-Day Returns', description: 'Not satisfied? Return it hassle-free within 7 days.', accent: '#059669', icon: RefreshCw },
  { title: '24/7 Support', description: 'Our support team is available round-the-clock for you.', accent: '#d97706', icon: Headphones },
  { title: 'Top Rated Products', description: 'Only curated, highly rated gadgets from top brands.', accent: '#db2777', icon: Star },
  { title: 'Easy Installments', description: 'Buy now, pay later with flexible EMI options.', accent: '#7c3aed', icon: CreditCard },
]

const OurSpecs = () => {

    return (
        <div className='px-6 my-20 max-w-6xl mx-auto'>
            <Title visibleButton={false} title='Our Specifications' description="We offer top-tier service and convenience to ensure your shopping experience is smooth, secure and completely hassle-free." />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 gap-y-10 mt-26'>
                {
                    ourSpecsData.map((spec, index) => {
                        return (
                            <div className='relative h-44 px-8 flex flex-col items-center justify-center w-full text-center border rounded-lg group' style={{ backgroundColor: spec.accent + 10, borderColor: spec.accent + 30 }} key={index}>
                                <h3 className='text-slate-800 font-medium'>{spec.title}</h3>
                                <p className='text-sm text-slate-600 mt-3'>{spec.description}</p>
                                <div className='absolute -top-5 text-white size-10 flex items-center justify-center rounded-md group-hover:scale-105 transition' style={{ backgroundColor: spec.accent }}>
                                    <spec.icon size={20} />
                                </div>
                            </div>
                        )
                    })
                }
            </div>

        </div>
    )
}

export default OurSpecs
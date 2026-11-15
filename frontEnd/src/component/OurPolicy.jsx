import React from 'react'

const OurPolicy = () => {
    const handleForms=(event)=>{
         event.preventDefault()
    }
  return (
    <div className='flex flex-col items-center text-gray-600 font-medium mt-30 w-full'>

        <div className='flex sm:gap-30 mb-8'>
            <div className='flex  items-center justify-center flex-col text-sm'>
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>

                <p className='text-[11px] text-gray-400'>We offer hassle free exchange policy</p>
            </div>

             <div className='flex  items-center justify-center flex-col text-sm'>
                <svg className='text-black w-5 mb-3' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-4.72 4.72a.75.75 0 1 1-1.06-1.06l4.72-4.72h-2.69a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clip-rule="evenodd" /></svg>

                <p className='font-semibold '>Best customer support</p>
                <p className='text-[11px] text-gray-400'>We provide 24/7 customer assistance</p>
            </div>


             <div className='flex  items-center justify-center flex-col text-sm'>
                <svg className='text-black w-6 mb-3' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" /></svg>
                <p className='font-semibold '>7 Days Return Policy</p>
                <p className='text-[11px] text-gray-400'>We provide 7 days return   policy</p>
            </div>
            
            
        </div>
         <div>
             <p className='text-center font-bold text-black'>Subscribe now & get 30% off</p>
             <p className='text-gray-500 text-[12px]'>the first to discover new arrivals, special offers, and style inspiration</p>
         </div>

         <form onClick={handleForms} className=' flex items-center w-full items-center justify-center mt-10 mb-10'>
            <div >
            <input type='email' required placeholder='Enter your email' className="p-2 border w-1/2 border-gray-300 outline-none focus:outline-none focus:ring-0 "/>
            <button type='submit' className='text-gray-500 bg-gray-900 p-[10px] text-sm'>SUBSCRIBE</button>
        </div>
         </form>
        <div className='flex items-center justify-center gap-5'>
        </div>
    </div>
  )
}

export default OurPolicy
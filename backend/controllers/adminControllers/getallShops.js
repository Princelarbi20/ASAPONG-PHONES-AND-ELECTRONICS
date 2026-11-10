import { ShopRequest } from "../../modules/shopRequestSchema.js";
export const allShops = async(req,res)=>{
   try{
     const shops= await ShopRequest.find()
   return res.status(200).json({
        success:true,
        message: shops.length ? "Available shops retrieved." : "No shops are registered yet.",
    shops
    })
   }
   catch(error){
    console.error("Error in fecthing shops",error)
    return res.status(500).json({
          success: false,
          message: "An internal server error occurred."
      });
   }
}

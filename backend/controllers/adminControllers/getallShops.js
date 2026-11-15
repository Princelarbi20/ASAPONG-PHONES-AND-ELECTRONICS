import { ShopRequest } from "../../modules/shopRequestSchema.js";
export const allShops = async(req,res)=>{
   try{
     const shops= await ShopRequest.find()
    if(!shops || shops.length<1){
       return res.status(404).json({
            success:false,
            message:"There is no availabel Shops at6 the moment"
        })
    }
   return res.status(200).json({
        success:true,
        message:"This are the available shops",
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
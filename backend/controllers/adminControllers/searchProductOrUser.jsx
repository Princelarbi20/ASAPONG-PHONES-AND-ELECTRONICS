import { Register } from "../../modules/userRegister";
import { ShopRequest } from "../../modules/shopRequestSchema";
export const SearchP=async(req,res)=>{
 try{
       const {userID}=req.body
    if(!userID){
        return status(400).json({
            success:fale,
            message:"provide id for what you need"
        })
    }
    const findUser= await Register.findById({userID})
    if(findUser){
        return res.status(200).json({
            success:true,
            message:"user find successfull",
            user:{}
        })
    }

    const findShop =await ShopRequest.findById({userID})
   
 }
 catch(error){}
}
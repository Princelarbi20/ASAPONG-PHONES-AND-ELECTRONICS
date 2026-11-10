 const isDellaer =async(req,res,next)=>{
    try{
        if(!req.user){
            return res.status(400).json({
                success:false,
                message:"Unauthorized"
            })
        }
        if(req.user.role!=="DEALER"){
             return res.status(400).json({
                success:false,
                message:"Unauthorized Dellaer access only"
            })
        }
        next()
    }
    catch(err){
      next(err)
    }
}

export default isDellaer

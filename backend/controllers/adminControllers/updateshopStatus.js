import { ShopRequest } from "../../modules/shopRequestSchema.js";

export const updateshopStatus = async (req, res) => {
    try {
        // 1. Fix: Get shopName from req.body, not res.body
        const { shopName, status } = req.body; 
         
        if(!shopName || !status){
               return res.status(400).json({
                success: false,
                message: "Sorry shop name and status are requiered"
            });
        }
        // 2. Find the shop in the database
        const findShop = await ShopRequest.findOne({ shopName });

        // 3. If the shop doesn't exist, return early with a 404/400
        if (!findShop) {
            return res.status(404).json({
                success: false,
                message: "Sorry, this shop is not available"
            });
        }

        // 4. Update the status and save it to the database
        findShop.status = status || "updatedStatus"; // Pass the new status from req.body
        await findShop.save();

        // 5. Return success after a successful database update
        return res.status(200).json({
            success: true,
            message: "Shop status updated successfully",
            data: findShop
        });

    } catch (err) {
        // 6. Fix: Corrected the console error logging syntax
        console.error(`There is an error in the request: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
import { Register } from '../../modules/userRegister.js';
import { ShopRequest } from '../../modules/shopRequestSchema.js';
import { clearAuthCookies } from '../../utils/authCookies.js';

export const userLogoutController = async (req, res, next) => {
    try {
        const accountModel = req.user?.accountType === 'DEALER' ? ShopRequest : Register;
        if (req.user?.id) {
            await accountModel.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
        }

        clearAuthCookies(res);
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully. Authentication cookies cleared.',
        });
    } catch (error) {
        return next(error);
    }
};

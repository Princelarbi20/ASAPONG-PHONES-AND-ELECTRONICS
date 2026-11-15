import { ShopRequest } from "../../modules/shopRequestSchema.js";


 const getAllShopRequests = async (req, res) => {
  try {
    const requests = await ShopRequest.find()
      .populate('owner', 'name email') 
      .sort({ createdAt: -1 }); 

    // Transform relative local URLs into full static links for the frontend
    const formattedRequests = requests.map(request => {
      const doc = request.toObject();

      // Only format certificates if role is DEALER (Adjust string if "DELLAER" was intentional)
      if (doc.role === "DEALER" || doc.role === "DELLAER") {
        doc.shopCertificates = (doc.shopCertificates || []).map(cert => {
          if (cert.url && cert.url.startsWith('/')) {
            cert.url = `${req.protocol}://${req.get('host')}${cert.url}`;
          }
          return cert;
        });
      }
      
      return doc;
    });

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      data: formattedRequests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getShopStatusByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide an email address." });
    }

    // Double check if this should be 'Register' or 'ShopRequest'
    const requests = await Register.find({ businessEmail: email.toLowerCase() })
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(request => {
      const doc = request.toObject();
      doc.shopCertificates = (doc.shopCertificates || []).map(cert => {
        if (cert.url && cert.url.startsWith('/')) {
          cert.url = `${req.protocol}://${req.get('host')}${cert.url}`;
        }
        return cert;
      });
      return doc;
    });

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      data: formattedRequests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 3. ADMIN ONLY: Approve a Shop Application
// =========================================================================
export const approveShopRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const shop = await Register.findById(id);

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop request not found." });
    }

    if (shop.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: "This shop has already been approved." });
    }

    // Update status to APPROVED
    shop.status = 'APPROVED';
    if (adminNotes) shop.adminNotes = adminNotes;
    
    // Optional: If you pass an owner ID now to officially link it to a newly created User account:
    if (req.body.ownerId) {
      shop.owner = req.body.ownerId;
    }

    await shop.save();

    res.status(200).json({
      success: true,
      message: `Shop '${shop.shopName}' has been successfully APPROVED. The dealer can now upload products.`,
      data: shop
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 4. ADMIN ONLY: Reject a Shop Application
// =========================================================================
export const rejectShopRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide admin notes specifying the reason for rejection." 
      });
    }

    const shop = await Register.findById(id);

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop request not found." });
    }

    shop.status = 'REJECTED';
    shop.adminNotes = adminNotes;
    await shop.save();

    res.status(200).json({
      success: true,
      message: `Shop '${shop.shopName}' has been REJECTED.`,
      data: shop
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export default getAllShopRequests
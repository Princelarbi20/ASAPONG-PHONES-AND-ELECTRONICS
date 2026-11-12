import { Product } from "../../modules/productSchema.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";
import { performance } from 'node:perf_hooks';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAllProducts = async (req, res) => {
  try {
    const paginated = req.query.page !== undefined || req.query.limit !== undefined;
    const filter = {};
    const category = String(req.query.category || "").trim();
    const search = String(req.query.search || "").trim().slice(0, 100);
    if (category && category.toLowerCase() !== "all") {
      filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    }
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: searchRegex }, { brand: searchRegex }];
    }

    const sort = req.query.brandSort === "asc"
      ? { brand: 1, createdAt: -1 }
      : req.query.brandSort === "desc"
        ? { brand: -1, createdAt: -1 }
        : { createdAt: -1, _id: -1 };

    let productsQuery = Product.find(filter).sort(sort);
    let total;
    let pagination;
    if (paginated) {
      const pageOptions = getPagination(req.query, { defaultLimit: 12, maxLimit: 100 });
      productsQuery = productsQuery.skip(pageOptions.skip).limit(pageOptions.limit);
      const queryStartedAt = performance.now();
      const [products, matchingCount] = await Promise.all([
        productsQuery.lean(),
        Product.countDocuments(filter),
      ]);
      req.productListDbMs = Number((performance.now() - queryStartedAt).toFixed(1));
      req.productListResultCount = products.length;
      req.productListPaginated = true;
      console.info('[performance] products_db_query', JSON.stringify({
        dbMs: req.productListDbMs,
        resultCount: products.length,
        paginated: true,
      }));
      total = matchingCount;
      pagination = paginationResult(pageOptions.page, pageOptions.limit, total);
      return res.status(200).json({
        success: true,
        count: total,
        products,
        pagination,
      });
    }
    const queryStartedAt = performance.now();
    const products = await productsQuery.lean();
    req.productListDbMs = Number((performance.now() - queryStartedAt).toFixed(1));
    req.productListResultCount = products.length;
    req.productListPaginated = false;
    console.info('[performance] products_db_query', JSON.stringify({
      dbMs: req.productListDbMs,
      resultCount: products.length,
      paginated: false,
    }));
    total = products.length;

    // Respond with a structured object that matches your frontend expectations
    res.status(200).json({
      success: true,
      count: total,
      products,
      ...(pagination ? { pagination } : {}),
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch inventory data.',
      error: error.message
    });
  }
};

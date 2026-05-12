const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  createProduct: createSchema,
  updateProduct: updateSchema,
  productQuery: querySchema,
  updateStock: updateStockSchema,
} = require('../validators/productValidator');

// ── helpers ──────────────────────────────────────────────────────────────────

const SORT_MAP = {
  price_asc:  { price: 1 },
  price_desc: { price: -1 },
  newest:     { createdAt: -1 },
  rating:     { 'ratings.average': -1 },
};

function buildFilter(query) {
  const filter = { isActive: true };

  if (query.category)    filter.category    = query.category;
  if (query.subCategory) filter.subCategory = query.subCategory;
  if (query.brand)       filter.brand       = query.brand;
  if (query.color)       filter.color       = query.color;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return filter;
}

// ── controllers ───────────────────────────────────────────────────────────────

const createProduct = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'At least one image is required');
  }

  // sizes arrives as a JSON string in multipart
  let body = { ...req.body };
  if (typeof body.sizes === 'string') {
    try { body.sizes = JSON.parse(body.sizes); } catch {
      throw new ApiError(400, 'sizes must be valid JSON');
    }
  }
  if (typeof body.tags === 'string') {
    try { body.tags = JSON.parse(body.tags); } catch {
      body.tags = [body.tags];
    }
  }
  if (body.price)         body.price         = Number(body.price);
  if (body.discountPrice) body.discountPrice = Number(body.discountPrice);
  if (body.isFeatured)    body.isFeatured    = body.isFeatured === 'true';

  const { error, value } = createSchema.validate(body, { abortEarly: false });
  if (error) {
    throw new ApiError(400, 'Validation failed', error.details.map((d) => d.message));
  }

  const images = req.files.map((f) => ({ url: f.path, publicId: f.filename }));

  const product = await Product.create({ ...value, images });

  res.status(201).json(new ApiResponse(201, product, 'Product created'));
});

const getProducts = asyncHandler(async (req, res) => {
  const { error, value: query } = querySchema.validate(req.query, { abortEarly: false });
  if (error) {
    throw new ApiError(400, 'Invalid query params', error.details.map((d) => d.message));
  }

  const filter = buildFilter(query);
  const sort   = SORT_MAP[query.sortBy] || SORT_MAP.newest;
  const skip   = (query.page - 1) * query.limit;

  const [products, totalCount] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(query.limit),
    Product.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      products,
      totalCount,
      page: query.page,
      totalPages: Math.ceil(totalCount / query.limit),
    })
  );
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(new ApiResponse(200, product));
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(new ApiResponse(200, product));
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  let body = { ...req.body };
  if (typeof body.sizes === 'string') {
    try { body.sizes = JSON.parse(body.sizes); } catch {
      throw new ApiError(400, 'sizes must be valid JSON');
    }
  }
  if (typeof body.tags === 'string') {
    try { body.tags = JSON.parse(body.tags); } catch {
      body.tags = [body.tags];
    }
  }
  if (body.price !== undefined)         body.price         = Number(body.price);
  if (body.discountPrice !== undefined) body.discountPrice = Number(body.discountPrice);
  if (body.isFeatured !== undefined)    body.isFeatured    = body.isFeatured === 'true' || body.isFeatured === true;
  if (body.isActive !== undefined)      body.isActive      = body.isActive === 'true' || body.isActive === true;

  const { error, value } = updateSchema.validate(body, { abortEarly: false });
  if (error) {
    throw new ApiError(400, 'Validation failed', error.details.map((d) => d.message));
  }

  // If new images are uploaded, delete the old ones from Cloudinary
  if (req.files && req.files.length > 0) {
    await Promise.all(
      product.images.map((img) => cloudinary.uploader.destroy(img.publicId))
    );
    value.images = req.files.map((f) => ({ url: f.path, publicId: f.filename }));
  }

  Object.assign(product, value);
  await product.save();

  res.json(new ApiResponse(200, product, 'Product updated'));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  product.isActive = false;
  await product.save();

  res.json(new ApiResponse(200, null, 'Product deactivated'));
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .sort({ 'ratings.average': -1 })
    .limit(8);

  res.json(new ApiResponse(200, products));
});

const updateStock = asyncHandler(async (req, res) => {
  const { error, value } = updateStockSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw new ApiError(400, 'Validation failed', error.details.map((d) => d.message));
  }

  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  value.sizes.forEach(({ size, stock }) => {
    const entry = product.sizes.find((s) => s.size === size);
    if (entry) {
      entry.stock = stock;
    } else {
      product.sizes.push({ size, stock });
    }
  });

  await product.save();
  res.json(new ApiResponse(200, product, 'Stock updated'));
});

const searchProducts = asyncHandler(async (req, res) => {
  const { error, value: query } = querySchema.validate(req.query, { abortEarly: false });
  if (error) {
    throw new ApiError(400, 'Invalid query params', error.details.map((d) => d.message));
  }

  if (!query.search) throw new ApiError(400, 'search query parameter is required');

  const filter = buildFilter(query);
  const skip   = (query.page - 1) * query.limit;

  const [products, totalCount] = await Promise.all([
    Product.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(query.limit),
    Product.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      products,
      totalCount,
      page: query.page,
      totalPages: Math.ceil(totalCount / query.limit),
    })
  );
});

module.exports = {
  createProduct,
  getProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  updateStock,
  searchProducts,
};

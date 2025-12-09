import Joi from "joi";

export const createDraftProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Tên sản phẩm không được để trống',
    'string.max': 'Tên sản phẩm không được vượt quá 200 ký tự',
    'any.required': 'Tên sản phẩm là bắt buộc'
  }),
  shopId: Joi.string().uuid().required().messages({
    'string.uuid': 'Shop ID phải là một UUID hợp lệ',
    'any.required': 'Shop ID là bắt buộc'
  }),
  description: Joi.string().max(2000).allow(null, '').optional().messages({
    'string.max': 'Mô tả không được vượt quá 2000 ký tự'
  })
});

const createProductOptionValueSchema = Joi.object({
  value: Joi.string().trim().min(1).max(100).required(),
  sortOrder: Joi.number().integer().min(0).default(0)
});

const createProductOptionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  values: Joi.array()
    .items(createProductOptionValueSchema)
    .min(1)
    .max(20)
    .required()
});

export const addProductOptionsSchema = Joi.object({
  options: Joi.array()
    .items(createProductOptionSchema)
    .min(1)
    .max(10)
    .required()
    .custom((value, helpers) => {
      const names = value.map((opt: any) => opt.name.toLowerCase());
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        return helpers.error('options.duplicateNames');
      }
      return value;
    })
    .messages({
      'array.min': 'Bắt buộc phải có 1 tùy chọn',
      'array.max': 'Tối đa 10 tùy chọn được phép',
      'options.duplicateNames': 'Tên tùy chọn phải là duy nhất'
    })
});

const createProductVariantSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  value: Joi.string().trim().min(1).max(100).required(),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).required(),
  currency: Joi.string().length(3).uppercase().default('VND'),
  imageUrls: Joi.array().items(Joi.string().uri()).optional(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  optionCombination: Joi.object().pattern(
    Joi.string(),
    Joi.string()
  ).optional()
});

export const addProductVariantsSchema = Joi.object({
  variants: Joi.array()
    .items(createProductVariantSchema)
    .min(1)
    .max(50)
    .required()
    .custom((value, helpers) => {
      const names = value.map((v: any) => v.name.toLowerCase());
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        return helpers.error('variants.duplicateNames');
      }
      return value;
    })
    .messages({
      'array.min': 'Bắt buộc phải có ít nhất 1 biến thể',
      'array.max': 'Tối đa 50 biến thể được phép',
      'variants.duplicateNames': 'Tên biến thể phải là duy nhất'
    })
});

const addProductImageSchema = Joi.object({
  imageUrl: Joi.string().uri().required(),   // bắt buộc là URL hợp lệ
  isPrimary: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
  description: Joi.string().max(255).optional().allow(null, '')
});

export const addProductImagesSchema = Joi.object({
  images: Joi.array()
    .items(addProductImageSchema)
    .min(1)
    .required()
});

export const updateProductStatusSchema = Joi.object({
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'ARCHIVED', 'OUT_OF_STOCK', 'DISCONTINUED').required()
});
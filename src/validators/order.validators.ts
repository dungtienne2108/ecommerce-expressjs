// validators/order.validators.ts
import Joi from 'joi';
import { OrderStatus, PaymentMethod, PaymentStatus, ShippingMethod } from '@prisma/client';

const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

export const createOrderSchema = Joi.object({
  shippingMethod: Joi.string()
    .valid(...Object.values(ShippingMethod))
    .required()
    .messages({
      'any.required': 'Phương thức vận chuyển là bắt buộc',
      'any.only': 'Phương thức vận chuyển không hợp lệ',
    }),

  shippingAddress: Joi.string().required().min(10).max(500).messages({
    'any.required': 'Địa chỉ giao hàng là bắt buộc',
    'string.min': 'Địa chỉ giao hàng phải có ít nhất 10 ký tự',
    'string.max': 'Địa chỉ giao hàng không được quá 500 ký tự',
  }),

  recipientName: Joi.string().required().min(2).max(100).messages({
    'any.required': 'Tên người nhận là bắt buộc',
    'string.min': 'Tên người nhận phải có ít nhất 2 ký tự',
    'string.max': 'Tên người nhận không được quá 100 ký tự',
  }),

  recipientPhone: Joi.string()
    .required()
    .pattern(phoneRegex)
    .messages({
      'any.required': 'Số điện thoại người nhận là bắt buộc',
      'string.pattern.base': 'Số điện thoại không hợp lệ',
    }),

  paymentMethod: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .required()
    .messages({
      'any.required': 'Phương thức thanh toán là bắt buộc',
      'any.only': 'Phương thức thanh toán không hợp lệ',
    }),

  customerNote: Joi.string().max(500).optional().messages({
    'string.max': 'Ghi chú không được quá 500 ký tự',
  }),

  shippingFee: Joi.number().min(0).optional().messages({
    'number.min': 'Phí vận chuyển không được âm',
  }),

  discount: Joi.number().min(0).optional().messages({
    'number.min': 'Giảm giá không được âm',
  }),

  voucherCode: Joi.string().max(50).optional().messages({
    'string.max': 'Mã voucher không được quá 50 ký tự',
  }),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .required()
    .messages({
      'any.required': 'Trạng thái đơn hàng là bắt buộc',
      'any.only': 'Trạng thái đơn hàng không hợp lệ',
    }),

  note: Joi.string().max(500).optional().messages({
    'string.max': 'Ghi chú không được quá 500 ký tự',
  }),
});

export const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Lý do hủy không được quá 500 ký tự',
  }),
});

export const getOrdersQuerySchema = Joi.object({
  skip: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Skip phải lớn hơn hoặc bằng 0',
    'number.integer': 'Skip phải là số nguyên',
  }),

  take: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.min': 'Take phải lớn hơn 0',
    'number.max': 'Take không được quá 100',
    'number.integer': 'Take phải là số nguyên',
  }),

  page: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Page phải lớn hơn 0',
    'number.integer': 'Page phải là số nguyên',
  }),

  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.min': 'Limit phải lớn hơn 0',
    'number.max': 'Limit không được quá 100',
    'number.integer': 'Limit phải là số nguyên',
  }),

  paymentStatus: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional()
    .messages({
      'any.only': 'Trạng thái thanh toán không hợp lệ',
    }),

  minTotalAmount: Joi.number().min(0).optional()
    .messages({
      'number.min': 'Tổng tiền đơn hàng không được âm',
    }),

  maxTotalAmount: Joi.number().min(0).optional()
    .messages({
      'number.min': 'Tổng tiền đơn hàng không được âm',
    }),

  shopId: Joi.string().optional()
    .messages({
      'string.pattern.base': 'Shop ID không hợp lệ',
    }),

  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .optional()
    .messages({
      'any.only': 'Trạng thái đơn hàng không hợp lệ',
    }),

});
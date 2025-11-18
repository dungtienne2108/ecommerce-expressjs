import Joi from 'joi';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

/**
 * Schema để tạo payment
 */
export const createPaymentSchema = Joi.object({
  orderId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Order ID không được để trống',
      'any.required': 'Order ID là bắt buộc',
    }),
  amount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Số tiền phải là một số',
      'number.positive': 'Số tiền phải lớn hơn 0',
      'any.required': 'Số tiền là bắt buộc',
    }),
  currency: Joi.string()
    .valid('VND', 'USD', 'EUR')
    .default('VND')
    .messages({
      'any.only': 'Loại tiền tệ không hợp lệ',
    }),
  method: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .required()
    .messages({
      'any.required': 'Phương thức thanh toán là bắt buộc',
      'any.only': 'Phương thức thanh toán không hợp lệ',
    }),
  expiredAt: Joi.date()
    .greater('now')
    .optional()
    .messages({
      'date.base': 'expiredAt phải là một ngày hợp lệ',
      'date.greater': 'expiredAt phải lớn hơn thời gian hiện tại',
    }),
  note: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Ghi chú không được vượt quá 500 ký tự',
    }),
});

/**
 * Schema để cập nhật trạng thái payment
 */
export const updatePaymentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      PaymentStatus.PENDING,
      PaymentStatus.PAID,
      PaymentStatus.FAILED,
      PaymentStatus.REFUNDED
    )
    .required()
    .messages({
      'any.required': 'Trạng thái là bắt buộc',
      'any.only': 'Trạng thái không hợp lệ',
    }),
  transactionId: Joi.string()
    .optional()
    .messages({
      'string.base': 'Transaction ID phải là một chuỗi',
    }),
  gatewayResponse: Joi.object()
    .optional()
    .messages({
      'object.base': 'Gateway response phải là một object',
    }),
  failureReason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Lý do thất bại không được vượt quá 500 ký tự',
    }),
});

/**
 * Schema để lấy danh sách payments
 */
export const getPaymentsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page phải là một số',
      'number.min': 'Page phải lớn hơn 0',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit phải là một số',
      'number.min': 'Limit phải lớn hơn 0',
      'number.max': 'Limit không được vượt quá 100',
    }),
  status: Joi.string()
    .valid(
      PaymentStatus.PENDING,
      PaymentStatus.PAID,
      PaymentStatus.FAILED,
      PaymentStatus.REFUNDED
    )
    .optional()
    .messages({
      'any.only': 'Trạng thái không hợp lệ',
    }),
  method: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .optional()
    .messages({
      'any.only': 'Phương thức thanh toán không hợp lệ',
    }),
});

/**
 * Schema để hủy payment
 */
export const cancelPaymentSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Lý do không được vượt quá 500 ký tự',
    }),
});

/**
 * Schema để xử lý webhook từ payment gateway
 */
export const handlePaymentWebhookSchema = Joi.object({
  transactionId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Transaction ID không được để trống',
      'any.required': 'Transaction ID là bắt buộc',
    }),
  status: Joi.string()
    .valid('success', 'completed', 'failed', 'error', 'pending')
    .required()
    .messages({
      'any.required': 'Status là bắt buộc',
      'any.only': 'Status không hợp lệ',
    }),
  message: Joi.string()
    .optional()
    .messages({
      'string.base': 'Message phải là một chuỗi',
    }),
  rawData: Joi.object()
    .optional()
    .messages({
      'object.base': 'Raw data phải là một object',
    }),
});

/**
 * Schema để lấy thống kê
 */
export const getPaymentStatisticsQuerySchema = Joi.object({
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'startDate phải là một ngày hợp lệ',
    }),
  endDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'endDate phải là một ngày hợp lệ',
    }),
  method: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .optional()
    .messages({
      'any.only': 'Phương thức thanh toán không hợp lệ',
    }),
});
import Joi from 'joi';

/**
 * Schema validate cho việc tạo VNPay payment URL
 */
export const createVNPayPaymentSchema = Joi.object({
  orderId: Joi.string().uuid().required().messages({
    'string.empty': 'Order ID không được để trống',
    'string.uuid': 'Order ID không hợp lệ',
    'any.required': 'Order ID là bắt buộc',
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Số tiền phải là số',
    'number.positive': 'Số tiền phải lớn hơn 0',
    'any.required': 'Số tiền là bắt buộc',
  }),
  orderInfo: Joi.string().max(255).required().messages({
    'string.empty': 'Thông tin đơn hàng không được để trống',
    'string.max': 'Thông tin đơn hàng không được vượt quá 255 ký tự',
    'any.required': 'Thông tin đơn hàng là bắt buộc',
  }),
  orderType: Joi.string().valid('billpayment', 'fashion', 'other', 'topup').optional().messages({
    'any.only': 'Loại đơn hàng không hợp lệ',
  }),
  locale: Joi.string().valid('vn', 'en').optional().messages({
    'any.only': 'Ngôn ngữ không hợp lệ',
  }),
  bankCode: Joi.string().optional().messages({
    'string.base': 'Mã ngân hàng không hợp lệ',
  }),
});

/**
 * Schema validate cho VNPay return URL
 */
export const vnpayReturnSchema = Joi.object({
  vnp_Amount: Joi.string().required(),
  vnp_BankCode: Joi.string().optional().allow(''),
  vnp_BankTranNo: Joi.string().optional().allow(''),
  vnp_CardType: Joi.string().optional().allow(''),
  vnp_OrderInfo: Joi.string().required(),
  vnp_PayDate: Joi.string().required(),
  vnp_ResponseCode: Joi.string().required(),
  vnp_TmnCode: Joi.string().required(),
  vnp_TransactionNo: Joi.string().required(),
  vnp_TransactionStatus: Joi.string().required(),
  vnp_TxnRef: Joi.string().required(),
  vnp_SecureHash: Joi.string().required(),
}).unknown(true); // Allow unknown fields

/**
 * Schema validate cho VNPay IPN
 */
export const vnpayIPNSchema = Joi.object({
  vnp_Amount: Joi.string().required(),
  vnp_BankCode: Joi.string().optional().allow(''),
  vnp_BankTranNo: Joi.string().optional().allow(''),
  vnp_CardType: Joi.string().optional().allow(''),
  vnp_OrderInfo: Joi.string().required(),
  vnp_PayDate: Joi.string().required(),
  vnp_ResponseCode: Joi.string().required(),
  vnp_TmnCode: Joi.string().required(),
  vnp_TransactionNo: Joi.string().required(),
  vnp_TransactionStatus: Joi.string().required(),
  vnp_TxnRef: Joi.string().required(),
  vnp_SecureHash: Joi.string().required(),
  vnp_SecureHashType: Joi.string().optional(),
}).unknown(true); // Allow unknown fields

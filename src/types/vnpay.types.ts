/**
 * VNPay Payment Gateway Types
 * Tài liệu API: https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/
 */

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  url: string;
  returnUrl: string;
  ipnUrl: string;
}

export interface CreateVNPayPaymentInput {
  orderId: string;
  amount: number;
  orderInfo: string;
  orderType?: string;
  locale?: 'vn' | 'en';
  bankCode?: string;
  ipAddr: string;
}

export interface VNPayPaymentResponse {
  paymentUrl: string;
  vnpayData: {
    vnp_TmnCode: string;
    vnp_Amount: string;
    vnp_Command: string;
    vnp_CreateDate: string;
    vnp_CurrCode: string;
    vnp_IpAddr: string;
    vnp_Locale: string;
    vnp_OrderInfo: string;
    vnp_OrderType: string;
    vnp_ReturnUrl: string;
    vnp_TxnRef: string;
    vnp_Version: string;
    vnp_SecureHash: string;
  };
}

export interface VNPayReturnParams {
  vnp_Amount: string;
  vnp_BankCode?: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  [key: string]: string | undefined;
}

export interface VNPayIPNParams extends VNPayReturnParams {
  vnp_SecureHashType?: string;
}

export interface VNPayVerifyResult {
  isValid: boolean;
  message?: string;
  data?: {
    amount: number;
    orderInfo: string;
    responseCode: string;
    transactionNo: string;
    transactionStatus: string;
    bankCode?: string;
    bankTranNo?: string;
    cardType?: string;
    payDate: string;
    txnRef: string;
  };
}

/**
 * VNPay Response Codes
 * https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/
 */
export enum VNPayResponseCode {
  SUCCESS = '00',
  SUSPICIOUS_TRANSACTION = '07',
  INVALID_CARD_INFO = '09',
  AUTH_FAILED = '10',
  TRANSACTION_TIMEOUT = '11',
  ACCOUNT_LOCKED = '12',
  INCORRECT_OTP = '13',
  TRANSACTION_CANCELLED = '24',
  INSUFFICIENT_BALANCE = '51',
  DAILY_LIMIT_EXCEEDED = '65',
  MAINTENANCE = '75',
  INCORRECT_PASSWORD_MULTIPLE_TIMES = '79',
  TRANSACTION_FAILED = '99',
}

export const VNPayResponseMessage: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
  '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
  '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
  '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
  '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
  '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
  '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
  '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
  '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì.',
  '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
  '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
};

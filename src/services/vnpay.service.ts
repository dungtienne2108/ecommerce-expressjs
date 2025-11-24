import crypto from 'crypto';
import querystring from 'querystring';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import {
  CreateVNPayPaymentInput,
  VNPayConfig,
  VNPayIPNParams,
  VNPayPaymentResponse,
  VNPayResponseCode,
  VNPayResponseMessage,
  VNPayReturnParams,
  VNPayVerifyResult,
} from '../types/vnpay.types';
import { ValidationError, NotFoundError } from '../errors/AppError';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';

export class VNPayService {
  private config: VNPayConfig;

  constructor(private uow: IUnitOfWork) {
    // Load config from environment variables
    this.config = {
      tmnCode: process.env.VNPAY_TMN_CODE || '',
      hashSecret: process.env.VNPAY_HASH_SECRET || '',
      url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: process.env.VNPAY_RETURN_URL || '',
      ipnUrl: process.env.VNPAY_IPN_URL || '',
    };

    // Validate config
    if (!this.config.tmnCode || !this.config.hashSecret) {
      throw new Error('VNPay configuration is missing. Please check your environment variables.');
    }
  }

  /**
   * Tạo URL thanh toán VNPay
   * @param input Thông tin tạo payment
   * @returns URL thanh toán và dữ liệu VNPay
   */
  async createPaymentUrl(input: CreateVNPayPaymentInput): Promise<VNPayPaymentResponse> {
    try {
      // Kiểm tra order tồn tại
      const order = await this.uow.orders.findById(input.orderId);
      if (!order) {
        throw new NotFoundError('Đơn hàng không tồn tại');
      }

      // Kiểm tra order đã có payment chưa
      const existingPayment = await this.uow.payments.findByOrderId(input.orderId);
      if (existingPayment && existingPayment.status === PaymentStatus.PAID) {
        throw new ValidationError('Đơn hàng đã được thanh toán');
      }

      // Tạo hoặc cập nhật payment record
      let payment;
      if (existingPayment && existingPayment.status === PaymentStatus.PENDING) {
        payment = existingPayment;
      } else {
        // Tạo payment mới
        payment = await this.uow.payments.create({
          order: { connect: { id: input.orderId } },
          amount: input.amount,
          currency: 'VND',
          method: PaymentMethod.VNPAY,
          status: PaymentStatus.PENDING,
          expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 phút
          note: input.orderInfo,
        });
      }

      // Tạo transaction reference (mã tham chiếu giao dịch)
      const txnRef = `${order.orderNumber}_${Date.now()}`;

      // Tạo thời gian tạo giao dịch (yyyyMMddHHmmss)
      const createDate = dayjs().format('YYYYMMDDHHmmss');

      // Tạo các tham số VNPay
      const vnpParams: any = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.config.tmnCode,
        vnp_Amount: (input.amount * 100).toString(), // VNPay yêu cầu số tiền * 100
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: input.orderInfo,
        vnp_OrderType: input.orderType || 'other',
        vnp_Locale: input.locale || 'vn',
        vnp_ReturnUrl: this.config.returnUrl,
        vnp_IpAddr: input.ipAddr,
        vnp_CreateDate: createDate,
      };

      // Thêm bank code nếu có
      if (input.bankCode) {
        vnpParams.vnp_BankCode = input.bankCode;
      }

      // Sắp xếp params theo thứ tự alphabet
      const sortedParams = this.sortObject(vnpParams);

      // Tạo query string
      const signData = querystring.stringify(sortedParams, { encode: false });

      // Tạo secure hash
      const secureHash = this.createSecureHash(signData, this.config.hashSecret);

      // Thêm secure hash vào params
      sortedParams.vnp_SecureHash = secureHash;

      // Tạo payment URL
      const paymentUrl = `${this.config.url}?${querystring.stringify(sortedParams, { encode: false })}`;

      // Lưu transaction reference vào payment
      await this.uow.payments.update(payment.id, {
        transactionId: txnRef,
        gatewayResponse: {
          vnpParams: sortedParams,
          createdAt: new Date(),
        },
      });

      return {
        paymentUrl,
        vnpayData: sortedParams,
      };
    } catch (error) {
      console.error('Error creating VNPay payment URL:', error);
      throw error;
    }
  }

  /**
   * Xác thực return URL từ VNPay
   * @param params Query params từ VNPay return
   * @returns Kết quả xác thực
   */
  async verifyReturnUrl(params: VNPayReturnParams): Promise<VNPayVerifyResult> {
    try {
      const secureHash = params.vnp_SecureHash;
      delete params.vnp_SecureHash;
      delete params.vnp_SecureHashType;

      // Sắp xếp params
      const sortedParams = this.sortObject(params);

      // Tạo sign data
      const signData = querystring.stringify(sortedParams, { encode: false });

      // Tạo checksum
      const checkSum = this.createSecureHash(signData, this.config.hashSecret);

      // Verify signature
      if (secureHash !== checkSum) {
        return {
          isValid: false,
          message: 'Chữ ký không hợp lệ',
        };
      }

      // Parse data
      const amount = parseInt(params.vnp_Amount, 10) / 100;
      const responseCode = params.vnp_ResponseCode;
      const transactionStatus = params.vnp_TransactionStatus;

      // Kiểm tra response code
      if (responseCode !== VNPayResponseCode.SUCCESS) {
        return {
          isValid: true,
          message: VNPayResponseMessage[responseCode] || 'Giao dịch không thành công',
          data: {
            amount,
            orderInfo: params.vnp_OrderInfo,
            responseCode,
            transactionNo: params.vnp_TransactionNo,
            transactionStatus,
            bankCode: params.vnp_BankCode,
            bankTranNo: params.vnp_BankTranNo,
            cardType: params.vnp_CardType,
            payDate: params.vnp_PayDate,
            txnRef: params.vnp_TxnRef,
          },
        };
      }

      return {
        isValid: true,
        message: 'Giao dịch thành công',
        data: {
          amount,
          orderInfo: params.vnp_OrderInfo,
          responseCode,
          transactionNo: params.vnp_TransactionNo,
          transactionStatus,
          bankCode: params.vnp_BankCode,
          bankTranNo: params.vnp_BankTranNo,
          cardType: params.vnp_CardType,
          payDate: params.vnp_PayDate,
          txnRef: params.vnp_TxnRef,
        },
      };
    } catch (error) {
      console.error('Error verifying VNPay return URL:', error);
      return {
        isValid: false,
        message: 'Lỗi xác thực giao dịch',
      };
    }
  }

  /**
   * Xác thực IPN (Instant Payment Notification) từ VNPay
   * @param params IPN params từ VNPay
   * @returns Kết quả xác thực và cập nhật payment
   */
  async verifyIPN(params: VNPayIPNParams): Promise<{
    RspCode: string;
    Message: string;
  }> {
    console.log('🔔 [VNPay IPN] Received IPN callback');
    console.log('📦 [VNPay IPN] Params:', JSON.stringify(params, null, 2));

    try {
      const secureHash = params.vnp_SecureHash;
      const txnRef = params.vnp_TxnRef;
      const responseCode = params.vnp_ResponseCode;

      console.log('🔍 [VNPay IPN] Transaction Reference:', txnRef);
      console.log('🔍 [VNPay IPN] Response Code:', responseCode);
      console.log('🔍 [VNPay IPN] Secure Hash:', secureHash);

      // Kiểm tra checksum
      const vnpParams = { ...params };
      delete vnpParams.vnp_SecureHash;
      delete vnpParams.vnp_SecureHashType;

      const sortedParams = this.sortObject(vnpParams);
      const signData = querystring.stringify(sortedParams, { encode: false });
      const checkSum = this.createSecureHash(signData, this.config.hashSecret);

      console.log('🔐 [VNPay IPN] Sign Data:', signData);
      console.log('🔐 [VNPay IPN] Calculated CheckSum:', checkSum);
      console.log('🔐 [VNPay IPN] Received SecureHash:', secureHash);

      if (secureHash !== checkSum) {
        console.error('❌ [VNPay IPN] Invalid Checksum!');
        return {
          RspCode: '97',
          Message: 'Invalid Checksum',
        };
      }

      console.log('✅ [VNPay IPN] Checksum verified successfully');

      // Tìm payment theo transaction reference
      console.log('🔍 [VNPay IPN] Finding payment by transaction reference:', txnRef);
      const payment = await this.uow.payments.findByTransactionId(txnRef);

      if (!payment) {
        console.error('❌ [VNPay IPN] Payment not found for txnRef:', txnRef);
        return {
          RspCode: '01',
          Message: 'Order Not Found',
        };
      }

      console.log('✅ [VNPay IPN] Payment found:', {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
      });

      // Kiểm tra số tiền
      const amount = parseInt(params.vnp_Amount, 10) / 100;
      console.log('💰 [VNPay IPN] Amount check:', {
        vnpayAmount: amount,
        paymentAmount: Number(payment.amount),
      });

      if (amount !== Number(payment.amount)) {
        console.error('❌ [VNPay IPN] Amount mismatch!');
        return {
          RspCode: '04',
          Message: 'Invalid Amount',
        };
      }

      // Kiểm tra payment đã được xử lý chưa
      if (payment.status === PaymentStatus.PAID) {
        console.warn('⚠️  [VNPay IPN] Payment already confirmed');
        return {
          RspCode: '02',
          Message: 'Order Already Confirmed',
        };
      }

      // Cập nhật payment status
      if (responseCode === VNPayResponseCode.SUCCESS) {
        console.log('✅ [VNPay IPN] Processing successful payment...');

        await this.uow.executeInTransaction(async (uow) => {
          // Cập nhật payment
          console.log('📝 [VNPay IPN] Updating payment status to PAID');
          await uow.payments.updateStatus(payment.id, PaymentStatus.PAID, {
            paidAt: new Date(),
            transactionId: params.vnp_TransactionNo,
            gatewayResponse: {
              ...payment.gatewayResponse,
              ipnData: params,
              paidAt: new Date(),
            },
          });

          // Cập nhật order
          console.log('📝 [VNPay IPN] Updating order payment status');
          await uow.orders.update(payment.orderId, {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          });

          console.log('✅ [VNPay IPN] Payment and order updated successfully');
        });

        return {
          RspCode: '00',
          Message: 'Confirm Success',
        };
      } else {
        // Giao dịch thất bại
        console.log('❌ [VNPay IPN] Processing failed payment...');
        console.log('❌ [VNPay IPN] Failure reason:', VNPayResponseMessage[responseCode]);

        await this.uow.payments.updateStatus(payment.id, PaymentStatus.FAILED, {
          failedAt: new Date(),
          failureReason: VNPayResponseMessage[responseCode] || 'Giao dịch thất bại',
          gatewayResponse: {
            ...payment.gatewayResponse,
            ipnData: params,
            failedAt: new Date(),
          },
        });

        console.log('✅ [VNPay IPN] Payment marked as failed');

        return {
          RspCode: '00',
          Message: 'Confirm Success',
        };
      }
    } catch (error) {
      console.error('💥 [VNPay IPN] Error verifying IPN:', error);
      console.error('💥 [VNPay IPN] Error stack:', error instanceof Error ? error.stack : 'Unknown');
      return {
        RspCode: '99',
        Message: 'Unknown Error',
      };
    }
  }

  /**
   * Tạo secure hash (HMAC SHA512)
   * @param data Dữ liệu cần hash
   * @param secret Secret key
   * @returns Hash string
   */
  private createSecureHash(data: string, secret: string): string {
    const hmac = crypto.createHmac('sha512', secret);
    return hmac.update(Buffer.from(data, 'utf-8')).digest('hex');
  }

  /**
   * Sắp xếp object theo thứ tự alphabet
   * @param obj Object cần sắp xếp
   * @returns Object đã sắp xếp
   */
  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }

  /**
   * Query transaction status from VNPay
   * @param txnRef Transaction reference
   * @param transDate Transaction date (yyyyMMddHHmmss)
   * @returns Transaction status
   */
  async queryTransaction(txnRef: string, transDate: string): Promise<any> {
    // TODO: Implement VNPay query API
    // https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/
    throw new Error('Not implemented yet');
  }

  /**
   * Refund transaction
   * @param txnRef Transaction reference
   * @param amount Refund amount
   * @param transDate Transaction date
   * @returns Refund result
   */
  async refundTransaction(txnRef: string, amount: number, transDate: string): Promise<any> {
    // TODO: Implement VNPay refund API
    // https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/
    throw new Error('Not implemented yet');
  }
}

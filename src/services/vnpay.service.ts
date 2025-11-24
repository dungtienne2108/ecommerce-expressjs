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
import { paymentService } from '../config/container';

export class VNPayService {
  private config: VNPayConfig;

  constructor(private uow: IUnitOfWork) {
    // Load config from environment variables
    this.config = {
      tmnCode: process.env.VNPAY_TMN_CODE || '',
      hashSecret: process.env.VNPAY_HASH_SECRET || '',
      url:
        process.env.VNPAY_URL ||
        'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: process.env.VNPAY_RETURN_URL || '',
      ipnUrl: process.env.VNPAY_IPN_URL || '',
    };

    // Validate config
    if (!this.config.tmnCode || !this.config.hashSecret) {
      throw new Error(
        'VNPay configuration is missing. Please check your environment variables.'
      );
    }
  }

  /**
   * Tạo URL thanh toán VNPay
   * @param input Thông tin tạo payment
   * @returns URL thanh toán và dữ liệu VNPay
   */
  async createPaymentUrl(
    input: CreateVNPayPaymentInput
  ): Promise<VNPayPaymentResponse> {
    return this.uow.executeInTransaction(async (uow) => {
      try {
        // Kiểm tra order tồn tại
        const order = await this.uow.orders.findById(input.orderId);
        if (!order) {
          throw new NotFoundError('Đơn hàng không tồn tại');
        }

        // Kiểm tra order đã có payment chưa
        const existingPayment = await this.uow.payments.findByOrderId(
          input.orderId
        );
        if (existingPayment && existingPayment.status === PaymentStatus.PAID) {
          throw new ValidationError('Đơn hàng đã được thanh toán');
        }

        // Tạo hoặc cập nhật payment record
        let payment;
        if (
          existingPayment &&
          existingPayment.status === PaymentStatus.PENDING
        ) {
          payment = existingPayment;
        } else {
          // Tạo payment mới
          payment = await this.uow.payments.create({
            order: { connect: { id: input.orderId } },
            amount: input.amount,
            currency: 'VND',
            method: PaymentMethod.CREDIT_CARD,
            status: PaymentStatus.PENDING,
            expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 phút
            note: input.orderInfo,
          });
        }

        // Tạo transaction reference (mã tham chiếu giao dịch)
        const txnRef = `${order.orderNumber}_${Date.now()}`;

        // Tạo thời gian tạo giao dịch (yyyyMMddHHmmss)
        const createDate = dayjs().format('YYYYMMDDHHmmss');

        const ipAddr = input.ipAddr === '::1' ? '127.0.0.1' : input.ipAddr;

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
          vnp_IpAddr: ipAddr,
          vnp_CreateDate: createDate,
        };

        // Thêm bank code nếu có
        if (input.bankCode) {
          vnpParams.vnp_BankCode = input.bankCode;
        }

        // Sắp xếp params theo thứ tự alphabet
        const sortedParams = this.sortObject(vnpParams);

        // Tạo query string
        const signData = querystring.stringify(sortedParams);

        // Tạo secure hash
        const secureHash = this.createSecureHash(
          signData,
          this.config.hashSecret
        );

        // Thêm secure hash vào params
        sortedParams.vnp_SecureHash = secureHash;

        // Tạo payment URL
        const paymentUrl = `${this.config.url}?${querystring.stringify(sortedParams)}`;

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
    });
  }

  /**
   * Xác thực return URL từ VNPay
   * @param params Query params từ VNPay return
   * @returns Kết quả xác thực
   */
  async verifyReturnUrl(params: VNPayReturnParams): Promise<VNPayVerifyResult> {
    try {
      const secureHash = params.vnp_SecureHash;
      delete (params as any).vnp_SecureHash; // ✅ ok
      delete params.vnp_SecureHashType;

      // Sắp xếp params
      const sortedParams = this.sortObject(params);

      // Tạo sign data
      const signData = querystring.stringify(sortedParams);

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
          message:
            VNPayResponseMessage[responseCode] || 'Giao dịch không thành công',
          data: {
            amount,
            orderInfo: params.vnp_OrderInfo,
            responseCode,
            transactionNo: params.vnp_TransactionNo,
            transactionStatus,
            bankCode: params.vnp_BankCode ?? '',
            bankTranNo: params.vnp_BankTranNo ?? '',
            cardType: params.vnp_CardType ?? '',
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
          bankCode: params.vnp_BankCode ?? '',
          bankTranNo: params.vnp_BankTranNo ?? '',
          cardType: params.vnp_CardType ?? '',
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
    try {
      const secureHash = params.vnp_SecureHash;
      const txnRef = params.vnp_TxnRef;
      const responseCode = params.vnp_ResponseCode;

      // Kiểm tra checksum
      const vnpParams = { ...params };
      delete (vnpParams as any).vnp_SecureHash; // ✅ ok
      delete vnpParams.vnp_SecureHashType;

      const sortedParams = this.sortObject(vnpParams);
      const signData = querystring.stringify(sortedParams);
      const checkSum = this.createSecureHash(signData, this.config.hashSecret);

      if (secureHash !== checkSum) {
        return {
          RspCode: '97',
          Message: 'Invalid Checksum',
        };
      }

      // Tìm payment theo transaction reference
      const payment = await this.uow.payments.findByTransactionId(txnRef);
      if (!payment) {
        return {
          RspCode: '01',
          Message: 'Order Not Found',
        };
      }

      // Kiểm tra số tiền
      const amount = parseInt(params.vnp_Amount, 10) / 100;
      if (amount !== Number(payment.amount)) {
        return {
          RspCode: '04',
          Message: 'Invalid Amount',
        };
      }

      // Kiểm tra payment đã được xử lý chưa
      if (payment.status === PaymentStatus.PAID) {
        return {
          RspCode: '02',
          Message: 'Order Already Confirmed',
        };
      }

      // Cập nhật payment status
      if (responseCode === VNPayResponseCode.SUCCESS) {
        await this.uow.executeInTransaction(async (uow) => {
          // Cập nhật payment
          await uow.payments.updateStatus(payment.id, PaymentStatus.PAID, {
            paidAt: new Date(),
            transactionId: params.vnp_TransactionNo,
            gatewayResponse: {
              ...(typeof payment.gatewayResponse === 'object' &&
              payment.gatewayResponse !== null
                ? payment.gatewayResponse
                : {}),
              ipnData: params,
              paidAt: new Date(),
            },
          });

          // Cập nhật order
          await uow.orders.update(payment.orderId, {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          });

          // tao cashback neu co the
          const order = await uow.orders.findById(payment.orderId, {
            user: true,
          });
          if (order?.userId) {
            const user = await uow.users.findById(order.userId);
            if (user?.walletAddress) {
              const existingCashback = await uow.cashbacks.findByPaymentId(
                payment.id
              );
              if (!existingCashback) {
                const cashbackPercentage = 1; // 1%
                // const cashbackAmount = (Number(payment.amount) * cashbackPercentage) / 100;
                const cashbackAmount = Number(payment.amount);
                const eligibleAt = new Date(
                  Date.now() - 7 * 24 * 60 * 60 * 1000
                );
                const expiresAt = new Date(
                  Date.now() + 90 * 24 * 60 * 60 * 1000
                );

                await uow.cashbacks.create({
                  payment: { connect: { id: payment.id } },
                  user: { connect: { id: order.userId } },
                  order: { connect: { id: payment.orderId } },
                  amount: cashbackAmount,
                  percentage: cashbackPercentage,
                  currency: payment.currency,
                  walletAddress: user.walletAddress,
                  blockchainNetwork: user.preferredNetwork || 'BSC',
                  status: 'PENDING',
                  eligibleAt,
                  expiresAt,
                  updatedAt: new Date(),
                  metadata: {
                    orderNumber: order.orderNumber,
                    createdBy: 'payment_update',
                  },
                });
              }
            }
          }
        });

        return {
          RspCode: '00',
          Message: 'Confirm Success',
        };
      } else {
        // Giao dịch thất bại
        await this.uow.payments.updateStatus(payment.id, PaymentStatus.FAILED, {
          failedAt: new Date(),
          failureReason:
            VNPayResponseMessage[responseCode] || 'Giao dịch thất bại',
          gatewayResponse: {
            ...(typeof payment.gatewayResponse === 'object' &&
            payment.gatewayResponse !== null
              ? payment.gatewayResponse
              : {}),
            ipnData: params,
            failedAt: new Date(),
          },
        });

        return {
          RspCode: '00',
          Message: 'Confirm Success',
        };
      }
    } catch (error) {
      console.error('Error verifying VNPay IPN:', error);
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
  async refundTransaction(
    txnRef: string,
    amount: number,
    transDate: string
  ): Promise<any> {
    // TODO: Implement VNPay refund API
    // https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/
    throw new Error('Not implemented yet');
  }
}

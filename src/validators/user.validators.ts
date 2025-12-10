import { Gender, UserStatus } from '@prisma/client';
import Joi from 'joi';

const phoneRegex = /^(?:\+84|0)(3|5|7|8|9)\d{8}$/;
const nameRegex = /^[\p{L}\s'-]+$/u;

export const createUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
      'any.required': 'Email là bắt buộc',
    }),

  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
      'string.pattern.base': 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt',
      'any.required': 'Mật khẩu là bắt buộc',
    }),

  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .required()
    .messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự',
      'string.max': 'Họ tên không được vượt quá 50 ký tự',
      'string.pattern.base': 'Họ tên chỉ có thể chứa chữ cái, khoảng trắng, dấu gạch ngang và dấu nháy đơn',
      'any.required': 'Họ tên là bắt buộc',
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .required()
    .messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự',
      'string.max': 'Họ tên không được vượt quá 50 ký tự',
      'string.pattern.base': 'Họ tên chỉ có thể chứa chữ cái, khoảng trắng, dấu gạch ngang và dấu nháy đơn',
      'any.required': 'Họ tên là bắt buộc',
    }),

  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Vui lòng nhập số điện thoại hợp lệ',
    }),

  address: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Địa chỉ không được vượt quá 500 ký tự',
    }),

  birthday: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional()
    .messages({
      'date.max': 'Ngày sinh không được ở trong tương lai',
      'date.min': 'Ngày sinh không được trước năm 1900',
    }),

  gender: Joi.string()
    .valid(...Object.values(Gender))
    .optional()
    .messages({
      'any.only': 'Giới tính phải là một trong các giá trị: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
    }),

  avatarUrl: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Avatar URL phải là một URL hợp lệ',
    }),

  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      'any.only': 'Trạng thái phải là một trong các giá trị: ACTIVE, INACTIVE, PENDING, SUSPENDED, BANNED',
    }),
});

export const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
    }),

  firstName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự',
      'string.max': 'Họ tên không được vượt quá 50 ký tự',
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự',
      'string.max': 'Họ tên không được vượt quá 50 ký tự',
    }),

  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Vui lòng nhập số điện thoại hợp lệ',
    }),

  address: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Địa chỉ không được vượt quá 500 ký tự',
    }),

  birthday: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional()
    .allow(null)
    .messages({
      'date.max': 'Ngày sinh không được ở trong tương lai',
      'date.min': 'Ngày sinh không được trước 1900',
    }),

  gender: Joi.string()
    .valid(...Object.values(Gender))
    .optional()
    .allow(null)
    .messages({
      'any.only': 'Giới tính phải là một trong các giá trị: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
    }),

  avatarUrl: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      'string.uri': 'Avatar URL phải là một URL hợp lệ',
    }),

  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      'any.only': 'Trạng thái phải là một trong các giá trị: ACTIVE, INACTIVE, PENDING, SUSPENDED, BANNED',
    }),
});

export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Mật khẩu hiện tại là bắt buộc',
    }),

  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Mật khẩu mới phải có ít nhất 8 ký tự',
      'string.pattern.base': 'Mật khẩu mới phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt',
      'any.required': 'Mật khẩu mới là bắt buộc',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
      'any.required': 'Email là bắt buộc',
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Mật khẩu là bắt buộc',
    }),
});

export const userSearchSchema = Joi.object({
  search: Joi.string().min(1).optional(),
  status: Joi.string().valid(...Object.values(UserStatus)).optional(),
  gender: Joi.string().valid(...Object.values(Gender)).optional(),
  ageFrom: Joi.number().integer().min(0).max(150).optional(),
  ageTo: Joi.number().integer().min(0).max(150).optional(),
  createdFrom: Joi.date().optional(),
  createdTo: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'firstName', 'lastName', 'email').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
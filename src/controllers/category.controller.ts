import { categoryService } from "../config/container";
import { ValidationError } from "../errors/AppError";
import { asyncHandler } from "../middleware/errorHandler";
import { Request, Response } from 'express';
import { ApiResponse } from "../types/common";


export class CategoryController{
    searchByName = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const { name } = req.query;
            
            const categories = await categoryService.getCategories(name as string);

            if (!categories || categories.length === 0) {
                throw new ValidationError('Không tìm thấy danh mục nào');
            }

            const response: ApiResponse = {
                success: true,
                data: categories,
                message: 'Lấy danh sách danh mục thành công',
            };
            res.status(200).json(response);
        }
    );

    getAll = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const categories = await categoryService.getAll();
            const response: ApiResponse = {
                success: true,
                data: categories,
                message: 'Lấy danh sách danh mục thành công',
            };
            res.status(200).json(response);
        }
    );
}

export const categoryController = new CategoryController();
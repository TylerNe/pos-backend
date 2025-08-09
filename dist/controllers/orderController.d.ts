import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const getAllOrders: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getOrderById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createOrder: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getOrderStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=orderController.d.ts.map
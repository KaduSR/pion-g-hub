export declare function authMiddleware(req: any, res: any, next: any): void;
export declare function requirePermission(modulo: string, acao: string): (req: any, res: any, next: any) => void;
export declare function requireNivelMinimo(nivel: number): (req: any, res: any, next: any) => void;
export declare function generateToken(user: any, expiresIn?: string | number): string;
export declare function verifyToken(token: string): any | null;
//# sourceMappingURL=auth.middleware.d.ts.map
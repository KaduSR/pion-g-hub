import { z } from 'zod';
export declare const webhookCreateSchema: z.ZodEffects<z.ZodObject<{
    evento: z.ZodString;
    url_destino: z.ZodString;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    evento: string;
    url_destino: string;
    ativo?: boolean | undefined;
}, {
    evento: string;
    url_destino: string;
    ativo?: boolean | undefined;
}>, {
    evento: string;
    url_destino: string;
    ativo?: boolean | undefined;
}, {
    evento: string;
    url_destino: string;
    ativo?: boolean | undefined;
}>;
export declare const webhookUpdateSchema: z.ZodEffects<z.ZodObject<{
    evento: z.ZodOptional<z.ZodString>;
    url_destino: z.ZodOptional<z.ZodString>;
    ativo: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    evento?: string | undefined;
    url_destino?: string | undefined;
    ativo?: boolean | undefined;
}, {
    evento?: string | undefined;
    url_destino?: string | undefined;
    ativo?: boolean | undefined;
}>, {
    evento?: string | undefined;
    url_destino?: string | undefined;
    ativo?: boolean | undefined;
}, {
    evento?: string | undefined;
    url_destino?: string | undefined;
    ativo?: boolean | undefined;
}>;
export declare const validateWebhookCreate: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
export declare const validateWebhookUpdate: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=webhook.validator.d.ts.map
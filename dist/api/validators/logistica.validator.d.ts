import { z } from 'zod';
export declare const logisticaCreateSchema: z.ZodEffects<z.ZodObject<{
    codigo_rastreio: z.ZodString;
    colaborador_responsavel_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    origem: z.ZodString;
    destino: z.ZodString;
    status_operacao: z.ZodOptional<z.ZodEnum<["Pendente", "Em Trânsito", "Entregue", "Cancelado"]>>;
    data_prevista: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    codigo_rastreio: string;
    origem: string;
    destino: string;
    colaborador_responsavel_id?: string | null | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}, {
    codigo_rastreio: string;
    origem: string;
    destino: string;
    colaborador_responsavel_id?: string | null | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}>, {
    codigo_rastreio: string;
    origem: string;
    destino: string;
    colaborador_responsavel_id?: string | null | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}, {
    codigo_rastreio: string;
    origem: string;
    destino: string;
    colaborador_responsavel_id?: string | null | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}>;
export declare const logisticaUpdateSchema: z.ZodEffects<z.ZodObject<{
    codigo_rastreio: z.ZodOptional<z.ZodString>;
    colaborador_responsavel_id: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    origem: z.ZodOptional<z.ZodString>;
    destino: z.ZodOptional<z.ZodString>;
    status_operacao: z.ZodOptional<z.ZodOptional<z.ZodEnum<["Pendente", "Em Trânsito", "Entregue", "Cancelado"]>>>;
    data_prevista: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    codigo_rastreio?: string | undefined;
    colaborador_responsavel_id?: string | null | undefined;
    origem?: string | undefined;
    destino?: string | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}, {
    codigo_rastreio?: string | undefined;
    colaborador_responsavel_id?: string | null | undefined;
    origem?: string | undefined;
    destino?: string | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}>, {
    codigo_rastreio?: string | undefined;
    colaborador_responsavel_id?: string | null | undefined;
    origem?: string | undefined;
    destino?: string | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}, {
    codigo_rastreio?: string | undefined;
    colaborador_responsavel_id?: string | null | undefined;
    origem?: string | undefined;
    destino?: string | undefined;
    status_operacao?: "Pendente" | "Em Trânsito" | "Entregue" | "Cancelado" | undefined;
    data_prevista?: string | null | undefined;
}>;
export declare const validateLogisticaCreate: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
export declare const validateLogisticaUpdate: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=logistica.validator.d.ts.map
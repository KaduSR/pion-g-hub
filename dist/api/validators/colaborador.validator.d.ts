import { z } from 'zod';
export declare const colaboradorCreateSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    nome: z.ZodString;
    matricula: z.ZodString;
    cpf: z.ZodString;
    cargo_id: z.ZodString;
    departamento_id: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["Ativo", "Inativo", "Afastado", "Ferias"]>>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    matricula: string;
    cpf: string;
    cargo_id: string;
    departamento_id: string;
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
}, {
    nome: string;
    matricula: string;
    cpf: string;
    cargo_id: string;
    departamento_id: string;
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
}>, {
    nome: string;
    matricula: string;
    cpf: string;
    cargo_id: string;
    departamento_id: string;
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
}, {
    nome: string;
    matricula: string;
    cpf: string;
    cargo_id: string;
    departamento_id: string;
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
}>, {
    nome: string;
    matricula: string;
    cpf: string;
    cargo_id: string;
    departamento_id: string;
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
}, {
    nome: string;
    matricula: string;
    cpf: string;
    cargo_id: string;
    departamento_id: string;
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
}>;
export declare const colaboradorUpdateSchema: z.ZodEffects<z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    matricula: z.ZodOptional<z.ZodString>;
    cpf: z.ZodOptional<z.ZodString>;
    cargo_id: z.ZodOptional<z.ZodString>;
    departamento_id: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["Ativo", "Inativo", "Afastado", "Ferias"]>>>;
}, "strip", z.ZodTypeAny, {
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
    nome?: string | undefined;
    matricula?: string | undefined;
    cpf?: string | undefined;
    cargo_id?: string | undefined;
    departamento_id?: string | undefined;
}, {
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
    nome?: string | undefined;
    matricula?: string | undefined;
    cpf?: string | undefined;
    cargo_id?: string | undefined;
    departamento_id?: string | undefined;
}>, {
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
    nome?: string | undefined;
    matricula?: string | undefined;
    cpf?: string | undefined;
    cargo_id?: string | undefined;
    departamento_id?: string | undefined;
}, {
    status?: "Ativo" | "Inativo" | "Afastado" | "Ferias" | undefined;
    nome?: string | undefined;
    matricula?: string | undefined;
    cpf?: string | undefined;
    cargo_id?: string | undefined;
    departamento_id?: string | undefined;
}>;
export declare const validateColaboradorCreate: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
export declare const validateColaboradorUpdate: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=colaborador.validator.d.ts.map
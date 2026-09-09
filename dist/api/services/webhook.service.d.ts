export interface IWebhookConfig {
    id?: string;
    evento: string;
    url_destino: string;
    ativo?: boolean;
    criado_em?: Date;
}
export interface IWebhookPayload {
    evento: string;
    timestamp: string;
    dados: any;
}
export declare class WebhookService {
    static buscarPorEvento(evento: string): Promise<IWebhookConfig[]>;
    static disparar(evento: string, dados: any): Promise<void>;
    static listarTodos(): Promise<IWebhookConfig[]>;
    static criar(config: Omit<IWebhookConfig, 'id' | 'criado_em'>): Promise<IWebhookConfig>;
    static atualizar(id: string, config: Partial<Omit<IWebhookConfig, 'id' | 'criado_em'>>): Promise<IWebhookConfig | null>;
    static excluir(id: string): Promise<boolean>;
}
//# sourceMappingURL=webhook.service.d.ts.map
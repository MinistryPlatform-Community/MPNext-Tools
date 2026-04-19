import { MinistryPlatformClient } from "../client";
import { CommunicationInfo, Communication, MessageInfo, TableQueryParams, QueryParams } from "../types";
import { logger } from "../utils/logger";

type UserIdParams = Pick<TableQueryParams, '$userId'>;

function toQueryParams(params?: UserIdParams): QueryParams | undefined {
    if (params?.$userId === undefined) return undefined;
    return { $userId: params.$userId };
}

export class CommunicationService {
    private client: MinistryPlatformClient;

    constructor(client: MinistryPlatformClient) {
        this.client = client;
    }

    /**
     * Creates a new communication, immediately renders it and schedules for delivery.
     */
    public async createCommunication(
        communication: CommunicationInfo,
        attachments?: File[],
        params?: UserIdParams
    ): Promise<Communication> {
        try {
            await this.client.ensureValidToken();

            const queryParams = toQueryParams(params);

            if (attachments && attachments.length > 0) {
                return await this.createCommunicationWithAttachments(communication, attachments, queryParams);
            } else {
                return await this.client.getHttpClient().post<Communication>('/communications', { ...communication }, queryParams);
            }
        } catch (error) {
            logger.error('Error creating communication:', error);
            throw error;
        }
    }
    /**
     * Creates email messages from the provided information and immediately schedules them for delivery.
     */
    public async sendMessage(
        message: MessageInfo,
        attachments?: File[],
        params?: UserIdParams
    ): Promise<Communication> {
        try {
            await this.client.ensureValidToken();

            const queryParams = toQueryParams(params);

            if (attachments && attachments.length > 0) {
                return await this.sendMessageWithAttachments(message, attachments, queryParams);
            } else {
                return await this.client.getHttpClient().post<Communication>('/messages', { ...message }, queryParams);
            }
        } catch (error) {
            logger.error('Error sending message:', error);
            throw error;
        }
    }

    private async createCommunicationWithAttachments(
        communication: CommunicationInfo,
        attachments: File[],
        queryParams?: QueryParams
    ): Promise<Communication> {
        const formData = new FormData();
        formData.append('communication', JSON.stringify(communication));

        attachments.forEach((file, index) => {
            formData.append(`file-${index}`, file, file.name);
        });

        return await this.client.getHttpClient().postFormData<Communication>('/communications', formData, queryParams);
    }

    private async sendMessageWithAttachments(
        message: MessageInfo,
        attachments: File[],
        queryParams?: QueryParams
    ): Promise<Communication> {
        const formData = new FormData();
        formData.append('message', JSON.stringify(message));

        attachments.forEach((file, index) => {
            formData.append(`file-${index}`, file, file.name);
        });

        return await this.client.getHttpClient().postFormData<Communication>('/messages', formData, queryParams);
    }
}

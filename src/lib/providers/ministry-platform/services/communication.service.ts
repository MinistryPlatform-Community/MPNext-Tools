import { MinistryPlatformClient } from "../client";
import { CommunicationInfo, Communication, MessageInfo } from "../types";

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
        attachments?: File[]
    ): Promise<Communication> {
        try {
            await this.client.ensureValidToken();

            if (attachments && attachments.length > 0) {
                return await this.createCommunicationWithAttachments(communication, attachments);
            } else {
                return await this.client.getHttpClient().post<Communication>('/communications', { ...communication });
            }
        } catch (error) {
            console.error('Error creating communication:', error);
            throw error;
        }
    }
    /**
     * Creates email messages from the provided information and immediately schedules them for delivery.
     */
    public async sendMessage(
        message: MessageInfo,
        attachments?: File[]
    ): Promise<Communication> {
        try {
            await this.client.ensureValidToken();

            if (attachments && attachments.length > 0) {
                return await this.sendMessageWithAttachments(message, attachments);
            } else {
                return await this.client.getHttpClient().post<Communication>('/messages', { ...message });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    private async createCommunicationWithAttachments(
        communication: CommunicationInfo,
        attachments: File[]
    ): Promise<Communication> {
        const formData = new FormData();
        formData.append('communication', JSON.stringify(communication));
        
        attachments.forEach((file, index) => {
            formData.append(`file-${index}`, file, file.name);
        });

        return await this.client.getHttpClient().postFormData<Communication>('/communications', formData);
    }

    private async sendMessageWithAttachments(
        message: MessageInfo,
        attachments: File[]
    ): Promise<Communication> {
        const formData = new FormData();
        formData.append('message', JSON.stringify(message));
        
        attachments.forEach((file, index) => {
            formData.append(`file-${index}`, file, file.name);
        });

        return await this.client.getHttpClient().postFormData<Communication>('/messages', formData);
    }
}
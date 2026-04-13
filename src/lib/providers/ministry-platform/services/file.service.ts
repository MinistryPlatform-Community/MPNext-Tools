import { MinistryPlatformClient } from "../client";
import { FileDescription, FileUpdateParams, FileUploadParams } from "../types";

export class FileService {
    private client: MinistryPlatformClient;

    constructor(client: MinistryPlatformClient) {
        this.client = client;
    }

    /**
     * Returns the metadata (descriptions) of the files attached to the specified record.
     */
    public async getFilesByRecord(
        table: string,
        recordId: number,
        defaultOnly?: boolean
    ): Promise<FileDescription[]> {
        try {
            await this.client.ensureValidToken();

            const queryParams: Record<string, string> = {};
            if (defaultOnly !== undefined) {
                queryParams['$default'] = defaultOnly.toString();
            }

            return await this.client.getHttpClient().get<FileDescription[]>(
                `/files/${table}/${recordId}`,
                queryParams
            );
        } catch (error) {
            console.error('Error getting files by record:', error);
            throw error;
        }
    }

    /**
     * Uploads and attaches multiple files to the specified record.
     */
    public async uploadFiles(
        table: string,
        recordId: number,
        files: File[],
        params?: FileUploadParams
    ): Promise<FileDescription[]> {
        try {
            await this.client.ensureValidToken();

            const formData = new FormData();
            
            files.forEach((file, index) => {
                formData.append(`file-${index}`, file, file.name);
            });

            // Add optional parameters to form data if provided
            if (params?.description) {
                formData.append('description', params.description);
            }
            if (params?.isDefaultImage !== undefined) {
                formData.append('isDefaultImage', params.isDefaultImage.toString());
            }
            if (params?.longestDimension) {
                formData.append('longestDimension', params.longestDimension.toString());
            }

            const queryParams: Record<string, string> = {};
            if (params?.description) queryParams['$description'] = params.description;
            if (params?.isDefaultImage !== undefined) queryParams['$default'] = params.isDefaultImage.toString();
            if (params?.longestDimension) queryParams['$longestDimension'] = params.longestDimension.toString();
            if (params?.userId) queryParams['$userId'] = params.userId.toString();

            return await this.client.getHttpClient().postFormData<FileDescription[]>(
                `/files/${table}/${recordId}`,
                formData,
                queryParams
            );
        } catch (error) {
            console.error('Error uploading files:', error);
            throw error;
        }
    }

    /**
     * Updates the content and/or metadata of the file corresponding to provided identifier.
     */
    public async updateFile(
        fileId: number,
        file?: File,
        params?: FileUpdateParams
    ): Promise<FileDescription> {
        try {
            await this.client.ensureValidToken();

            const formData = new FormData();
            
            if (file) {
                formData.append('file', file, file.name);
            }

            // Add optional parameters to form data if provided
            if (params?.fileName) {
                formData.append('fileName', params.fileName);
            }
            if (params?.description) {
                formData.append('description', params.description);
            }
            if (params?.isDefaultImage !== undefined) {
                formData.append('isDefaultImage', params.isDefaultImage.toString());
            }
            if (params?.longestDimension) {
                formData.append('longestDimension', params.longestDimension.toString());
            }

            const queryParams: Record<string, string> = {};
            if (params?.fileName) queryParams['$fileName'] = params.fileName;
            if (params?.description) queryParams['$description'] = params.description;
            if (params?.isDefaultImage !== undefined) queryParams['$default'] = params.isDefaultImage.toString();
            if (params?.longestDimension) queryParams['$longestDimension'] = params.longestDimension.toString();
            if (params?.userId) queryParams['$userId'] = params.userId.toString();

            return await this.client.getHttpClient().putFormData<FileDescription>(
                `/files/${fileId}`,
                formData,
                queryParams
            );
        } catch (error) {
            console.error('Error updating file:', error);
            throw error;
        }
    }

    /**
     * Deletes the file corresponding to provided identifier.
     */
    public async deleteFile(
        fileId: number,
        userId?: number
    ): Promise<void> {
        try {
            await this.client.ensureValidToken();

            const queryParams: Record<string, string> = {};
            if (userId) {
                queryParams['$userId'] = userId.toString();
            }

            await this.client.getHttpClient().delete<void>(`/files/${fileId}`, queryParams);
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * Returns the content of the file corresponding to provided globally unique identifier.
     * This method does NOT require authentication.
     */
    public async getFileContentByUniqueId(
        uniqueFileId: string,
        thumbnail?: boolean
    ): Promise<Blob> {
        try {
            const queryParams: Record<string, string> = {};
            if (thumbnail !== undefined) {
                queryParams['$thumbnail'] = thumbnail.toString();
            }

            const url = this.client.getHttpClient().buildUrl(`/files/${uniqueFileId}`, queryParams);
            
            const response = await fetch(url, {
                method: 'GET'
                // No authorization header needed for this endpoint
            });

            if (!response.ok) {
                throw new Error(`GET /files/${uniqueFileId} failed: ${response.status} ${response.statusText}`);
            }

            return await response.blob();
        } catch (error) {
            console.error('Error getting file content by unique ID:', error);
            throw error;
        }
    }

    /**
     * Returns the file metadata (description) corresponding to provided database identifier.
     */
    public async getFileMetadata(fileId: number): Promise<FileDescription> {
        try {
            await this.client.ensureValidToken();

            return await this.client.getHttpClient().get<FileDescription>(`/files/${fileId}/metadata`);
        } catch (error) {
            console.error('Error getting file metadata:', error);
            throw error;
        }
    }

    /**
     * Returns the file metadata (description) corresponding to provided globally unique identifier.
     */
    public async getFileMetadataByUniqueId(uniqueFileId: string): Promise<FileDescription> {
        try {
            await this.client.ensureValidToken();

            return await this.client.getHttpClient().get<FileDescription>(`/files/${uniqueFileId}/metadata`);
        } catch (error) {
            console.error('Error getting file metadata by unique ID:', error);
            throw error;
        }
    }
}
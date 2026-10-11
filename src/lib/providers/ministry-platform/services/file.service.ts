import { MinistryPlatformClient } from "../client";
import { FileDescription, FileUpdateParams, FileUploadParams } from "../types";
import { logger } from "../utils/logger";
import { errorName, sanitizeIdentifier, sanitizeRecordId, sanitizeUniqueId } from "./guards";

/**
 * Timeout for the one fetch this service makes itself (the public file-content
 * download). Every other call goes through HttpClient.
 */
export const FILE_CONTENT_TIMEOUT_MS = 20_000;

/*
 * Path segments for the `/files` endpoints. Each value is validated for its
 * shape (identifier / positive integer / GUID) and then encoded, so a caller
 * cannot aim the service bearer at another MP path with `..`, `/`, `?` or `#`.
 * They run before any token or network work, and throw a fixed message that
 * never echoes the input. File unique IDs are download capabilities (MP serves
 * `/files/{uniqueId}` unauthenticated), so they never reach a log or message.
 */
function tableSegment(table: unknown): string {
    return encodeURIComponent(sanitizeIdentifier(table, 'table name'));
}

function idSegment(id: unknown, field: string): string {
    return encodeURIComponent(String(sanitizeRecordId(id, field)));
}

function guidSegment(uniqueFileId: unknown): string {
    return encodeURIComponent(sanitizeUniqueId(uniqueFileId));
}

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
        const endpoint = `/files/${tableSegment(table)}/${idSegment(recordId, 'record ID')}`;
        try {
            await this.client.ensureValidToken();

            const queryParams: Record<string, string> = {};
            if (defaultOnly !== undefined) {
                queryParams['$default'] = defaultOnly.toString();
            }

            return await this.client.getHttpClient().get<FileDescription[]>(
                endpoint,
                queryParams
            );
        } catch (error) {
            logger.error('mp.files.get_by_record_failed', { table, error: errorName(error) });
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
        const endpoint = `/files/${tableSegment(table)}/${idSegment(recordId, 'record ID')}`;
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
                endpoint,
                formData,
                queryParams
            );
        } catch (error) {
            logger.error('mp.files.upload_failed', { table, count: files.length, error: errorName(error) });
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
        const endpoint = `/files/${idSegment(fileId, 'file ID')}`;
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
                endpoint,
                formData,
                queryParams
            );
        } catch (error) {
            logger.error('mp.files.update_failed', { error: errorName(error) });
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
        const endpoint = `/files/${idSegment(fileId, 'file ID')}`;
        try {
            await this.client.ensureValidToken();

            const queryParams: Record<string, string> = {};
            if (userId) {
                queryParams['$userId'] = userId.toString();
            }

            await this.client.getHttpClient().delete<void>(endpoint, queryParams);
        } catch (error) {
            logger.error('mp.files.delete_failed', { error: errorName(error) });
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
        const endpoint = `/files/${guidSegment(uniqueFileId)}`;
        try {
            const queryParams: Record<string, string> = {};
            if (thumbnail !== undefined) {
                queryParams['$thumbnail'] = thumbnail.toString();
            }

            const url = this.client.getHttpClient().buildUrl(endpoint, queryParams);
            
            const response = await fetch(url, {
                method: 'GET',
                // No authorization header needed for this endpoint. A stalled MP
                // must not hold the request for undici's 300 s default, and the
                // MP API has no legitimate redirects.
                signal: AbortSignal.timeout(FILE_CONTENT_TIMEOUT_MS),
                redirect: 'error',
            });

            if (!response.ok) {
                throw new Error(`GET /files/{uniqueId} failed: ${response.status} ${response.statusText}`);
            }

            return await response.blob();
        } catch (error) {
            logger.error('mp.files.get_content_failed', { error: errorName(error) });
            throw error;
        }
    }

    /**
     * Returns the file metadata (description) corresponding to provided database identifier.
     */
    public async getFileMetadata(fileId: number): Promise<FileDescription> {
        const endpoint = `/files/${idSegment(fileId, 'file ID')}/metadata`;
        try {
            await this.client.ensureValidToken();

            return await this.client.getHttpClient().get<FileDescription>(endpoint);
        } catch (error) {
            logger.error('mp.files.get_metadata_failed', { error: errorName(error) });
            throw error;
        }
    }

    /**
     * Returns the file metadata (description) corresponding to provided globally unique identifier.
     */
    public async getFileMetadataByUniqueId(uniqueFileId: string): Promise<FileDescription> {
        const endpoint = `/files/${guidSegment(uniqueFileId)}/metadata`;
        try {
            await this.client.ensureValidToken();

            return await this.client.getHttpClient().get<FileDescription>(endpoint);
        } catch (error) {
            logger.error('mp.files.get_metadata_by_unique_id_failed', { error: errorName(error) });
            throw error;
        }
    }
}
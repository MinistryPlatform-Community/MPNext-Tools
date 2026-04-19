import { MinistryPlatformClient } from "./client";
import { 
    TableService,
    ProcedureService,
    CommunicationService,
    MetadataService,
    DomainService,
    FileService
} from "./services";
import {
    TableQueryParams,
    ProcedureInfo,
    CommunicationInfo,
    Communication,
    MessageInfo,
    DomainInfo,
    GlobalFilterItem,
    GlobalFilterParams,
    TableRecord,
    FileDescription,
    FileUploadParams,
    FileUpdateParams,
    TableMetadata,
    QueryParams,
    RecurrencePattern,
    CopyParameters
} from "./types";

/**
 * MinistryPlatformProvider - Core Provider Singleton
 * 
 * Central orchestrator for all Ministry Platform operations using the Singleton pattern.
 * Manages service instances and provides a unified interface for:
 * - Table operations (CRUD)
 * - Stored procedure execution
 * - Communication/messaging
 * - File management
 * - Metadata operations
 * - Domain configuration
 * 
 * All services share a single MinistryPlatformClient instance for consistent
 * authentication and configuration management.
 */
export class MinistryPlatformProvider {
    
    // Singleton instance storage
    private static instance: MinistryPlatformProvider;

    // Core client for HTTP operations and authentication
    private client: MinistryPlatformClient;
    
    // Specialized service instances for different domains of functionality
    private tableService: TableService;           // CRUD operations for all tables
    private procedureService: ProcedureService;   // Stored procedure execution
    private communicationService: CommunicationService; // Email/SMS communications
    private metadataService: MetadataService;     // Schema and metadata operations
    private domainService: DomainService;         // Domain configuration and filters
    private fileService: FileService;             // File upload/download operations

    /**
     * Private constructor for Singleton pattern
     * Initializes the core client and all specialized service instances
     */
    private constructor() {
        // Create the core HTTP client with authentication management
        this.client = new MinistryPlatformClient();
        
        // Initialize all service instances with shared client
        this.tableService = new TableService(this.client);
        this.procedureService = new ProcedureService(this.client);
        this.communicationService = new CommunicationService(this.client);
        this.metadataService = new MetadataService(this.client);
        this.domainService = new DomainService(this.client);
        this.fileService = new FileService(this.client);
    }    
    
    /**
     * Returns the singleton instance of the Ministry Platform provider
     * Creates the instance on first call, returns existing instance on subsequent calls
     * @returns The singleton MinistryPlatformProvider instance
     */
    public static getInstance(): MinistryPlatformProvider {
        // Create instance if it doesn't exist (lazy initialization)
        if (!this.instance) {
            this.instance = new MinistryPlatformProvider();
        }

        return this.instance;
    }

    // Domain Service Methods
    /**
     * Returns the basic information about the current domain.
     * @returns Promise with the domain information
     */
    public async getDomainInfo(): Promise<DomainInfo> {
        return this.domainService.getDomainInfo();
    }

    /**
     * Returns the lookup values to be used as global filters.
     * @param params Optional parameters for the global filters request
     * @returns Promise with an array of global filter items
     */
    public async getGlobalFilters(params?: GlobalFilterParams): Promise<GlobalFilterItem[]> {
        return this.domainService.getGlobalFilters(params);
    }

    // Metadata Service Methods
    /**
     * Triggers an update of the metadata cache on all servers and in all applications.
     * @returns Promise with the response from the API
     */
    public async refreshMetadata(): Promise<void> {
        return this.metadataService.refreshMetadata();
    }

    /**
     * Returns the list of tables available to the current user with basic metadata.
     * @param search Optional search term to filter tables
     * @returns Promise with an array of TableInfo objects
     */
    public async getTables(search?: string): Promise<TableMetadata[]> {
        return this.metadataService.getTables(search);
    }
    // Table Service Methods
    /**
     * Returns the list of records from the specified table satisfying the provided search criteria.
     * @param table Table to retrieve records from
     * @param params Query parameters for filtering, sorting, etc.
     * @returns Promise with an array of records
     */
    public async getTableRecords<T>(table: string, params?: TableQueryParams): Promise<T[]> {
        return this.tableService.getTableRecords<T>(table, params);
    }

    /**
     * Creates new records in the specified table.
     * @param table Table where records need to be created
     * @param records Array of records to be added to the table
     * @param params Additional query parameters
     * @returns Promise with the created records
     */
    public async createTableRecords<T extends TableRecord = TableRecord>(
        table: string, 
        records: T[], 
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        return this.tableService.createTableRecords<T>(table, records, params);
    }

    /**
     * Updates provided records in the specified table.
     * @param table Table where records need to be updated
     * @param records Array of records to be updated in the table
     * @param params Additional query parameters
     * @returns Promise with the updated records
     */
    public async updateTableRecords<T extends TableRecord = TableRecord>(
        table: string, 
        records: T[], 
        params?: Pick<TableQueryParams, '$select' | '$userId' | '$allowCreate'>
    ): Promise<T[]> {
        return this.tableService.updateTableRecords<T>(table, records, params);
    }

    /**
     * Deletes multiple records from the specified table.
     * @param table Table where records need to be deleted
     * @param ids Array of identifiers corresponding to records to be deleted
     * @param params Additional query parameters
     * @returns Promise with the deleted records
     */
    public async deleteTableRecords<T extends TableRecord = TableRecord>(
        table: string, 
        ids: number[], 
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        return this.tableService.deleteTableRecords<T>(table, ids, params);
    }

    // Copy / Recurrence Methods
    /**
     * Creates copies of a record using a recurrence pattern.
     * Does NOT copy related sub-pages or attached files.
     * Creates dp_Sequences entries for native MP series linkage.
     * @param table Table name (e.g., "Events")
     * @param recordId Source record ID to copy
     * @param pattern Recurrence pattern defining the date sequence
     * @param params Optional query parameters ($select, $userId)
     * @returns Promise with an array of created records
     */
    public async copyRecord<T extends TableRecord = TableRecord>(
        table: string,
        recordId: number,
        pattern: RecurrencePattern,
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        return this.tableService.copyRecord<T>(table, recordId, pattern, params);
    }

    /**
     * Creates copies of a record using a recurrence pattern.
     * Allows copying related sub-pages and attached files.
     * Creates dp_Sequences entries for native MP series linkage.
     * @param table Table name (e.g., "Events")
     * @param recordId Source record ID to copy
     * @param copyParams Copy parameters including recurrence pattern, sub-page IDs, and options
     * @param params Optional query parameters ($select, $userId)
     * @returns Promise with an array of created records
     */
    public async copyRecordWithSubpages<T extends TableRecord = TableRecord>(
        table: string,
        recordId: number,
        copyParams: CopyParameters,
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        return this.tableService.copyRecordWithSubpages<T>(table, recordId, copyParams, params);
    }

    /**
     * Generates a sequence of dates according to the specified recurrence pattern.
     * Useful for previewing dates before creating a series.
     * @param pattern Recurrence pattern defining the date sequence
     * @returns Promise with an array of ISO datetime strings
     * @see GET /tasks/generate-sequence
     */
    public async generateSequence(pattern: RecurrencePattern): Promise<string[]> {
        await this.client.ensureValidToken();

        const queryParams: QueryParams = {
            $type: pattern.Type,
            $interval: pattern.Interval,
            $startDate: pattern.StartDate,
        };
        if (pattern.EndDate) queryParams.$endDate = pattern.EndDate;
        if (pattern.TotalOccurrences) queryParams.$totalOccurrences = pattern.TotalOccurrences;
        if (pattern.Weekdays) queryParams.$weekdays = pattern.Weekdays;
        if (pattern.DayPosition) queryParams.$dayPosition = pattern.DayPosition;
        if (pattern.Day) queryParams.$day = pattern.Day;
        if (pattern.Month) queryParams.$month = pattern.Month;

        return this.client.getHttpClient().get<string[]>('/tasks/generate-sequence', queryParams);
    }

    // Procedure Service Methods
    /**
     * Returns the list of procedures available to the current user with basic metadata.
     * @param search Optional search term to filter procedures
     * @returns Promise with an array of ProcedureInfo objects
     */
    public async getProcedures(search?: string): Promise<ProcedureInfo[]> {
        return this.procedureService.getProcedures(search);
    }

    /**
     * Executes the requested stored procedure retrieving parameters from the query string.
     * @param procedure Stored procedure name
     * @param params Query parameters to pass to the procedure
     * @returns Promise with the procedure results
     */
    public async executeProcedure(
        procedure: string, 
        params?: QueryParams
    ): Promise<unknown[][]> {
        return this.procedureService.executeProcedure(procedure, params);
    }

    /**
     * Executes the requested stored procedure with provided parameters in the request body.
     * @param procedure Stored procedure name
     * @param parameters Parameters to be used for calling stored procedure
     * @param queryParams Optional query-string params (e.g. `{ $userId }` for audit attribution)
     * @returns Promise with the procedure results
     */
    public async executeProcedureWithBody(
        procedure: string,
        parameters: Record<string, unknown>,
        queryParams?: QueryParams
    ): Promise<unknown[][]> {
        return this.procedureService.executeProcedureWithBody(procedure, parameters, queryParams);
    }

    // Communication Service Methods
    /**
     * Creates a new communication, immediately renders it and schedules for delivery.
     * Supports both simple JSON communication and multipart form data with file attachments.
     * @param communication Communication information object
     * @param attachments Optional array of file attachments
     * @param params Optional params (`$userId` for audit attribution)
     * @returns Promise with the created communication
     */
    public async createCommunication(
        communication: CommunicationInfo,
        attachments?: File[],
        params?: Pick<TableQueryParams, '$userId'>
    ): Promise<Communication> {
        return this.communicationService.createCommunication(communication, attachments, params);
    }

    /**
     * Creates email messages from the provided information and immediately schedules them for delivery.
     * Supports both simple JSON message and multipart form data with file attachments.
     * @param message Message information object
     * @param attachments Optional array of file attachments
     * @param params Optional params (`$userId` for audit attribution)
     * @returns Promise with the created communication
     */
    public async sendMessage(
        message: MessageInfo,
        attachments?: File[],
        params?: Pick<TableQueryParams, '$userId'>
    ): Promise<Communication> {
        return this.communicationService.sendMessage(message, attachments, params);
    }

    // File Service Methods
    /**
     * Returns the metadata (descriptions) of the files attached to the specified record.
     * @param table Table name where the record exists
     * @param recordId ID of the record to get files for
     * @param defaultOnly Optional flag to return only default files
     * @returns Promise with an array of file descriptions
     */
    public async getFilesByRecord(
        table: string,
        recordId: number,
        defaultOnly?: boolean
    ): Promise<FileDescription[]> {
        return this.fileService.getFilesByRecord(table, recordId, defaultOnly);
    }

    /**
     * Uploads and attaches multiple files to the specified record.
     * @param table Table name where the record exists
     * @param recordId ID of the record to attach files to
     * @param files Array of files to upload
     * @param params Optional upload parameters
     * @returns Promise with an array of uploaded file descriptions
     */
    public async uploadFiles(
        table: string,
        recordId: number,
        files: File[],
        params?: FileUploadParams
    ): Promise<FileDescription[]> {
        return this.fileService.uploadFiles(table, recordId, files, params);
    }

    /**
     * Updates the content and/or metadata of the file corresponding to provided identifier.
     * @param fileId ID of the file to update
     * @param file Optional new file content
     * @param params Optional update parameters
     * @returns Promise with the updated file description
     */
    public async updateFile(
        fileId: number,
        file?: File,
        params?: FileUpdateParams
    ): Promise<FileDescription> {
        return this.fileService.updateFile(fileId, file, params);
    }

    /**
     * Deletes the file corresponding to provided identifier.
     * @param fileId ID of the file to delete
     * @param userId Optional user ID for auditing
     * @returns Promise that resolves when file is deleted
     */
    public async deleteFile(
        fileId: number,
        userId?: number
    ): Promise<void> {
        return this.fileService.deleteFile(fileId, userId);
    }

    /**
     * Returns the content of the file corresponding to provided globally unique identifier.
     * This method does NOT require authentication.
     * @param uniqueFileId Globally unique file identifier
     * @param thumbnail Optional flag to get thumbnail version
     * @returns Promise with the file content as a Blob
     */
    public async getFileContentByUniqueId(
        uniqueFileId: string,
        thumbnail?: boolean
    ): Promise<Blob> {
        return this.fileService.getFileContentByUniqueId(uniqueFileId, thumbnail);
    }

    /**
     * Returns the file metadata (description) corresponding to provided database identifier.
     * @param fileId Database ID of the file
     * @returns Promise with the file description
     */
    public async getFileMetadata(fileId: number): Promise<FileDescription> {
        return this.fileService.getFileMetadata(fileId);
    }

    /**
     * Returns the file metadata (description) corresponding to provided globally unique identifier.
     * @param uniqueFileId Globally unique file identifier
     * @returns Promise with the file description
     */
    public async getFileMetadataByUniqueId(uniqueFileId: string): Promise<FileDescription> {
        return this.fileService.getFileMetadataByUniqueId(uniqueFileId);
    }
}

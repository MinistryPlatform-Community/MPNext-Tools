import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '@/lib/providers/ministry-platform/utils/http-client';

/**
 * HttpClient Tests
 *
 * Tests for the HTTP client utility that handles all Ministry Platform API requests.
 * Tests cover:
 * - HTTP methods (GET, POST, PUT, DELETE)
 * - URL building and query parameter encoding
 * - Authorization header injection
 * - Error handling for failed requests
 * - FormData handling
 */

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * These tests deliberately drive failure paths, and the code under test logs
 * them on purpose. Silence the channel so a real, unexpected error still
 * stands out in the runner output instead of drowning in expected noise.
 * `mockImplementation` keeps the spy recording, so assertions on what was
 * logged still work.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('HttpClient', () => {
  const baseUrl = 'https://api.ministryplatform.com';
  const mockToken = 'test-access-token-123';
  const getToken = () => mockToken;
  let httpClient: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    httpClient = new HttpClient(baseUrl, getToken);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL Building', () => {
    it('should build URL without query parameters', () => {
      const url = httpClient.buildUrl('/tables/Contacts');
      expect(url).toBe('https://api.ministryplatform.com/tables/Contacts');
    });

    it('should build URL with single query parameter', () => {
      const url = httpClient.buildUrl('/tables/Contacts', { $top: 10 });
      expect(url).toBe('https://api.ministryplatform.com/tables/Contacts?$top=10');
    });

    it('should build URL with multiple query parameters', () => {
      const url = httpClient.buildUrl('/tables/Contacts', {
        $top: 10,
        $skip: 20,
        $select: 'Contact_ID,Display_Name',
      });
      expect(url).toContain('$top=10');
      expect(url).toContain('$skip=20');
      expect(url).toContain('$select=Contact_ID%2CDisplay_Name');
    });

    it('should URL-encode special characters in query parameters', () => {
      const url = httpClient.buildUrl('/tables/Contacts', {
        $filter: "Last_Name LIKE 'Smith%'",
      });
      expect(url).toContain("$filter=Last_Name%20LIKE%20'Smith%25'");
    });

    it('should handle array query parameters', () => {
      const url = httpClient.buildUrl('/tables/Contact_Log', {
        id: [1, 2, 3],
      });
      expect(url).toContain('id=1');
      expect(url).toContain('id=2');
      expect(url).toContain('id=3');
    });

    it('should filter out undefined and null query parameters', () => {
      const url = httpClient.buildUrl('/tables/Contacts', {
        $top: 10,
        $skip: undefined,
        $filter: null,
      });
      expect(url).toBe('https://api.ministryplatform.com/tables/Contacts?$top=10');
    });

    it('should return base URL when all query params are undefined/null', () => {
      const url = httpClient.buildUrl('/tables/Contacts', {
        $top: undefined,
        $skip: null,
      });
      expect(url).toBe('https://api.ministryplatform.com/tables/Contacts');
    });

    it('should handle boolean query parameters', () => {
      const url = httpClient.buildUrl('/tables/Contacts', {
        $distinct: true,
      });
      expect(url).toBe('https://api.ministryplatform.com/tables/Contacts?$distinct=true');
    });
  });

  describe('GET Requests', () => {
    it('should make GET request with authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ Contact_ID: 1, Display_Name: 'John Doe' }]),
      });

      const result = await httpClient.get('/tables/Contacts');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ministryplatform.com/tables/Contacts',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-access-token-123',
            'Accept': 'application/json',
          },
        }
      );
      expect(result).toEqual([{ Contact_ID: 1, Display_Name: 'John Doe' }]);
    });

    it('should make GET request with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await httpClient.get('/tables/Contacts', { $top: 10, $filter: 'Active=1' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('$top=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('$filter=Active%3D1'),
        expect.any(Object)
      );
    });

    it('should throw error on failed GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(''),
      });

      await expect(httpClient.get('/tables/NonExistent')).rejects.toThrow(
        'GET /tables/NonExistent failed: 404 Not Found'
      );
    });

    it('should throw error on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve(''),
      });

      await expect(httpClient.get('/tables/Contacts')).rejects.toThrow(
        'GET /tables/Contacts failed: 401 Unauthorized'
      );
    });

    it('should throw error on 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(''),
      });

      await expect(httpClient.get('/tables/Contacts')).rejects.toThrow(
        'GET /tables/Contacts failed: 500 Internal Server Error'
      );
    });
  });

  describe('POST Requests', () => {
    it('should make POST request with JSON body', async () => {
      const newRecord = { First_Name: 'John', Last_Name: 'Doe' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ Contact_ID: 1, ...newRecord }]),
      });

      const result = await httpClient.post('/tables/Contacts', newRecord);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ministryplatform.com/tables/Contacts',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token-123',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(newRecord),
        }
      );
      expect(result).toEqual([{ Contact_ID: 1, ...newRecord }]);
    });

    it('should make POST request without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await httpClient.post('/some/endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ministryplatform.com/some/endpoint',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token-123',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: undefined,
        }
      );
    });

    it('should make POST request with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await httpClient.post('/tables/Contacts', { Name: 'Test' }, { $userId: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('$userId=1'),
        expect.any(Object)
      );
    });

    it('should throw error on failed POST request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(''),
      });

      await expect(
        httpClient.post('/tables/Contacts', { Invalid: 'data' })
      ).rejects.toThrow('POST /tables/Contacts failed: 400 Bad Request');
    });
  });

  describe('POST FormData Requests', () => {
    it('should make POST request with FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ FileId: 1 }),
      });

      const result = await httpClient.postFormData('/files', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ministryplatform.com/files',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token-123',
            'Accept': 'application/json',
            // No Content-Type for FormData
          },
          body: formData,
        }
      );
      expect(result).toEqual({ FileId: 1 });
    });

    it('should throw error on failed FormData POST', async () => {
      const formData = new FormData();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        text: () => Promise.resolve(''),
      });

      await expect(httpClient.postFormData('/files', formData)).rejects.toThrow(
        'POST /files failed: 413 Payload Too Large'
      );
    });

    it('does NOT leak the response body into the POST FormData error message', async () => {
      const formData = new FormData();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('File type not allowed'),
      });

      await expect(httpClient.postFormData('/files', formData)).rejects.toThrow(
        'POST /files failed: 400 Bad Request'
      );
    });
  });

  describe('PUT Requests', () => {
    it('should make PUT request with JSON body', async () => {
      const updatedRecord = { Contact_ID: 1, First_Name: 'Jane' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([updatedRecord]),
      });

      const result = await httpClient.put('/tables/Contacts', updatedRecord);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ministryplatform.com/tables/Contacts',
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer test-access-token-123',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(updatedRecord),
        }
      );
      expect(result).toEqual([updatedRecord]);
    });

    it('does NOT leak the response body into the thrown error message on failed PUT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Validation error: Field X is required'),
      });

      await expect(
        httpClient.put('/tables/Contacts', { Invalid: 'data' })
      ).rejects.toThrow('PUT /tables/Contacts failed: 400 Bad Request');
    });

    it('should omit body segment from PUT error message when body is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(''),
      });

      await expect(
        httpClient.put('/tables/Contacts', { Invalid: 'data' })
      ).rejects.toThrow('PUT /tables/Contacts failed: 400 Bad Request');
    });
  });

  describe('PUT FormData Requests', () => {
    it('should make PUT request with FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['updated']), 'updated.txt');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ FileId: 1, FileName: 'updated.txt' }),
      });

      const result = await httpClient.putFormData('/files/1', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ministryplatform.com/files/1',
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer test-access-token-123',
            'Accept': 'application/json',
          },
          body: formData,
        }
      );
      expect(result).toEqual({ FileId: 1, FileName: 'updated.txt' });
    });

    it('should throw error on failed PUT FormData request', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['data']), 'fail.txt');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(''),
      });

      await expect(httpClient.putFormData('/files/1', formData)).rejects.toThrow(
        'PUT /files/1 failed: 400 Bad Request'
      );
    });

    it('does NOT leak the response body into the PUT FormData error message', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['bad']), 'fail.txt');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: () => Promise.resolve('Unsupported MIME type'),
      });

      await expect(httpClient.putFormData('/files/1', formData)).rejects.toThrow(
        'PUT /files/1 failed: 422 Unprocessable Entity'
      );
    });
  });

  describe('DELETE Requests', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ Contact_ID: 1 }]),
      });

      const result = await httpClient.delete('/tables/Contacts', { id: [1] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('id=1'),
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-access-token-123',
            'Accept': 'application/json',
          },
        }
      );
      expect(result).toEqual([{ Contact_ID: 1 }]);
    });

    it('should throw error on failed DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve(''),
      });

      await expect(httpClient.delete('/tables/Contacts', { id: [1] })).rejects.toThrow(
        'DELETE /tables/Contacts failed: 403 Forbidden'
      );
    });

    it('does NOT leak the response body into the DELETE error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: () => Promise.resolve('Record has dependent rows'),
      });

      await expect(httpClient.delete('/tables/Contacts', { id: [1] })).rejects.toThrow(
        'DELETE /tables/Contacts failed: 409 Conflict'
      );
    });
  });

  describe('Token Injection', () => {
    it('should use current token from getToken function', async () => {
      let currentToken = 'initial-token';
      const dynamicClient = new HttpClient(baseUrl, () => currentToken);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await dynamicClient.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer initial-token',
          }),
        })
      );

      // Update token
      currentToken = 'updated-token';

      await dynamicClient.get('/test');
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer updated-token',
          }),
        })
      );
    });
  });

  describe('Type Safety', () => {
    it('should return typed response from GET', async () => {
      interface Contact {
        Contact_ID: number;
        Display_Name: string;
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ Contact_ID: 1, Display_Name: 'Test' }]),
      });

      const result = await httpClient.get<Contact[]>('/tables/Contacts');

      expect(result[0].Contact_ID).toBe(1);
      expect(result[0].Display_Name).toBe('Test');
    });
  });
});

/**
 * F5 — negative tests for PII leakage through the error path.
 *
 * A failed MP request's response body routinely echoes back record content
 * (names, emails, notes) and the `$filter` string that produced it. A thrown
 * message travels much further than a log line — into error reporters,
 * client-visible action results, and every downstream log that stringifies the
 * error — so the body must appear in NEITHER the log NOR the message.
 *
 * These assertions are the ones that survive the next refactor; the shape of
 * the message is incidental, the absence of the body is the point.
 */
describe('HttpClient - error paths leak no record content', () => {
  const SENSITIVE = "Jane Doe <jane.doe@example.org> — Notes: pastoral visit";
  let httpClient: HttpClient;

  function failWith(body: string, status = 400) {
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      statusText: 'Bad Request',
      text: () => Promise.resolve(body),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    httpClient = new HttpClient('https://api.ministryplatform.com', () => 'token');
  });

  it('keeps the response body out of the thrown message', async () => {
    failWith(SENSITIVE);

    const err = await httpClient
      .get('/tables/Contacts', { $filter: "Last_Name = 'Doe'" })
      .catch((e: Error) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toContain('Jane Doe');
    expect((err as Error).message).not.toContain('jane.doe@example.org');
    expect((err as Error).message).not.toContain('Notes');
  });

  it('keeps the query string — and therefore the $filter — out of the thrown message', async () => {
    failWith('boom');

    const err = await httpClient
      .get('/tables/Contacts', { $filter: "Last_Name = 'Doe'" })
      .catch((e: Error) => e);

    expect((err as Error).message).not.toContain('$filter');
    expect((err as Error).message).not.toContain('Last_Name');
  });

  it('keeps the response body out of the log', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    failWith(SENSITIVE);

    await httpClient.get('/tables/Contacts', { $filter: "Last_Name = 'Doe'" }).catch(() => {});

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain('Jane Doe');
    expect(logged).not.toContain('jane.doe@example.org');
    expect(logged).not.toContain('$filter');
    errorSpy.mockRestore();
  });

  it('still logs the identifiers an operator needs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    failWith(SENSITIVE, 503);

    await httpClient.get('/tables/Contacts').catch(() => {});

    expect(errorSpy).toHaveBeenCalledWith(
      '[MP]',
      'mp.request.failed',
      expect.objectContaining({
        method: 'GET',
        endpoint: '/tables/Contacts',
        status: 503,
      }),
    );
    errorSpy.mockRestore();
  });
});

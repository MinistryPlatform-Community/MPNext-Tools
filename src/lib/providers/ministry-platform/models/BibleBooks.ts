/**
 * Interface for Bible_Books
* Table: Bible_Books
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface BibleBooks {

  Bible_Book_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Book: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  BookShort: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Testament: string /* max 50 chars */;
}

export type BibleBooksRecord = BibleBooks;

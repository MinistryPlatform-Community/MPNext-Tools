declare module 'docxtemplater-image-module-free' {
  interface ImageModuleOptions {
    centered?: boolean;
    getImage: (tagValue: unknown, tagName: string) => Buffer | string;
    getSize: (
      img: Buffer | string,
      tagValue: unknown,
      tagName: string
    ) => [number, number];
  }

  class ImageModule {
    constructor(options: ImageModuleOptions);
  }

  export default ImageModule;
}

declare global {
  // biome-ignore lint: because is a global declaration file
  namespace Express {
    interface Request {
      requestId?: string;
      file?: Express.Multer.File;
    }
  }
}

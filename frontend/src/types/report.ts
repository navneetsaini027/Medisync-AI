export interface UploadedReportFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ReportResult {
  simplifiedReport?: string;
  recommendations?: string[];
  insights?: string;
  resources?: { title: string; url: string }[];
  reportId?: string;
  uploadedFiles?: UploadedReportFile[];
  fileStorageStatus?: 'stored' | 'skipped' | 'failed';
}

export interface LanguageOption {
  name: string;
  native: string;
  flag: string;
}

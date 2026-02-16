import type { ProjectType, ProjectStatus } from "@prisma/client";

export type { ProjectType, ProjectStatus };

export interface CreateProjectInput {
  name: string;
  clientName: string;
  type: ProjectType;
  date: Date;
  pin?: string;
  selectionDeadline?: Date;
}

export interface UpdateProjectInput {
  name?: string;
  clientName?: string;
  type?: ProjectType;
  date?: Date;
  pin?: string | null;
  slug?: string;
  coverKey?: string;
  status?: ProjectStatus;
  selectionDeadline?: Date | null;
}

export interface UploadFileInfo {
  filename: string;
  contentType: string;
}

export interface PresignedUrlResult {
  objectKey: string;
  thumbnailKey: string;
  uploadUrl: string;
  thumbnailUploadUrl: string;
}

export interface ConfirmUploadInput {
  objectKey: string;
  thumbnailKey: string;
  originalFilename: string;
  width?: number;
  height?: number;
  size: number;
}

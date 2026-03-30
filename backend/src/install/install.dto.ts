import { IsOptional, IsString, MinLength } from 'class-validator';

export class InstallApplyDto {
  @IsString()
  @MinLength(1)
  adminUsername!: string;

  @IsString()
  @MinLength(1)
  adminPassword!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_SECRET should be at least 16 characters' })
  jwtSecret!: string;

  @IsString()
  @MinLength(1)
  dbHost!: string;

  @IsOptional()
  @IsString()
  dbPort?: string;

  @IsString()
  @MinLength(1)
  dbDatabase!: string;

  @IsString()
  @MinLength(1)
  dbUsername!: string;

  /** Allow empty password for local dev MySQL */
  @IsOptional()
  @IsString()
  dbPassword?: string;

  @IsString()
  @MinLength(1)
  cozePat!: string;

  @IsString()
  @MinLength(1)
  cozeBotId!: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  cozeApiBase?: string;
}

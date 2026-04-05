import { databaseConfig } from '../config/database.config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const AppDataSource = new DataSource(
  databaseConfig as DataSourceOptions,
);

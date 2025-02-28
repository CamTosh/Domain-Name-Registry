import type { Database } from "bun:sqlite";

export interface Greeting {
  svID: string;
  svDate: string;
  versions: string[];
  langs: string[];
  objURIs: string[];
  extURIs?: string[];
}

export interface BaseCommand {
  type: 'login' | 'check' | 'create' | 'info';
}

export interface LoginCommand extends BaseCommand {
  type: 'login';
  id: string;
  pw: string;
}

export interface CheckCommand extends BaseCommand {
  type: 'check';
  domain: string;
}

export interface CreateCommand extends BaseCommand {
  type: 'create';
  domain: string;
  registrar: string;
}

export interface InfoCommand extends BaseCommand {
  type: 'info';
  domain: string;
}

export type EppCommand = LoginCommand | CheckCommand | CreateCommand | InfoCommand;

export interface Domain {
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'deleted';
  registrar: string;
  created_at: number;
  updated_at: number | null;
  expiry_date: number | null;
}

export interface Registrar {
  id: string;
  password: string;
  credits: number;
}

export interface Session {
  registrar: string;
  loginTime: number;
}

export interface RateLimit {
  count: number;
  timestamp: number;
}

export interface AppState {
  db: Database;
  sessions: Map<string, Session>;
  rateLimit: Map<string, RateLimit>;
}

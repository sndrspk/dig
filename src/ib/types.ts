export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string[];
}

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  interval: number;
  expiresIn: number;
}

export interface StatusResponse {
  result?: boolean;
  authenticated?: boolean;
  message?: string;
  token?: string;
  status?: { timestamp?: string; lastmodified?: string };
  user?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export type RawCollection = Record<string, unknown> & {
  map?: Record<string, number>;
};

export interface RawTag {
  name?: unknown;
  archived?: unknown;
  tracks?: unknown;
}

export interface RawLibrary {
  albums?: RawCollection;
  artists?: RawCollection;
  tracks?: RawCollection;
  playlists?: RawCollection;
  tags?: Record<string, RawTag>;
  trash?: RawCollection;
  status?: { lastmodified?: string };
}

export interface LibraryResponse {
  result?: boolean;
  authenticated?: boolean;
  message?: string;
  status?: { timestamp?: string; lastmodified?: string };
  settings?: Record<string, unknown>;
  library?: RawLibrary;
}

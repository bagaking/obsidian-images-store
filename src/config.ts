export const FILENAME_TEMPLATE = "media_asset";

export const MAX_FILENAME_INDEX = 1000;

export const FILENAME_ATTEMPTS = 5;

export const EXTERNAL_MEDIA_ASSET_LINK_PATTERN =
  /\!\[(?<anchor>.*?)\]\((?<link>.+?)\)/g;

export const DIRTY_IMAGE_TAG = /\[\!\[\[(?<anchor>.*?)\]\]\((?<link>.+?)\)\]/g;

export const ANY_URL_PATTERN =
  /[a-zA-Z\d]+:\/\/(\w+:\w+@)?([a-zA-Z\d.-]+\.[A-Za-z]{2,4})(:\d+)?(\/.*)?/i;

// Looks like timeouts in Obsidian API are set in milliseconds
export const NOTICE_TIMEOUT = 10 * 1000;

export const TIMEOUT_LIKE_INFINITY = 24 * 60 * 60 * 1000;

export const FORBIDDEN_SYMBOLS_FILENAME_PATTERN = /\s+/g;
export interface ISettings {
  realTimeUpdate: boolean;
  realTimeUpdateInterval: number;
  realTimeAttemptsToProcess: number;
  cleanContent: boolean;
  showNotifications: boolean;
  include: string;
  assetDir: string;
  createFileDir: boolean
  namePattern: string
}

export const DEFAULT_SETTINGS: ISettings = {
  realTimeUpdate: false,
  realTimeUpdateInterval: 1000,
  realTimeAttemptsToProcess: 3,
  cleanContent: true,
  showNotifications: false,
  include: ".*\\.md",
  assetDir: "_assets",
  createFileDir: true,
  namePattern: "{{FileName}}_{{Anchor}}{{DATE:_YYYY-MM-DD}}"
};

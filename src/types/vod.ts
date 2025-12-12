/**
 * Video On Demand (VOD) Types
 * Based on the Video API response structure from http://caiji.dyttzyapi.com/api.php/provide/vod
 */

/**
 * Basic VOD item returned in list responses
 * Note: vod_pic may be included in list responses from some API sources
 */
export interface VODItem {
  vod_id: number;
  vod_name: string;
  type_id: number;
  type_name: string;
  vod_en: string;
  vod_time: string;
  vod_remarks: string;
  vod_play_from: string;
  vod_pic?: string;
}

/**
 * Detailed VOD information returned for single item requests
 */
export interface VODDetail extends VODItem {
  vod_sub: string;
  vod_pic: string;
  vod_actor: string;
  vod_director: string;
  vod_blurb: string;
  vod_content: string;
  vod_area: string;
  vod_lang: string;
  vod_year: string;
  vod_score: string;
  vod_douban_score: string;
  vod_play_url: string;
  vod_play_server: string;
  vod_class: string;
  vod_isend: number;
  vod_total: number;
}

/**
 * Category/Type information
 */
export interface Category {
  type_id: number;
  type_pid: number;
  type_name: string;
}

/**
 * Single episode within a play source
 */
export interface Episode {
  name: string;
  url: string;
}


/**
 * Play source containing multiple episodes
 * A VOD can have multiple play sources (e.g., dytt, dyttm3u8)
 */
export interface PlaySource {
  name: string;
  episodes: Episode[];
}

/**
 * Raw API response for VOD list requests
 */
export interface VODListResponse {
  code: number;
  msg: string;
  page: number;
  pagecount: number;
  limit: string;
  total: number;
  list: VODItem[];
  class: Category[];
}

/**
 * Raw API response for VOD detail requests
 */
export interface VODDetailResponse {
  code: number;
  msg: string;
  page: number;
  pagecount: number;
  limit: string;
  total: number;
  list: VODDetail[];
  class: Category[];
}

/**
 * Paginated response wrapper for internal API use
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parameters for VOD list requests
 */
export interface VODListParams {
  page?: number;
  pageSize?: number;
  typeId?: number;
  hours?: number;
}

/**
 * Parameters for search requests
 */
export interface SearchParams {
  keyword: string;
  page?: number;
  pageSize?: number;
}

/**
 * API status information for admin dashboard
 */
export interface APIStatus {
  isAvailable: boolean;
  responseTime: number;
  lastSuccessfulSync: Date | null;
  errorRate: number;
  cachedCategories: number;
  cachedVODs: number;
}

/**
 * Play URL Parser Utility
 * 
 * Parses the vod_play_url format from the Video API.
 * Format: "sourceName1$url1#sourceName2$url2$$sourceName1$url1#sourceName2$url2"
 * 
 * - $$ separates different play sources
 * - # separates episodes within a source
 * - $ separates episode name from URL
 * 
 * Requirements: 3.3
 */

import { Episode, PlaySource } from '@/types';

/**
 * Source separator - separates different play sources (e.g., dytt$$dyttm3u8)
 */
const SOURCE_SEPARATOR = '$$$';

/**
 * Episode separator - separates episodes within a source
 */
const EPISODE_SEPARATOR = '#';

/**
 * Name-URL separator - separates episode name from its URL
 */
const NAME_URL_SEPARATOR = '$';

/**
 * Parses a single episode string in format "name$url"
 * @param episodeStr - Episode string to parse
 * @returns Episode object or null if invalid
 */
function parseEpisode(episodeStr: string): Episode | null {
  if (!episodeStr || typeof episodeStr !== 'string') {
    return null;
  }

  const trimmed = episodeStr.trim();
  if (!trimmed) {
    return null;
  }

  const separatorIndex = trimmed.indexOf(NAME_URL_SEPARATOR);
  
  if (separatorIndex === -1) {
    // No separator found - treat entire string as name with empty URL
    return { name: trimmed, url: '' };
  }

  const name = trimmed.substring(0, separatorIndex).trim();
  const url = trimmed.substring(separatorIndex + 1).trim();


  if (!name) {
    return null;
  }

  return { name, url };
}

/**
 * Parses a play source string containing multiple episodes
 * @param sourceStr - Source string with episodes separated by #
 * @param sourceName - Name of the play source
 * @returns PlaySource object
 */
function parseSource(sourceStr: string, sourceName: string): PlaySource {
  if (!sourceStr || typeof sourceStr !== 'string') {
    return { name: sourceName, episodes: [] };
  }

  const episodeStrings = sourceStr.split(EPISODE_SEPARATOR);
  const episodes: Episode[] = [];

  for (const episodeStr of episodeStrings) {
    const episode = parseEpisode(episodeStr);
    if (episode) {
      episodes.push(episode);
    }
  }

  return { name: sourceName, episodes };
}

/**
 * Parses the vod_play_url and vod_play_from fields into structured PlaySource array
 * 
 * @param vodPlayUrl - The vod_play_url field from API (format: "ep1$url1#ep2$url2$$ep1$url1#ep2$url2")
 * @param vodPlayFrom - The vod_play_from field from API (format: "source1$$$source2")
 * @returns Array of PlaySource objects
 * 
 * @example
 * parsePlayUrl(
 *   "第01集$http://a.m3u8#第02集$http://b.m3u8$$第01集$http://c.m3u8",
 *   "dytt$$$dyttm3u8"
 * )
 * // Returns:
 * // [
 * //   { name: "dytt", episodes: [{ name: "第01集", url: "http://a.m3u8" }, { name: "第02集", url: "http://b.m3u8" }] },
 * //   { name: "dyttm3u8", episodes: [{ name: "第01集", url: "http://c.m3u8" }] }
 * // ]
 */
export function parsePlayUrl(vodPlayUrl: string, vodPlayFrom: string): PlaySource[] {
  // Handle empty or invalid inputs
  if (!vodPlayUrl || typeof vodPlayUrl !== 'string') {
    return [];
  }

  const trimmedUrl = vodPlayUrl.trim();
  if (!trimmedUrl) {
    return [];
  }

  // Parse source names
  const sourceNames = vodPlayFrom
    ? vodPlayFrom.split(SOURCE_SEPARATOR).map(s => s.trim()).filter(Boolean)
    : [];

  // Split by source separator
  const sourceParts = trimmedUrl.split(SOURCE_SEPARATOR);
  const playSources: PlaySource[] = [];

  for (let i = 0; i < sourceParts.length; i++) {
    const sourcePart = sourceParts[i];
    // Use source name if available, otherwise generate a default name
    const sourceName = sourceNames[i] || `Source ${i + 1}`;
    const playSource = parseSource(sourcePart, sourceName);
    
    // Only add sources that have at least one episode
    if (playSource.episodes.length > 0) {
      playSources.push(playSource);
    }
  }

  return playSources;
}


/**
 * Serializes PlaySource array back to vod_play_url format
 * Used for round-trip testing and data persistence
 * 
 * @param playSources - Array of PlaySource objects
 * @returns Serialized string in vod_play_url format
 */
export function serializePlayUrl(playSources: PlaySource[]): string {
  if (!playSources || !Array.isArray(playSources) || playSources.length === 0) {
    return '';
  }

  return playSources
    .map(source => {
      if (!source.episodes || source.episodes.length === 0) {
        return '';
      }
      return source.episodes
        .map(ep => `${ep.name}${NAME_URL_SEPARATOR}${ep.url}`)
        .join(EPISODE_SEPARATOR);
    })
    .filter(Boolean)
    .join(SOURCE_SEPARATOR);
}

/**
 * Serializes PlaySource array to vod_play_from format
 * 
 * @param playSources - Array of PlaySource objects
 * @returns Serialized string in vod_play_from format
 */
export function serializePlayFrom(playSources: PlaySource[]): string {
  if (!playSources || !Array.isArray(playSources) || playSources.length === 0) {
    return '';
  }

  return playSources
    .filter(source => source.episodes && source.episodes.length > 0)
    .map(source => source.name)
    .join(SOURCE_SEPARATOR);
}

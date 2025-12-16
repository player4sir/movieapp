/**
 * Ad Filter Service
 * 
 * Filters advertisement segments from m3u8 playlists.
 * Can be used as a premium feature for subscribed users.
 */

export interface AdFilterConfig {
  enabled: boolean;
  // Domain blacklist - segments from these domains are considered ads
  domainBlacklist: string[];
  // Keyword blacklist - segments with URLs containing these keywords are ads
  keywordBlacklist: string[];
  // Duration threshold - segments shorter than this (in seconds) at start/end may be ads
  minSegmentDuration: number;
  // Skip first N segments (often pre-roll ads)
  skipFirstSegments: number;
  // Skip segments with discontinuity tags (often ad boundaries)
  filterDiscontinuity: boolean;
  // Filter entire discontinuity sections (segments between discontinuity markers)
  filterDiscontinuitySections: boolean;
  // Maximum duration (seconds) for a discontinuity section to be considered an ad
  maxAdSectionDuration: number;
  // Minimum number of segments in main content (to avoid filtering everything)
  minMainContentSegments: number;
}

// Default configuration
export const DEFAULT_AD_FILTER_CONFIG: AdFilterConfig = {
  enabled: true,
  domainBlacklist: [
    'ad.', 'ads.', 'adserver.', 'advertising.',
    'doubleclick.', 'googlesyndication.',
    'adnxs.', 'adsrvr.', 'adform.',
    'taboola.', 'outbrain.',
  ],
  keywordBlacklist: [
    '/ad/', '/ads/', '/advert/', '/advertising/',
    'preroll', 'midroll', 'postroll',
    'commercial', 'sponsor',
    'guanggao', 'gg_', '_gg',
  ],
  minSegmentDuration: 0,
  skipFirstSegments: 0,
  filterDiscontinuity: false,
  filterDiscontinuitySections: true,
  maxAdSectionDuration: 120, // Sections longer than 2 minutes are likely not ads
  minMainContentSegments: 10, // Keep at least 10 segments as main content
};

export interface M3U8Segment {
  duration: number;
  url: string;
  isDiscontinuity: boolean;
  isAd: boolean;
  originalLine: string;
  sectionIndex: number; // Which discontinuity section this segment belongs to
}

export interface DiscontinuitySection {
  index: number;
  segments: M3U8Segment[];
  totalDuration: number;
  isAd: boolean;
}

export interface FilterResult {
  originalContent: string;
  filteredContent: string;
  totalSegments: number;
  filteredSegments: number;
  adSegments: M3U8Segment[];
  sections: DiscontinuitySection[];
}

/**
 * Parse m3u8 content and identify segments with discontinuity sections
 */
export function parseM3U8(content: string, baseUrl: string): { segments: M3U8Segment[]; sections: DiscontinuitySection[] } {
  const lines = content.split('\n');
  const segments: M3U8Segment[] = [];
  const sections: DiscontinuitySection[] = [];
  let currentDuration = 0;
  let isDiscontinuity = false;
  let currentSectionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Extract duration
      const match = line.match(/#EXTINF:([\d.]+)/);
      if (match) {
        currentDuration = parseFloat(match[1]);
      }
    } else if (line === '#EXT-X-DISCONTINUITY') {
      isDiscontinuity = true;
      currentSectionIndex++;
    } else if (line && !line.startsWith('#')) {
      // This is a segment URL
      const url = line.startsWith('http') ? line : new URL(line, baseUrl).href;

      segments.push({
        duration: currentDuration,
        url,
        isDiscontinuity,
        isAd: false,
        originalLine: line,
        sectionIndex: currentSectionIndex,
      });

      currentDuration = 0;
      isDiscontinuity = false;
    }
  }

  // Group segments into sections
  const sectionMap = new Map<number, M3U8Segment[]>();
  for (const segment of segments) {
    if (!sectionMap.has(segment.sectionIndex)) {
      sectionMap.set(segment.sectionIndex, []);
    }
    sectionMap.get(segment.sectionIndex)!.push(segment);
  }

  // Build section objects
  sectionMap.forEach((sectionSegments, index) => {
    sections.push({
      index,
      segments: sectionSegments,
      totalDuration: sectionSegments.reduce((sum: number, s: M3U8Segment) => sum + s.duration, 0),
      isAd: false,
    });
  });

  // Sort sections by index
  sections.sort((a, b) => a.index - b.index);

  return { segments, sections };
}

/**
 * Check if a segment URL matches ad patterns
 */
export function isAdSegment(segment: M3U8Segment, config: AdFilterConfig): boolean {
  const urlLower = segment.url.toLowerCase();

  // Check domain blacklist
  for (const domain of config.domainBlacklist) {
    if (urlLower.includes(domain.toLowerCase())) {
      return true;
    }
  }

  // Check keyword blacklist
  for (const keyword of config.keywordBlacklist) {
    if (urlLower.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // Check minimum duration (very short segments at boundaries)
  if (config.minSegmentDuration > 0 && segment.duration < config.minSegmentDuration) {
    return true;
  }

  return false;
}

/**
 * Analyze discontinuity sections to identify ad sections
 * 
 * Strategy:
 * 1. Find the longest section - this is likely the main content
 * 2. Sections at the beginning/end that are short are likely pre-roll/post-roll ads
 * 3. Short sections in the middle are likely mid-roll ads
 * 4. Sections with different URL patterns from main content are likely ads
 */
export function analyzeAdSections(
  sections: DiscontinuitySection[],
  config: AdFilterConfig
): DiscontinuitySection[] {
  if (sections.length <= 1) {
    // No discontinuity sections, can't detect ads this way
    return sections;
  }

  // Find the longest section (likely main content)
  let mainContentIndex = 0;
  let maxDuration = 0;

  for (let i = 0; i < sections.length; i++) {
    if (sections[i].totalDuration > maxDuration) {
      maxDuration = sections[i].totalDuration;
      mainContentIndex = i;
    }
  }

  const mainSection = sections[mainContentIndex];

  // Extract URL pattern from main content (domain + path prefix)
  const mainUrlPatterns = extractUrlPatterns(mainSection.segments);

  // Analyze each section
  for (const section of sections) {
    if (section.index === mainSection.index) {
      section.isAd = false;
      continue;
    }

    // Check if section duration is within ad threshold
    if (section.totalDuration > config.maxAdSectionDuration) {
      // Too long to be an ad
      section.isAd = false;
      continue;
    }

    // Check if URL patterns differ from main content
    const sectionPatterns = extractUrlPatterns(section.segments);
    const patternsDiffer = !urlPatternsMatch(mainUrlPatterns, sectionPatterns);

    // Heuristics for ad detection:
    // 1. Short sections at start/end are likely ads
    // 2. Sections with different URL patterns are likely ads
    // 3. Very short sections (< 30s) are likely ads

    const isAtBoundary = section.index === 0 || section.index === sections.length - 1;
    const isShort = section.totalDuration < 30;
    const isMedium = section.totalDuration < 90;

    if (patternsDiffer) {
      // Different URL pattern - very likely an ad
      section.isAd = true;
    } else if (isAtBoundary && isMedium) {
      // At boundary and medium length - likely pre/post-roll
      section.isAd = true;
    } else if (isShort) {
      // Very short section - likely an ad
      section.isAd = true;
    }
  }

  // Safety check: don't filter everything
  const nonAdSegments = sections
    .filter(s => !s.isAd)
    .reduce((sum, s) => sum + s.segments.length, 0);

  if (nonAdSegments < config.minMainContentSegments) {
    // Would filter too much, reset all to non-ad
    console.warn('Ad filter: would remove too many segments, disabling section filtering');
    for (const section of sections) {
      section.isAd = false;
    }
  }

  return sections;
}

/**
 * Extract URL patterns from segments for comparison
 */
function extractUrlPatterns(segments: M3U8Segment[]): Set<string> {
  const patterns = new Set<string>();

  for (const segment of segments) {
    try {
      const url = new URL(segment.url);
      // Use domain + first path segment as pattern
      const pathParts = url.pathname.split('/').filter(Boolean);
      const pattern = url.hostname + (pathParts.length > 0 ? '/' + pathParts[0] : '');
      patterns.add(pattern);
    } catch {
      // Invalid URL, skip
    }
  }

  return patterns;
}

/**
 * Check if two sets of URL patterns have significant overlap
 */
function urlPatternsMatch(patterns1: Set<string>, patterns2: Set<string>): boolean {
  if (patterns1.size === 0 || patterns2.size === 0) {
    return true; // Can't determine, assume match
  }

  // Check if any pattern from set2 exists in set1
  const patterns2Array = Array.from(patterns2);
  for (let i = 0; i < patterns2Array.length; i++) {
    if (patterns1.has(patterns2Array[i])) {
      return true;
    }
  }

  // Also check for partial domain matches
  const domains1 = Array.from(patterns1).map(p => p.split('/')[0]);
  const domains2 = Array.from(patterns2).map(p => p.split('/')[0]);

  for (let i = 0; i < domains2.length; i++) {
    if (domains1.includes(domains2[i])) {
      return true;
    }
  }

  return false;
}

/**
 * Filter ad segments from m3u8 content
 */
export function filterM3U8Ads(
  content: string,
  baseUrl: string,
  config: Partial<AdFilterConfig> = {}
): FilterResult {
  const fullConfig: AdFilterConfig = { ...DEFAULT_AD_FILTER_CONFIG, ...config };

  if (!fullConfig.enabled) {
    return {
      originalContent: content,
      filteredContent: content,
      totalSegments: 0,
      filteredSegments: 0,
      adSegments: [],
      sections: [],
    };
  }

  const { segments, sections } = parseM3U8(content, baseUrl);
  const adSegments: M3U8Segment[] = [];

  // Step 1: Analyze discontinuity sections for ad detection
  if (fullConfig.filterDiscontinuitySections && sections.length > 1) {
    analyzeAdSections(sections, fullConfig);

    // Mark segments in ad sections
    for (const section of sections) {
      if (section.isAd) {
        for (const segment of section.segments) {
          segment.isAd = true;
          adSegments.push(segment);
        }
      }
    }
  }

  // Step 2: Apply additional filters to remaining segments
  segments.forEach((segment, index) => {
    if (segment.isAd) return; // Already marked

    // Skip first N segments if configured
    if (index < fullConfig.skipFirstSegments) {
      segment.isAd = true;
      adSegments.push(segment);
      return;
    }

    // Filter individual discontinuity segments if configured (legacy behavior)
    if (fullConfig.filterDiscontinuity && segment.isDiscontinuity) {
      segment.isAd = true;
      adSegments.push(segment);
      return;
    }

    // Check against ad patterns (URL-based detection)
    if (isAdSegment(segment, fullConfig)) {
      segment.isAd = true;
      adSegments.push(segment);
    }
  });

  // Step 3: Rebuild m3u8 content without ad segments
  const lines = content.split('\n');
  const filteredLines: string[] = [];
  let skipNext = false;
  let skipDiscontinuity = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Look ahead to get the segment URL
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith('#')) {
        const segmentUrl = nextLine.startsWith('http')
          ? nextLine
          : new URL(nextLine, baseUrl).href;

        // Check if this segment is an ad
        const segment = segments.find(s => s.url === segmentUrl);
        if (segment?.isAd) {
          skipNext = true;
          continue;
        }
      }
      filteredLines.push(lines[i]);
    } else if (line && !line.startsWith('#')) {
      // Segment URL
      if (skipNext) {
        skipNext = false;
        continue;
      }
      filteredLines.push(lines[i]);
    } else if (line === '#EXT-X-DISCONTINUITY') {
      // Check if the next segment after this discontinuity is an ad
      // If so, skip this discontinuity tag too
      let nextSegmentUrl = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('#EXTINF:')) {
          const urlLine = lines[j + 1]?.trim();
          if (urlLine && !urlLine.startsWith('#')) {
            nextSegmentUrl = urlLine.startsWith('http')
              ? urlLine
              : new URL(urlLine, baseUrl).href;
            break;
          }
        } else if (nextLine && !nextLine.startsWith('#')) {
          nextSegmentUrl = nextLine.startsWith('http')
            ? nextLine
            : new URL(nextLine, baseUrl).href;
          break;
        }
      }

      const nextSegment = segments.find(s => s.url === nextSegmentUrl);
      if (nextSegment?.isAd) {
        skipDiscontinuity = true;
        continue;
      }

      // Also skip if previous non-ad segment was followed by ad section
      if (!skipDiscontinuity) {
        filteredLines.push(lines[i]);
      }
      skipDiscontinuity = false;
    } else {
      filteredLines.push(lines[i]);
    }
  }

  // Clean up consecutive discontinuity tags
  const cleanedLines = cleanConsecutiveDiscontinuities(filteredLines);

  return {
    originalContent: content,
    filteredContent: cleanedLines.join('\n'),
    totalSegments: segments.length,
    filteredSegments: adSegments.length,
    adSegments,
    sections,
  };
}

/**
 * Remove consecutive discontinuity tags that may result from filtering
 */
function cleanConsecutiveDiscontinuities(lines: string[]): string[] {
  const result: string[] = [];
  let lastWasDiscontinuity = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '#EXT-X-DISCONTINUITY') {
      if (!lastWasDiscontinuity) {
        result.push(line);
        lastWasDiscontinuity = true;
      }
      // Skip consecutive discontinuity tags
    } else {
      result.push(line);
      if (trimmed && !trimmed.startsWith('#')) {
        lastWasDiscontinuity = false;
      }
    }
  }

  // Remove trailing discontinuity tag if present
  while (result.length > 0 && result[result.length - 1].trim() === '#EXT-X-DISCONTINUITY') {
    result.pop();
  }

  // Remove leading discontinuity tag if it's right after header
  const headerEndIndex = result.findIndex(l => l.trim().startsWith('#EXTINF:'));
  if (headerEndIndex > 0) {
    for (let i = headerEndIndex - 1; i >= 0; i--) {
      if (result[i].trim() === '#EXT-X-DISCONTINUITY') {
        result.splice(i, 1);
        break;
      }
    }
  }

  return result;
}

/**
 * Check if user has ad-free privilege
 * Checks both user's membership level and group permissions for adFree flag
 */
export async function hasAdFreePrivilege(userId?: string): Promise<boolean> {
  if (!userId) return false;

  try {
    // Import dynamically to avoid circular dependencies
    const { UserRepository, UserGroupRepository } = await import('@/repositories');
    const { calculateEffectivePermissions, parseGroupPermissions } = await import('@/services/permission.service');

    const userRepository = new UserRepository();
    const groupRepository = new UserGroupRepository();

    const user = await userRepository.findById(userId);
    if (!user) return false;

    // Fetch group permissions if user belongs to a group
    let groupPermissions = null;
    if (user.groupId) {
      const group = await groupRepository.findById(user.groupId);
      if (group) {
        groupPermissions = parseGroupPermissions(group.permissions);
      }
    }

    // Calculate effective permissions
    const effectivePerms = calculateEffectivePermissions(
      { memberLevel: user.memberLevel, memberExpiry: user.memberExpiry },
      groupPermissions
    );

    // Check if ad-free from effective permissions
    if (effectivePerms.adFree) {
      return true;
    }

    // SVIP members are always ad-free (even if not explicitly set)
    if (effectivePerms.memberLevel === 'svip') {
      // Also check expiry for user's own SVIP
      if (groupPermissions?.memberLevel === 'svip') {
        return true; // Group-granted SVIP, always valid
      }
      if (user.memberLevel === 'svip' && user.memberExpiry) {
        return new Date(user.memberExpiry) > new Date();
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to check ad-free privilege:', error);
    return false;
  }
}


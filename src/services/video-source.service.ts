/**
 * Video Source Service
 * CRUD operations for video sources management
 * 
 * Migrated from Prisma to Drizzle ORM via VideoSourceRepository
 */

import { VideoSourceRepository } from '@/repositories';

export type SourceCategory = 'normal' | 'adult';

export interface VideoSourceData {
  name: string;
  category?: SourceCategory;
  apiUrl: string;
  timeout?: number;
  retries?: number;
  enabled?: boolean;
}

export interface TestResult {
  success: boolean;
  responseTime: number | null;
  error: string | null;
  categoriesCount?: number;
}

const sourceRepository = new VideoSourceRepository();

// Get all sources ordered by priority
export async function getAllSources() {
  return sourceRepository.findAll();
}

// Get enabled sources only, ordered by priority
export async function getEnabledSources() {
  return sourceRepository.findEnabled();
}

// Get enabled sources by category, ordered by priority
export async function getEnabledSourcesByCategory(category: SourceCategory) {
  const allEnabled = await sourceRepository.findEnabled();
  console.log(`[SourceService] All enabled sources: ${allEnabled.length}`);
  allEnabled.forEach(s => console.log(`  - ${s.name}: category='${s.category}', enabled=${s.enabled}`));
  const filtered = allEnabled.filter(source => source.category === category);
  console.log(`[SourceService] Filtered for category '${category}': ${filtered.length}`);
  return filtered;
}

// Get source by ID
export async function getSourceById(id: string) {
  return sourceRepository.findById(id);
}

// Create new source
export async function createSource(data: VideoSourceData) {
  // Get max priority to assign next priority
  const allSources = await sourceRepository.findAll();
  const maxPriority = allSources.reduce((max, s) => Math.max(max, s.priority), -1);
  const nextPriority = maxPriority + 1;

  return sourceRepository.create({
    id: crypto.randomUUID(),
    name: data.name,
    category: data.category ?? 'normal',
    apiUrl: data.apiUrl,
    timeout: data.timeout ?? 10000,
    retries: data.retries ?? 3,
    enabled: data.enabled ?? true,
    priority: nextPriority,
  });
}

// Update source
export async function updateSource(id: string, data: Partial<VideoSourceData>) {
  return sourceRepository.update(id, data);
}

// Delete source
export async function deleteSource(id: string) {
  return sourceRepository.delete(id);
}

// Toggle source enabled status
export async function toggleSource(id: string) {
  const source = await sourceRepository.findById(id);
  if (!source) throw new Error('Source not found');
  
  return sourceRepository.update(id, { enabled: !source.enabled });
}

// Reorder sources
export async function reorderSources(sourceIds: string[]) {
  const reorderItems = sourceIds.map((id, index) => ({
    id,
    priority: index,
  }));
  return sourceRepository.reorder(reorderItems);
}

// Test source connection
export async function testSource(id: string): Promise<TestResult> {
  const source = await sourceRepository.findById(id);
  if (!source) throw new Error('Source not found');

  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), source.timeout);
    
    const url = new URL(source.apiUrl);
    url.searchParams.set('ac', 'list');
    url.searchParams.set('pg', '1');
    
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    const categoriesCount = data.class?.length ?? 0;
    
    // Update test result
    await sourceRepository.updateTestResult(id, {
      lastTestAt: new Date(),
      lastTestResult: true,
      lastTestResponseTime: responseTime,
    });
    
    return { success: true, responseTime, error: null, categoriesCount };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const error = err instanceof Error ? err.message : 'Unknown error';
    
    await sourceRepository.updateTestResult(id, {
      lastTestAt: new Date(),
      lastTestResult: false,
      lastTestResponseTime: responseTime,
    });
    
    return { success: false, responseTime, error };
  }
}

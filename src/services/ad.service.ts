/**
 * Ad Service
 * Handles ad CRUD operations, slot management, ad delivery, and tracking.
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3
 */

import {
  AdRepository,
  AdSlotRepository,
  AdSlotAssignmentRepository,
  AdImpressionRepository,
  AdClickRepository,
  CreateAdInput,
  UpdateAdInput,
  AdFilters,
  CreateAdSlotInput,
  UpdateAdSlotInput,
} from '@/repositories';
import { Ad, AdSlot, AdSlotAssignment, MemberLevel, RotationStrategy } from '@/db/schema';

// ============================================
// Error Definitions
// ============================================

export const AD_ERRORS = {
  AD_NOT_FOUND: {
    code: 'AD_NOT_FOUND',
    message: '广告不存在',
  },
  SLOT_NOT_FOUND: {
    code: 'SLOT_NOT_FOUND',
    message: '广告位不存在',
  },
  ASSIGNMENT_EXISTS: {
    code: 'ASSIGNMENT_EXISTS',
    message: '该广告已分配到此广告位',
  },
  ASSIGNMENT_NOT_FOUND: {
    code: 'ASSIGNMENT_NOT_FOUND',
    message: '广告位分配不存在',
  },
  INVALID_DATE_RANGE: {
    code: 'INVALID_DATE_RANGE',
    message: '结束日期必须晚于开始日期',
  },
} as const;

// ============================================
// Types
// ============================================


export interface CreateAdServiceInput {
  title: string;
  imageUrl: string;
  targetUrl: string;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
  targetMemberLevels?: MemberLevel[];
  targetGroupIds?: string[];
  priority?: number;
  slotIds?: string[]; // New: Assign to slots immediately
}

export interface UpdateAdServiceInput {
  title?: string;
  imageUrl?: string;
  targetUrl?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  targetMemberLevels?: MemberLevel[];
  targetGroupIds?: string[];
  priority?: number;
  slotIds?: string[]; // New: Replace slot assignments
}

export interface CreateSlotServiceInput {
  name: string;
  position: string;
  width: number;
  height: number;
  rotationStrategy?: RotationStrategy;
  enabled?: boolean;
}

export interface UpdateSlotServiceInput {
  name?: string;
  position?: string;
  width?: number;
  height?: number;
  rotationStrategy?: RotationStrategy;
  enabled?: boolean;
}

export interface AdDeliveryContext {
  userId?: string;
  memberLevel?: MemberLevel;
  groupId?: string;
}

export interface AdWithSlotInfo extends Ad {
  slotId?: string;
}

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Check if an ad is currently active (within date range and enabled).
 */
export function isAdActive(ad: Ad, currentDate?: Date): boolean {
  const now = currentDate ?? new Date();
  return (
    ad.enabled &&
    !ad.deleted &&
    ad.startDate <= now &&
    ad.endDate >= now
  );
}

/**
 * Check if a user should see ads based on their member level.
 * Only SVIP users should not see ads.
 * Free and VIP users will see ads.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export function shouldShowAds(memberLevel?: MemberLevel): boolean {
  if (!memberLevel) return true; // Anonymous users see ads
  // Only SVIP users don't see ads
  return memberLevel !== 'svip';
}

/**
 * Check if an ad matches the targeting criteria for a user.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export function matchesTargeting(
  ad: Ad,
  memberLevel?: MemberLevel,
  groupId?: string
): boolean {
  const targetLevels = ad.targetMemberLevels as MemberLevel[];
  const targetGroups = ad.targetGroupIds as string[];

  // If no targeting rules, show to all eligible users
  // Requirements: 6.3
  if (targetLevels.length === 0 && targetGroups.length === 0) {
    return true;
  }

  // Check member level targeting
  // Requirements: 6.1
  if (targetLevels.length > 0) {
    if (!memberLevel || !targetLevels.includes(memberLevel)) {
      return false;
    }
  }

  // Check group targeting
  // Requirements: 6.2
  if (targetGroups.length > 0) {
    if (!groupId || !targetGroups.includes(groupId)) {
      return false;
    }
  }

  return true;
}

/**
 * Select an ad from a list based on rotation strategy.
 * 
 * Requirements: 2.4
 */
export function selectAdByRotation(
  ads: Ad[],
  strategy: RotationStrategy,
  sequentialIndex?: number
): Ad | null {
  if (ads.length === 0) return null;

  if (strategy === 'sequential') {
    const index = (sequentialIndex ?? 0) % ads.length;
    return ads[index];
  }

  // Random rotation (default)
  const randomIndex = Math.floor(Math.random() * ads.length);
  return ads[randomIndex];
}

// ============================================
// Repository Instances
// ============================================

const adRepository = new AdRepository();
const adSlotRepository = new AdSlotRepository();
const adSlotAssignmentRepository = new AdSlotAssignmentRepository();
const adImpressionRepository = new AdImpressionRepository();
const adClickRepository = new AdClickRepository();

// ============================================
// Ad CRUD Operations
// Requirements: 1.1, 1.2, 1.3, 1.4
// ============================================

/**
 * Create a new ad.
 * 
 * Requirements: 1.1
 */
export async function createAd(input: CreateAdServiceInput): Promise<Ad> {
  if (input.endDate <= input.startDate) {
    throw { ...AD_ERRORS.INVALID_DATE_RANGE };
  }

  const createInput: CreateAdInput = {
    id: generateId(),
    title: input.title,
    imageUrl: input.imageUrl,
    targetUrl: input.targetUrl,
    startDate: input.startDate,
    endDate: input.endDate,
    enabled: input.enabled,
    targetMemberLevels: input.targetMemberLevels,
    targetGroupIds: input.targetGroupIds,
    priority: input.priority,
  };

  const ad = await adRepository.create(createInput);

  // Handle slot assignments if provided
  if (input.slotIds && input.slotIds.length > 0) {
    for (const slotId of input.slotIds) {
      const slot = await adSlotRepository.findById(slotId);
      if (slot) {
        // Check existence to avoid duplicate error
        const existing = await adSlotAssignmentRepository.findByAdAndSlot(ad.id, slot.id);
        if (!existing) {
          await adSlotAssignmentRepository.assign({
            id: generateId(),
            adId: ad.id,
            slotId: slot.id,
            priority: input.priority, // Match ad priority
          });
        }
      }
    }
  }

  return ad;
}

/**
 * Update an existing ad.
 * 
 * Requirements: 1.2
 */
export async function updateAd(id: string, input: UpdateAdServiceInput): Promise<Ad> {
  const existing = await adRepository.findById(id);
  if (!existing) {
    throw { ...AD_ERRORS.AD_NOT_FOUND };
  }

  // Validate date range if both dates are being updated
  if (input.startDate && input.endDate && input.endDate <= input.startDate) {
    throw { ...AD_ERRORS.INVALID_DATE_RANGE };
  }

  // Validate date range if only one date is being updated
  if (input.startDate && !input.endDate && existing.endDate <= input.startDate) {
    throw { ...AD_ERRORS.INVALID_DATE_RANGE };
  }
  if (input.endDate && !input.startDate && input.endDate <= existing.startDate) {
    throw { ...AD_ERRORS.INVALID_DATE_RANGE };
  }

  const updateInput: UpdateAdInput = {
    title: input.title,
    imageUrl: input.imageUrl,
    targetUrl: input.targetUrl,
    startDate: input.startDate,
    endDate: input.endDate,
    enabled: input.enabled,
    targetMemberLevels: input.targetMemberLevels,
    targetGroupIds: input.targetGroupIds,
    priority: input.priority,
  };

  const updated = await adRepository.update(id, updateInput);
  if (!updated) {
    throw { ...AD_ERRORS.AD_NOT_FOUND };
  }

  // Handle slot assignments if input is provided (even if empty array)
  if (input.slotIds !== undefined) {
    // 1. Get current assignments
    const currentAssignments = await adSlotAssignmentRepository.getByAd(id);
    const textPriority = input.priority ?? existing.priority;

    // 2. Identify slots to add vs remove
    const newSlotIds = new Set(input.slotIds);
    const currentSlotIds = new Set(currentAssignments.map(a => a.slotId));

    // Remove unselected slots
    for (const assignment of currentAssignments) {
      if (!newSlotIds.has(assignment.slotId)) {
        await adSlotAssignmentRepository.remove(id, assignment.slotId);
      }
    }

    // Add new slots
    for (const slotId of input.slotIds) {
      if (!currentSlotIds.has(slotId)) {
        const slot = await adSlotRepository.findById(slotId);
        if (slot) {
          await adSlotAssignmentRepository.assign({
            id: generateId(),
            adId: id,
            slotId: slot.id,
            priority: textPriority,
          });
        }
      }
    }
  }

  return updated;
}

/**
 * Soft delete an ad.
 * 
 * Requirements: 1.3
 */
export async function deleteAd(id: string): Promise<void> {
  const existing = await adRepository.findById(id);
  if (!existing) {
    throw { ...AD_ERRORS.AD_NOT_FOUND };
  }

  await adRepository.softDelete(id);
}

/**
 * Get an ad by ID.
 */
export async function getAd(id: string): Promise<Ad | null> {
  return adRepository.findById(id);
}

/**
 * List all ads with optional filters.
 * 
 * Requirements: 1.4
 */
export async function listAds(filters?: AdFilters): Promise<Ad[]> {
  return adRepository.findAll(filters);
}

// ============================================
// Slot CRUD Operations
// Requirements: 2.1
// ============================================

/**
 * Create a new ad slot.
 * 
 * Requirements: 2.1
 */
export async function createSlot(input: CreateSlotServiceInput): Promise<AdSlot> {
  const createInput: CreateAdSlotInput = {
    id: generateId(),
    name: input.name,
    position: input.position,
    width: input.width,
    height: input.height,
    rotationStrategy: input.rotationStrategy,
    enabled: input.enabled,
  };

  return adSlotRepository.create(createInput);
}

/**
 * Update an existing ad slot.
 * 
 * Requirements: 2.1
 */
export async function updateSlot(id: string, input: UpdateSlotServiceInput): Promise<AdSlot> {
  const existing = await adSlotRepository.findById(id);
  if (!existing) {
    throw { ...AD_ERRORS.SLOT_NOT_FOUND };
  }

  const updateInput: UpdateAdSlotInput = {
    name: input.name,
    position: input.position,
    width: input.width,
    height: input.height,
    rotationStrategy: input.rotationStrategy,
    enabled: input.enabled,
  };

  const updated = await adSlotRepository.update(id, updateInput);
  if (!updated) {
    throw { ...AD_ERRORS.SLOT_NOT_FOUND };
  }

  return updated;
}

/**
 * Delete an ad slot.
 * 
 * Requirements: 2.1
 */
export async function deleteSlot(id: string): Promise<void> {
  const existing = await adSlotRepository.findById(id);
  if (!existing) {
    throw { ...AD_ERRORS.SLOT_NOT_FOUND };
  }

  await adSlotRepository.delete(id);
}

/**
 * Get a slot by ID.
 */
export async function getSlot(id: string): Promise<AdSlot | null> {
  return adSlotRepository.findById(id);
}

/**
 * Get a slot by position.
 */
export async function getSlotByPosition(position: string): Promise<AdSlot | null> {
  return adSlotRepository.findByPosition(position);
}

/**
 * List all ad slots.
 */
export async function listSlots(): Promise<AdSlot[]> {
  return adSlotRepository.findAll();
}

// ============================================
// Slot Assignment Operations
// Requirements: 2.2, 2.3
// ============================================

/**
 * Assign an ad to a slot.
 * 
 * Requirements: 2.2
 */
export async function assignAdToSlot(
  adId: string,
  slotId: string,
  priority?: number
): Promise<AdSlotAssignment> {
  // Verify ad exists
  const ad = await adRepository.findById(adId);
  if (!ad) {
    throw { ...AD_ERRORS.AD_NOT_FOUND };
  }

  // Verify slot exists
  const slot = await adSlotRepository.findById(slotId);
  if (!slot) {
    throw { ...AD_ERRORS.SLOT_NOT_FOUND };
  }

  // Check if assignment already exists
  const existing = await adSlotAssignmentRepository.findByAdAndSlot(adId, slotId);
  if (existing) {
    throw { ...AD_ERRORS.ASSIGNMENT_EXISTS };
  }

  return adSlotAssignmentRepository.assign({
    id: generateId(),
    adId,
    slotId,
    priority,
  });
}

/**
 * Remove an ad from a slot.
 * 
 * Requirements: 2.2
 */
export async function removeAdFromSlot(adId: string, slotId: string): Promise<void> {
  const existing = await adSlotAssignmentRepository.findByAdAndSlot(adId, slotId);
  if (!existing) {
    throw { ...AD_ERRORS.ASSIGNMENT_NOT_FOUND };
  }

  await adSlotAssignmentRepository.remove(adId, slotId);
}

/**
 * Get all ads assigned to a slot.
 * Returns ads ordered by priority (descending).
 * 
 * Requirements: 2.3
 */
export async function getSlotAds(slotId: string): Promise<Ad[]> {
  const assignments = await adSlotAssignmentRepository.getBySlot(slotId);

  const ads: Ad[] = [];
  for (const assignment of assignments) {
    const ad = await adRepository.findById(assignment.adId);
    if (ad) {
      ads.push(ad);
    }
  }

  return ads;
}

/**
 * Get all slots an ad is assigned to.
 */
export async function getAdSlots(adId: string): Promise<AdSlot[]> {
  const assignments = await adSlotAssignmentRepository.getByAd(adId);

  const slots: AdSlot[] = [];
  for (const assignment of assignments) {
    const slot = await adSlotRepository.findById(assignment.slotId);
    if (slot) {
      slots.push(slot);
    }
  }

  return slots;
}

// ============================================
// Ad Delivery
// Requirements: 3.1, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3
// ============================================

/**
 * Get an ad to display for a specific slot position.
 * Handles VIP/SVIP exclusion, targeting, and rotation.
 * 
 * Requirements: 3.1, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3
 */
export async function getAdForSlot(
  slotId: string,
  context?: AdDeliveryContext
): Promise<AdWithSlotInfo | null> {
  // VIP/SVIP users should not see ads
  // Requirements: 4.1, 4.2
  if (context?.memberLevel && !shouldShowAds(context.memberLevel)) {
    return null;
  }

  // Get the slot
  const slot = await adSlotRepository.findById(slotId);
  if (!slot || !slot.enabled) {
    return null;
  }

  // Get all ads assigned to this slot
  const assignments = await adSlotAssignmentRepository.getBySlot(slotId);
  if (assignments.length === 0) {
    return null;
  }

  // Get active ads that match targeting criteria
  const now = new Date();
  const eligibleAds: Ad[] = [];

  for (const assignment of assignments) {
    const ad = await adRepository.findById(assignment.adId);
    if (ad && isAdActive(ad, now)) {
      // Check targeting
      if (matchesTargeting(ad, context?.memberLevel, context?.groupId)) {
        eligibleAds.push(ad);
      }
    }
  }

  if (eligibleAds.length === 0) {
    return null;
  }

  // Select ad based on rotation strategy
  const selectedAd = selectAdByRotation(eligibleAds, slot.rotationStrategy);

  if (!selectedAd) {
    return null;
  }

  return {
    ...selectedAd,
    slotId: slot.id,
  };
}

/**
 * Get an ad for a slot by position name.
 * Convenience method for client-side usage.
 * 
 * Requirements: 3.1
 */
export async function getAdForPosition(
  position: string,
  context?: AdDeliveryContext
): Promise<AdWithSlotInfo | null> {
  const slot = await adSlotRepository.findByPosition(position);
  if (!slot) {
    return null;
  }

  return getAdForSlot(slot.id, context);
}

// ============================================
// Impression and Click Recording
// Requirements: 3.2, 3.3
// ============================================

/**
 * Record an ad impression.
 * 
 * Requirements: 3.2
 */
export async function recordImpression(
  adId: string,
  slotId: string,
  userId?: string
): Promise<void> {
  await adImpressionRepository.create({
    id: generateId(),
    adId,
    slotId,
    userId: userId ?? null,
  });
}

/**
 * Record an ad click.
 * 
 * Requirements: 3.3
 */
export async function recordClick(
  adId: string,
  slotId: string,
  userId?: string
): Promise<void> {
  await adClickRepository.create({
    id: generateId(),
    adId,
    slotId,
    userId: userId ?? null,
  });
}

import { eq } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { paymentQRCodes, PaymentQRCode } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreatePaymentQRCodeInput {
  id: string;
  paymentType: 'wechat' | 'alipay';
  imageUrl: string;
  enabled?: boolean;
}

export interface UpdatePaymentQRCodeInput {
  paymentType?: 'wechat' | 'alipay';
  imageUrl?: string;
  enabled?: boolean;
}

// ============================================
// PaymentQRCodeRepository Implementation
// ============================================

/**
 * Repository for payment QR code database operations.
 * Encapsulates all payment QR code queries using Drizzle ORM.
 * 
 * Requirements: 2.1, 7.2, 7.4
 */
export class PaymentQRCodeRepository extends BaseRepository {
  /**
   * Find all payment QR codes.
   */
  async findAll(): Promise<PaymentQRCode[]> {
    try {
      return await this.db.query.paymentQRCodes.findMany();
    } catch (error) {
      throw new RepositoryError('Failed to find all payment QR codes', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all enabled payment QR codes.
   */
  async findEnabled(): Promise<PaymentQRCode[]> {
    try {
      return await this.db.query.paymentQRCodes.findMany({
        where: eq(paymentQRCodes.enabled, true),
      });
    } catch (error) {
      throw new RepositoryError('Failed to find enabled payment QR codes', 'FIND_ERROR', error);
    }
  }

  /**
   * Find a payment QR code by ID.
   */
  async findById(id: string): Promise<PaymentQRCode | null> {
    try {
      const result = await this.db.query.paymentQRCodes.findFirst({
        where: eq(paymentQRCodes.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find payment QR code by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new payment QR code.
   */
  async create(input: CreatePaymentQRCodeInput): Promise<PaymentQRCode> {
    try {
      const [qrcode] = await this.db.insert(paymentQRCodes).values({
        id: input.id,
        paymentType: input.paymentType,
        imageUrl: input.imageUrl,
        enabled: input.enabled ?? true,
        updatedAt: new Date(),
      }).returning();
      return qrcode;
    } catch (error) {
      throw new RepositoryError('Failed to create payment QR code', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing payment QR code.
   * Returns null if QR code not found.
   */
  async update(id: string, input: UpdatePaymentQRCodeInput): Promise<PaymentQRCode | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.paymentType !== undefined) updateData.paymentType = input.paymentType;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;

      const [qrcode] = await this.db.update(paymentQRCodes)
        .set(updateData)
        .where(eq(paymentQRCodes.id, id))
        .returning();
      return qrcode ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update payment QR code', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete a payment QR code by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(paymentQRCodes).where(eq(paymentQRCodes.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete payment QR code', 'DELETE_ERROR', error);
    }
  }
}

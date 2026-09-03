import mongoose, { Schema, Document } from 'mongoose';

export interface IRequestSequence extends Document {
  year: number;
  currentSequence: number;
}

const RequestSequenceSchema = new Schema<IRequestSequence>({
  year: { type: Number, required: true, unique: true, index: true },
  currentSequence: { type: Number, required: true, default: 0 },
});

export const RequestSequenceModel = mongoose.model<IRequestSequence>(
  'RequestSequence',
  RequestSequenceSchema,
);

export class RequestNumberService {
  /**
   * Generates sequential, atomic request number: REQ-YYYY-XXXXX (e.g., REQ-2026-00001)
   */
  async generateRequestNumber(session?: mongoose.ClientSession | null): Promise<string> {
    const currentYear = new Date().getFullYear();

    const seqDoc = await RequestSequenceModel.findOneAndUpdate(
      { year: currentYear },
      { $inc: { currentSequence: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session: session || undefined,
      },
    );

    const paddedSeq = String(seqDoc.currentSequence).padStart(5, '0');
    return `REQ-${currentYear}-${paddedSeq}`;
  }
}

export const requestNumberService = new RequestNumberService();
